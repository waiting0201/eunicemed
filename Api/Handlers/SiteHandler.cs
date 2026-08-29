using System.Text.Json.Nodes;
using EuniceMed.Api.Common;
using EuniceMed.Api.Data;
using EuniceMed.Api.Models.Dtos;
using EuniceMed.Api.Models.Entities;
using EuniceMed.Api.Services.Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EuniceMed.Api.Handlers;

/// <summary>
/// 轉址與 sitemap。
///
/// <para>
/// 導覽與站台設定**不在這裡** —— 兩者都寫在前端程式碼（docs/15-cms-scope.md）：
/// 導覽等同網站結構，設定那張表從頭到尾是空的，站上跑的一直是前端常數。
/// </para>
/// </summary>
public sealed class SiteHandler(AppDbContext db, ISiteReadService reader, Services.PageSchemaRegistry registry)
{
    // ── 公開 ───────────────────────────────────────────────────────────────

    /// <summary>
    /// GET /sitemap —— **無 locale 參數**：一次回全部語系的可索引 URL，
    /// 前端據此產生單一份 sitemap.xml（docs/06 §3）。
    /// </summary>
    public async Task<IActionResult> GetSitemapAsync()
    {
        var entries = new List<SitemapEntryDto>(await StaticPageEntriesAsync());
        entries.AddRange(await reader.GetSitemapAsync());

        return new OkObjectResult(ApiResponse.Ok(entries));
    }

    /// <summary>
    /// 靜態頁（由 `Page` / `PageSection` 驅動的那些）。
    ///
    /// <para>
    /// **刻意不放在 Dapper 讀取層**：某個語系「有沒有內容」的判準是
    /// <see cref="PageHandler.IsRenderable"/>（看 schema 的 required），
    /// 而那需要 schema registry。用 SQL 判「翻譯列存在」會過度回報 ——
    /// 跨語系同步會為尚未翻譯的語系補建只含圖片的列，那種頁面點進去是空白的
    /// （見 docs/13 的踩坑「列存在不等於可公開渲染」）。
    /// </para>
    /// </summary>
    private async Task<List<SitemapEntryDto>> StaticPageEntriesAsync()
    {
        var pages = await db.Set<Page>()
            .Include(p => p.Sections).ThenInclude(s => s.Translations)
            .Where(p => p.Status == ContentStatus.Published)
            .ToListAsync();

        var entries = new List<SitemapEntryDto>();

        foreach (var page in pages)
        {
            if (!StaticPaths.TryGetValue(page.Key, out var meta)) continue;

            var locales = new List<string>();
            foreach (var locale in Locales.Supported)
            {
                var renderable = page.Sections.Any(section =>
                    section.IsEnabled
                    && registry.TryGet(page.Key, section.SectionKey, out var schema)
                    && section.Translations.FirstOrDefault(t => t.Locale == locale) is { } tr
                    && JsonNode.Parse(tr.DataJson) is JsonObject data
                    && PageHandler.IsRenderable(schema, data));

                // 純動態頁（products / news / insights…）沒有任何區段也照樣有內容，
                // 所以「這一頁完全沒有區段」與「這一頁的區段都沒翻譯」要分開看。
                if (renderable || page.Sections.Count == 0) locales.Add(locale);
            }

            if (locales.Count == 0) continue;

            var lastMod = page.Sections.Count == 0
                ? Clock.Today
                : page.Sections.Max(s => s.UpdatedAt);

            entries.Add(new SitemapEntryDto(meta.Path, lastMod, meta.ChangeFreq, meta.Priority, [.. locales]));
        }

        return entries;
    }

