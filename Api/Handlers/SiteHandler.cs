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
/// 導覽、轉址、設定、sitemap。Phase 7 中**不依賴 SMTP** 的那一半
/// （`POST /contact` 與收件匣要等寄信設定，見 CLAUDE.md §7）。
/// </summary>
public sealed class SiteHandler(AppDbContext db, ISiteReadService reader, Services.PageSchemaRegistry registry)
{
    // ── 公開 ───────────────────────────────────────────────────────────────

    /// <summary>GET /menus?locale=&amp;menu=header|footer —— 不帶 menu 時兩組都回。</summary>
    public async Task<IActionResult> GetMenusAsync(HttpRequest req)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var which  = ProductHandler.Nullable(req.Query["menu"]);

        if (which is not null && !MenuNames.All.Contains(which))
            throw AppException.BadRequest($"未知的 menu：{which}（header / footer）。");

        var wanted = which is null ? MenuNames.All.ToArray() : [which];

        var result = new Dictionary<string, IReadOnlyList<MenuNodeDto>>();
        foreach (var name in wanted)
            result[name.ToLowerInvariant()] = await reader.GetMenuAsync(name, locale);

        return new OkObjectResult(ApiResponse.Ok(result));
    }

    /// <summary>GET /settings?locale=</summary>
    public async Task<IActionResult> GetSettingsAsync(HttpRequest req)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        return new OkObjectResult(ApiResponse.Ok(await reader.GetSettingsAsync(locale)));
    }

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

    // ── 後台：選單 ─────────────────────────────────────────────────────────

    public async Task<IActionResult> AdminGetMenusAsync()
    {
        var rows = await db.MenuItems
            .Include(m => m.Translations)
            .OrderBy(m => m.Menu).ThenBy(m => m.SortOrder)
            .ToListAsync();

        return new OkObjectResult(ApiResponse.Ok(rows.Select(ToDto).ToArray()));
    }

    /// <summary>
    /// PUT /admin/menus —— **整棵樹一次送**（docs/04 §6）。
    ///
    /// <para>
    /// 逐項 CRUD 在樹狀結構上很難用：搬移一個節點是「改 parent + 改兩邊排序」，
    /// 拆成多次請求會在中途留下順序錯亂的狀態。整批取代則是一次交易。
    /// </para>
    /// </summary>
    public async Task<IActionResult> AdminReplaceMenusAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<ReplaceMenusRequest>(req);

        if (!MenuNames.All.Contains(body.Menu))
            throw AppException.BadRequest($"未知的 menu：{body.Menu}（header / footer）。");

        Validate(body.Items, depth: 1);

        var strategy = db.Database.CreateExecutionStrategy();

        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync();

            // 先刪子節點再刪父節點 —— ParentId 是 Restrict（自參照無法 cascade）
            var existing = await db.MenuItems.Where(m => m.Menu == body.Menu).ToListAsync();
            db.MenuItems.RemoveRange(existing.Where(m => m.ParentId is not null));
            await db.SaveChangesAsync();
            db.MenuItems.RemoveRange(existing.Where(m => m.ParentId is null));
            await db.SaveChangesAsync();

            Insert(body.Items, body.Menu, null);
            await db.SaveChangesAsync();

            await tx.CommitAsync();
        });

        return new OkObjectResult(ApiResponse.Ok($"{body.Menu} 選單已更新。"));

        void Insert(MenuNodeInput[] items, string menu, Guid? parentId)
        {
            for (var i = 0; i < items.Length; i++)
            {
                var node = new MenuItem
                {
                    Menu      = menu,
                    Url       = items[i].Url.Trim(),
                    ParentId  = parentId,
                    SortOrder = i,
                };

                foreach (var (rawLocale, label) in items[i].Labels ?? [])
                    node.Translations.Add(new MenuItemTranslation
                    {
                        Locale = AdminWrite.ValidLocale(rawLocale),
                        Label  = label.Trim(),
                    });

                db.MenuItems.Add(node);
                if (items[i].Children is { Length: > 0 } kids) Insert(kids, menu, node.Id);
            }
        }
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

    // ── 後台：設定 ─────────────────────────────────────────────────────────

    public async Task<IActionResult> AdminGetSettingsAsync()
    {
        var rows = await db.Settings.Include(s => s.Translations).OrderBy(s => s.Key).ToListAsync();

        return new OkObjectResult(ApiResponse.Ok(rows.Select(s => new AdminSettingDto(
            s.Key,
            JsonField.Parse(s.ValueJson),
            s.Translations.OrderBy(t => t.Locale)
                          .ToDictionary(t => t.Locale, t => JsonField.Parse(t.ValueJson)),
            s.UpdatedAt)).ToArray()));
    }

    /// <summary>PUT /admin/settings —— 整批 upsert，未帶到的鍵維持原狀。</summary>
    public async Task<IActionResult> AdminUpdateSettingsAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpdateSettingsRequest>(req);
        if (body.Items is null || body.Items.Count == 0)
            throw AppException.BadRequest("items 為必填。");

        var now  = Clock.Now;
        var keys = body.Items.Keys.ToArray();

        var existing = await db.Settings.Include(s => s.Translations)
                                        .Where(s => keys.Contains(s.Key))
                                        .ToDictionaryAsync(s => s.Key);

        foreach (var (key, input) in body.Items)
        {
            if (string.IsNullOrWhiteSpace(key) || key.Length > 120)
                throw AppException.BadRequest($"設定鍵不合法：'{key}'。");

            if (!existing.TryGetValue(key, out var setting))
            {
                setting = new Setting { Key = key };
                db.Settings.Add(setting);
                existing[key] = setting;
            }

            if (input.Value is not null)
            {
                setting.ValueJson = input.Value.ToJsonString();
                setting.UpdatedAt = now;
            }

            foreach (var (rawLocale, value) in input.Translations ?? [])
            {
                var locale = AdminWrite.ValidLocale(rawLocale);
                var tr = setting.Translations.FirstOrDefault(t => t.Locale == locale);

                if (tr is null)
                {
                    tr = new SettingTranslation { Key = key, Locale = locale };
                    setting.Translations.Add(tr);
                }

                tr.ValueJson = value?.ToJsonString() ?? "null";
                tr.UpdatedAt = now;
            }
        }

        await db.SaveChangesAsync();
        return new OkObjectResult(ApiResponse.Ok($"已更新 {body.Items.Count} 項設定。"));
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    /// <summary>導覽最多兩層（docs/09 的 header 版型）。更深的樹版型渲染不出來。</summary>
    private static void Validate(MenuNodeInput[] items, int depth)
    {
        if (depth > 2) throw AppException.BadRequest("導覽最多兩層。");

        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.Url))
                throw AppException.BadRequest("每個導覽項目都必須有 url。");
            if (item.Labels is null || item.Labels.Count == 0)
                throw AppException.BadRequest($"'{item.Url}' 至少要有一個語系的標籤。");

            if (item.Children is { Length: > 0 } kids) Validate(kids, depth + 1);
        }
    }

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

    private static AdminMenuItemDto ToDto(MenuItem m) => new(
        m.Id, m.Menu, m.ParentId, m.Url, m.SortOrder,
        m.Translations.OrderBy(t => t.Locale).ToDictionary(t => t.Locale, t => t.Label));

    private static AdminRedirectDto ToDto(Redirect r) =>
        new(r.Id, r.FromPath, r.ToPath, r.StatusCode, r.CreatedAt);
}

// ── 請求／回應 ─────────────────────────────────────────────────────────────

public sealed record MenuNodeInput(
    string                      Url,
    Dictionary<string, string>? Labels   = null,
    MenuNodeInput[]?            Children = null);

public sealed record ReplaceMenusRequest(string Menu, MenuNodeInput[] Items);

public sealed record AdminMenuItemDto(
    Guid                       Id,
    string                     Menu,
    Guid?                      ParentId,
    string                     Url,
    int                        SortOrder,
    Dictionary<string, string> Labels);

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

public sealed record SettingInput(
    JsonNode?                      Value        = null,
    Dictionary<string, JsonNode?>? Translations = null);

public sealed record UpdateSettingsRequest(Dictionary<string, SettingInput>? Items = null);

public sealed record AdminSettingDto(
    string                          Key,
    JsonNode?                       Value,
    Dictionary<string, JsonNode?>   Translations,
    DateTime                        UpdatedAt);