    /// <summary>
    /// 靜態頁的路徑與權重（docs/06 §3）。**不含 contact** —— 它還沒上線。
    /// 對不到的 pageKey（模板共用文案那幾個 page）自動略過。
    /// </summary>
    private static readonly Dictionary<string, (string Path, string ChangeFreq, double Priority)> StaticPaths =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["home"]         = ("", "daily", 1.0),
            ["products"]     = ("/products", "weekly", 0.9),
            ["applications"] = ("/applications", "weekly", 0.9),
            ["about"]        = ("/about", "monthly", 0.6),
            ["partnership"]  = ("/partnership", "monthly", 0.7),
            ["resources"]    = ("/resources", "monthly", 0.6),
            ["faq"]          = ("/faq", "monthly", 0.6),
            ["downloads"]    = ("/downloads", "monthly", 0.6),
            ["news"]         = ("/news", "weekly", 0.7),
            ["insights"]     = ("/insights", "weekly", 0.7),
            ["where-to-buy"] = ("/where-to-buy", "monthly", 0.7),
            ["privacy"]      = ("/privacy", "yearly", 0.4),
        };

    /// <summary>
    /// GET /redirects —— 供前端 middleware 載入。
    /// 公開端點：它本來就會反映在 301 回應上，藏起來沒有意義。
    /// </summary>
    public async Task<IActionResult> GetRedirectsAsync()
    {
        var rows = await db.Redirects
            .OrderBy(r => r.FromPath)
            .Select(r => new { from = r.FromPath, to = r.ToPath, status = r.StatusCode })
            .ToListAsync();

        return new OkObjectResult(ApiResponse.Ok(rows));
    }

    // ── 後台：轉址 ─────────────────────────────────────────────────────────

    public async Task<IActionResult> AdminGetRedirectsAsync(HttpRequest req)
    {
        var q = db.Redirects.AsQueryable();

        if (ProductHandler.Nullable(req.Query["search"]) is { } search)
        {
            var like = $"%{search}%";
            q = q.Where(r => EF.Functions.Like(r.FromPath, like) || EF.Functions.Like(r.ToPath, like));
        }

        var rows = await q.OrderBy(r => r.FromPath).ToListAsync();
        return new OkObjectResult(ApiResponse.Ok(rows.Select(ToDto).ToArray()));
    }

    public async Task<IActionResult> AdminCreateRedirectAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpsertRedirectRequest>(req);
        var from = NormalizePath(body.FromPath, nameof(body.FromPath));
        var to   = NormalizePath(body.ToPath, nameof(body.ToPath));

        EnsureNotLoop(from, to);

        if (await db.Redirects.AnyAsync(r => r.FromPath == from))
            throw AppException.Conflict($"已有從 '{from}' 出發的轉址規則。");

        var entity = new Redirect
        {
            FromPath   = from,
            ToPath     = to,
            StatusCode = ValidStatus(body.StatusCode),
            CreatedAt  = Clock.Now,
        };

        db.Redirects.Add(entity);
        await db.SaveChangesAsync();

        return new ObjectResult(ApiResponse.Ok(ToDto(entity), "轉址規則已建立。")) { StatusCode = 201 };
    }

    public async Task<IActionResult> AdminUpdateRedirectAsync(HttpRequest req, string id)
    {
        var guid   = AdminWrite.ParseId(id, "redirect");
        var body   = await AdminWrite.ReadAsync<UpsertRedirectRequest>(req);
        var entity = await db.Redirects.FirstOrDefaultAsync(r => r.Id == guid)
            ?? throw AppException.NotFound("Redirect");

        if (body.FromPath is not null)
        {
            var from = NormalizePath(body.FromPath, nameof(body.FromPath));
            if (from != entity.FromPath && await db.Redirects.AnyAsync(r => r.FromPath == from))
                throw AppException.Conflict($"已有從 '{from}' 出發的轉址規則。");
            entity.FromPath = from;
        }

        if (body.ToPath is not null) entity.ToPath = NormalizePath(body.ToPath, nameof(body.ToPath));
        if (body.StatusCode is not null) entity.StatusCode = ValidStatus(body.StatusCode);

        EnsureNotLoop(entity.FromPath, entity.ToPath);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(ToDto(entity), "轉址規則已更新。"));
    }

    public async Task<IActionResult> AdminDeleteRedirectAsync(string id)
    {
        var guid   = AdminWrite.ParseId(id, "redirect");
        var entity = await db.Redirects.FirstOrDefaultAsync(r => r.Id == guid)
            ?? throw AppException.NotFound("Redirect");

        db.Redirects.Remove(entity);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok("轉址規則已刪除。"));
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    /// <summary>
    /// 轉址路徑一律以 `/` 開頭、去掉尾斜線。
    /// 不正規化的話 `/old` 與 `/old/` 會被當成兩條規則，而 middleware 只會命中其中一條。
    /// </summary>
    private static string NormalizePath(string? raw, string field)
    {
        if (string.IsNullOrWhiteSpace(raw)) throw AppException.BadRequest($"{field} 為必填。");

        var path = raw.Trim();
        if (!path.StartsWith('/')) path = "/" + path;
        if (path.Length > 1) path = path.TrimEnd('/');

        return path;
    }

    /// <summary>自我轉址會讓瀏覽器進入無限迴圈。</summary>
    private static void EnsureNotLoop(string from, string to)
    {
        if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase))
            throw AppException.BadRequest("來源與目標相同，會造成無限轉址。");
    }

    private static short ValidStatus(short? code) => code switch
    {
        null or 301 => 301,
        302 or 307 or 308 => code.Value,
        _ => throw AppException.BadRequest("statusCode 只接受 301 / 302 / 307 / 308。"),
    };

    private static AdminRedirectDto ToDto(Redirect r) =>
        new(r.Id, r.FromPath, r.ToPath, r.StatusCode, r.CreatedAt);
}

// ── 請求／回應 ─────────────────────────────────────────────────────────────

public sealed record UpsertRedirectRequest(
    string? FromPath   = null,
    string? ToPath     = null,
    short?  StatusCode = null);

public sealed record AdminRedirectDto(
    Guid     Id,
    string   FromPath,
    string   ToPath,
    short    StatusCode,
    DateTime CreatedAt);
