using System.Text.Json;
using System.Text.Json.Nodes;
using EuniceMed.Api.Common;
using EuniceMed.Api.Data;
using EuniceMed.Api.Models.Entities;
using EuniceMed.Api.Services;
using Json.Schema;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EuniceMed.Api.Handlers;

/// <summary>
/// 頁面區段。docs/04-api.md §4／§6、docs/09-page-blocks.md。
///
/// <para>
/// **不提供 POST / DELETE sections** —— 區段集合由 schema registry 與
/// <see cref="Data.Seed.PageSectionSynchronizer"/> 決定（docs/09 §0.1）。
/// </para>
/// </summary>
public sealed class PageHandler(
    AppDbContext        db,
    PageSchemaRegistry  registry,
    MediaUsageWriter    mediaUsage,
    HtmlSanitizers      sanitizers,
    Microsoft.Extensions.Configuration.IConfiguration cfg)
{
    /// <summary>
    /// GET /pages/{key}?locale= —— 公開端點。
    ///
    /// <para>回應規則（docs/04 §4）：</para>
    /// <list type="bullet">
    /// <item><c>sections</c> 是**物件**（key = sectionKey）不是陣列 —— 順序由前端模板決定。</item>
    /// <item><c>_enabled: false</c> 的區段**仍然回傳**，供後台預覽；模板自行略過。</item>
    /// <item>缺該語系翻譯的區段**整段省略**（語言純度，docs/08 §5.2）。</item>
    /// <item>media 解析為絕對網址 + variants；<c>ref:Entity</c> 保留識別字串，實體放 <c>refs</c>。</item>
    /// </list>
    /// </summary>
    public async Task<IActionResult> GetPublicAsync(HttpRequest req, string key)
    {
        var locale = Locales.Normalize(req.Query["locale"]);

        var page = await db.Set<Page>()
            .Include(p => p.Sections).ThenInclude(s => s.Translations)
            .FirstOrDefaultAsync(p => p.Key == key);

        if (page is null || page.Status != ContentStatus.Published)
            return new NotFoundObjectResult(ApiResponse.Fail("Page not found.", $"No page '{key}'."));

        var sections = new JsonObject();
        var allRefs = new List<EntityRef>();

        foreach (var section in page.Sections.OrderBy(s => s.SortOrder))
        {
            if (!registry.TryGet(key, section.SectionKey, out var schema)) continue;

            var tr = section.Translations.FirstOrDefault(t => t.Locale == locale);
            if (tr is null) continue;   // 語言純度：缺翻譯就整段不回

            var data = JsonNode.Parse(tr.DataJson) as JsonObject ?? [];

            // 先剪掉 schema 已經沒有的欄位，再判斷有沒有內容 —— 否則一個只剩
            // 舊欄位的區段會走 IsRenderable 的 `data.Count > 0` 那條 fallback
            // 被誤判成「有內容」，然後把已經搬回程式碼的文案又渲染一次。
            SectionWalker.PruneUnknown(schema.Raw, data);

            // 列存在不等於有內容。跨語系同步會為尚未翻譯的語系補建只含
            // 圖片／連結的列（見 SyncInvariant），那種列不該公開渲染。
            // 用 schema 的 required 當判準 —— 不需要額外狀態，也不會與 schema 脫節。
            if (!IsRenderable(schema, data)) continue;

            allRefs.AddRange(SectionWalker.FindRefs(schema.Raw, data));
            await ResolveMediaAsync(schema.Raw, data);

            data["_enabled"] = section.IsEnabled;
            sections[section.SectionKey] = data;
        }

        var refs = await ResolveRefsAsync(allRefs, locale);

        return new OkObjectResult(ApiResponse.Ok(new
        {
            key = page.Key,
            sections,
            refs,
        }));
    }

    /// <summary>GET /admin/pages —— 18 頁清單。</summary>
    public async Task<IActionResult> AdminListAsync()
    {
        var pages = await db.Set<Page>()
            .Include(p => p.Sections)
            .OrderBy(p => p.Kind).ThenBy(p => p.Key)
            .ToListAsync();

        return new OkObjectResult(ApiResponse.Ok(pages.Select(p => new
        {
            key = p.Key,
            kind = p.Kind == PageKind.Singleton ? "singleton" : "template",
            sectionCount = p.Sections.Count(s => s.IsEnabled),
            p.UpdatedAt,
        }).ToArray()));
    }

    /// <summary>GET /admin/page-schema/{key} —— 該頁全部區段的 schema，後台據此生成表單。</summary>
    public IActionResult GetSchemaAsync(string key)
    {
        var schemas = registry.ForPage(key).ToArray();
        if (schemas.Length == 0)
            return new NotFoundObjectResult(ApiResponse.Fail(
                "Page schema not found.", $"沒有 '{key}' 的區段 schema。"));

        var presets = MediaPresetCatalog.Instance.Value;

        var result = new JsonObject();
        foreach (var s in schemas)
        {
            // x-mediaPreset 於此展開成尺寸與提示，**schema 檔本身不手寫尺寸數字**
            // （docs/09 §9.1）—— 尺寸只有 media-presets.json 一份真相。
            var raw = s.Raw.DeepClone();
            ExpandMediaPresets(raw, presets);
            result[s.SectionKey] = raw;
        }

        return new OkObjectResult(ApiResponse.Ok(new { key, sections = result }));
    }

    /// <summary>
    /// GET /admin/pages/{key} —— 全區段 × 全語系（後台編輯用，media 回原始 mediaId）。
    ///
    /// <para>
    /// **schema 檔已消失的區段不回傳。** 同步器只把它們停用不硬刪（內容留著，
    /// 版面改回來時還在），但後台的表單是由 schema 生成的 —— 回傳一個沒有 schema 的
    /// 區段只會讓編輯者看到一個「找不到 schema」的死分頁。公開端點同樣以
    /// <see cref="PageSchemaRegistry.TryGet"/> 過濾，兩邊一致。
    /// </para>
    /// </summary>
    public async Task<IActionResult> AdminGetAsync(string key)
    {
        var page = await db.Set<Page>()
            .Include(p => p.Sections).ThenInclude(s => s.Translations)
            .FirstOrDefaultAsync(p => p.Key == key)
            ?? throw AppException.NotFound("Page");

        var sections = page.Sections
            .Select(s => (Section: s, Schema: registry.TryGet(key, s.SectionKey, out var sc) ? sc : null))
            .Where(x => x.Schema is not null)
            .OrderBy(x => x.Section.SortOrder).Select(x => new
        {
            sectionKey = x.Section.SectionKey,
            isEnabled  = x.Section.IsEnabled,
            rowVersion = x.Section.RowVer is null ? null : Convert.ToBase64String(x.Section.RowVer),
            x.Section.UpdatedAt,
            translations = x.Section.Translations.ToDictionary(
                t => t.Locale,
                t => PruneForForm(x.Schema!, t.DataJson)),
        }).ToArray();

        return new OkObjectResult(ApiResponse.Ok(new { key = page.Key, sections }));
    }

    /// <summary>
    /// PUT /admin/pages/{key}/sections/{sectionKey}
    /// body: <c>{ locale, data, syncInvariantFields }</c>
    ///
    /// <para>
    /// 驗證失敗回 400，<c>errors</c> 每一項以 **JSON Pointer** 開頭定位欄位
    /// （docs/04 §3.2）。這是 <c>JsonSchema.Net</c> 選型的主因 ——
    /// 它的 <c>EvaluationResults.InstanceLocation</c> 本身就是 JSON Pointer，不需要轉換層。
    /// </para>
    /// </summary>
    public async Task<IActionResult> AdminUpsertSectionAsync(HttpRequest req, string key, string sectionKey)
    {
        if (!registry.TryGet(key, sectionKey, out var schema))
            throw AppException.NotFound($"Section '{key}.{sectionKey}'");

        var body = await req.ReadFromJsonAsync<UpsertSectionRequest>();
        if (body is null || body.Data is null)
            return new BadRequestObjectResult(ApiResponse.Fail("data 為必填。"));

        var locale = Locales.Normalize(body.Locale);
        if (!Locales.Supported.Contains(locale))
            throw AppException.BadRequest($"不支援的語系：{body.Locale}");

        var data = JsonNode.Parse(body.Data.Value.GetRawText()) as JsonObject
            ?? throw AppException.BadRequest("data 必須是物件。");

        // ── 淨化 richtext ─────────────────────────────────────────────────
        //
        // **在驗證之前做**：淨化會改變內容長度（移除標籤），若先驗證後淨化，
        // 通過 maxLength 的內容可能在淨化後才變成別的東西，而那份沒被驗過。
        //
        // 後台的 TipTap 不是安全邊界 —— 任何人都能直接打這個端點。
        var profile = key == "privacy" ? RichTextProfile.Legal : RichTextProfile.Section;
        SectionWalker.SanitizeRichText(schema.Raw, data, html => sanitizers.Sanitize(html, profile));

        // ── Schema 驗證 ────────────────────────────────────────────────────
        var results = schema.Schema.Evaluate(
            System.Text.Json.JsonSerializer.SerializeToElement(data),
            new EvaluationOptions { OutputFormat = OutputFormat.List });

        if (!results.IsValid)
        {
            var errors = Flatten(results).ToArray();
            return new BadRequestObjectResult(
                ApiResponse.Fail("區段內容未通過 schema 驗證。", errors));
        }

        // ── 媒體 preset 比對 ───────────────────────────────────────────────
        //
        // schema 的 `x-mediaPreset` 一直有宣告版位要哪個尺寸，但沒有人比對過 ——
        // 結果 square 的圖存得進 16:9 的欄位，前台裁切後編輯者只覺得「圖怪怪的」。
        // JSON Schema 表達不了這條（要查 DB），所以在這裡擋。
        var presetErrors = await ValidateMediaPresetsAsync(schema.Raw, data);
        if (presetErrors.Length > 0)
            return new BadRequestObjectResult(
                ApiResponse.Fail("圖片尺寸規格與版位不符。", presetErrors));

        var section = await db.Set<PageSection>()
            .Include(s => s.Translations)
            .Include(s => s.Page)
            .FirstOrDefaultAsync(s => s.Page!.Key == key && s.SectionKey == sectionKey)
            ?? throw AppException.NotFound($"Section '{key}.{sectionKey}'");

        var tr = section.Translations.FirstOrDefault(t => t.Locale == locale);
        if (tr is null)
        {
            tr = new PageSectionTranslation { PageSectionId = section.Id, Locale = locale };
            section.Translations.Add(tr);
        }
        tr.DataJson = data.ToJsonString();

        // ── 跨語系同步（docs/09 §9.3）────────────────────────────────────
        if (body.SyncInvariantFields)
            SyncInvariant(schema, section, locale, data);

        section.UpdatedAt = Clock.Now;

        await db.SaveChangesAsync();

        // MediaUsage 必須在存檔後重建 —— 這是**唯一**能追到藏在 DataJson 裡的
        // mediaId 的途徑（沒有 FK 可用）。
        await mediaUsage.RebuildForSectionAsync(section, registry);

        return new OkObjectResult(ApiResponse.Ok("區段已更新。"));
    }

    /// <summary>
    /// <c>SectionWalker</c> 的內部路徑格式是 <c>slides[0].image</c>，
    /// 但 schema 驗證的錯誤走 JSON Pointer（<c>/slides/0/image</c>）。
    /// 同一個 <c>errors</c> 陣列裡混兩種格式，後台就得寫兩套解析器 ——
    /// 所以在**輸出邊界**轉換，而不去動內部格式（那個格式也是 MediaUsage.FieldPath
    /// 的儲存值，改了要動既有資料）。
    /// </summary>
    private static string ToJsonPointer(string fieldPath) =>
        "/" + fieldPath.Replace("[", ".").Replace("]", "").Replace('.', '/');

    /// <summary>
    /// 逐個媒體欄位比對實際 <c>Media.PresetKey</c> 與 schema 的 <c>x-mediaPreset</c>。
    /// 錯誤訊息照 schema 驗證的慣例以 JSON Pointer 開頭，後台才對得上欄位。
    /// </summary>
    private async Task<string[]> ValidateMediaPresetsAsync(JsonNode schemaRaw, JsonObject data)
    {
        var refs = SectionWalker.FindMediaPresets(schemaRaw, data);
        if (refs.Count == 0) return [];

        var ids = refs.Select(r => r.MediaId).Distinct().ToArray();
        var actual = await db.Set<Media>()
            .Where(m => ids.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => m.PresetKey);

        var errors = new List<string>();
        foreach (var r in refs)
        {
            // 圖不存在交給既有的 FK/媒體檢查處理，這裡只管尺寸規格
            if (!actual.TryGetValue(r.MediaId, out var preset)) continue;

            if (!string.Equals(preset, r.ExpectedPreset, StringComparison.Ordinal))
                errors.Add($"{ToJsonPointer(r.FieldPath)}: 此版位需要 '{r.ExpectedPreset}' 尺寸的圖，目前選的是 '{preset}'。");
        }

        return [.. errors];
    }

    /// <summary>
    /// DELETE /admin/pages/{key}/sections/{sectionKey}?locale= —— 刪掉一個語系的內容。
    ///
    /// <para>
    /// 沒有這一支的話，某個語系的區段內容**只能新增不能移除** ——
    /// schema 驗證要求必填欄位，所以連「存成空的」都做不到。
    /// 編輯者填錯語系、或想表達「這一段不出中文版」時只剩改資料庫一途。
    /// （與 `AdminProductHandler` 的翻譯刪除是同一個問題，見 docs/13 的踩坑。）
    /// </para>
    ///
    /// <para>
    /// 刪光所有語系是允許的 —— 區段本身仍在（由 schema 目錄決定），
    /// 只是前台不再渲染它。這與產品不同：產品刪光語系會變成一列無法辨認的空白，
    /// 區段則永遠可以從區段清單找回來。
    /// </para>
    /// </summary>
    public async Task<IActionResult> AdminDeleteSectionLocaleAsync(HttpRequest req, string key, string sectionKey)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        if (!Locales.Supported.Contains(locale))
            throw AppException.BadRequest($"不支援的語系：{req.Query["locale"]}");

        var section = await db.Set<PageSection>()
            .Include(s => s.Translations)
            .Include(s => s.Page)
            .FirstOrDefaultAsync(s => s.Page!.Key == key && s.SectionKey == sectionKey)
            ?? throw AppException.NotFound($"Section '{key}.{sectionKey}'");

        if (section.Translations.FirstOrDefault(t => t.Locale == locale) is not { } tr)
            return new OkObjectResult(ApiResponse.Ok($"區段 '{sectionKey}' 本來就沒有 {locale} 的內容。"));

        section.Translations.Remove(tr);
        section.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();

        // 引用可能整段消失，MediaUsage 要跟著重建 —— 否則那些圖會永遠刪不掉
        await mediaUsage.RebuildForSectionAsync(section, registry);

        return new OkObjectResult(ApiResponse.Ok($"已移除區段 '{sectionKey}' 的 {locale} 內容。"));
    }

    /// <summary>PATCH /admin/pages/{key}/sections/{sectionKey}/enabled</summary>
    public async Task<IActionResult> AdminToggleAsync(HttpRequest req, string key, string sectionKey)
    {
        var body = await req.ReadFromJsonAsync<ToggleRequest>();
        if (body is null) return new BadRequestObjectResult(ApiResponse.Fail("Invalid request body."));

        var section = await db.Set<PageSection>()
            .Include(s => s.Page)
            .FirstOrDefaultAsync(s => s.Page!.Key == key && s.SectionKey == sectionKey)
            ?? throw AppException.NotFound($"Section '{key}.{sectionKey}'");

        section.IsEnabled = body.IsEnabled;
        section.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(
            body.IsEnabled ? "區段已啟用。" : "區段已停用。"));
    }

    /// <summary>POST /admin/maintenance/sync-page-sections</summary>
    public async Task<IActionResult> SyncSectionsAsync(HttpRequest req)
    {
        RequireMaintenanceKey(req);
        var report = await Data.Seed.PageSectionSynchronizer.RunAsync(db, registry);

        return new OkObjectResult(ApiResponse.Ok(report,
            $"同步完成：新增 {report.Added.Length}、停用 {report.Disabled.Length}、" +
            $"重新啟用 {report.Reenabled.Length}、未變更 {report.Unchanged}。"));
    }

    /// <summary>
    /// 該語系的內容是否足以公開渲染：schema 宣告的 required 欄位都要有非空值。
    ///
    /// <para>
    /// 刻意只檢查 required 而非跑完整驗證 —— 這是每個公開請求都會走的路徑，
    /// 而本站無 CDN、純 SSR，每次請求都真的會執行到這裡。
    /// </para>
    /// </summary>
    /// <summary>
    /// 這個區段在該語系是否真的渲染得出來。
    ///
    /// <para>
    /// 列存在不等於有內容 —— 跨語系同步會為尚未翻譯的語系補建只含圖片／連結的列。
    /// 判準是 schema 的 <c>required</c>：不需要額外狀態，也不會與 schema 脫節。
    /// </para>
    ///
    /// <para>
    /// **sitemap 也用這個**（<see cref="SiteHandler"/>）—— 兩邊各寫一套判準的話，
    /// sitemap 會宣告一堆點進去是空白的網址。
    /// </para>
    /// </summary>
    /// <summary>
    /// 後台表單載入前先剪掉 schema 已經沒有的欄位。
    ///
    /// <para>
    /// <c>SchemaForm</c> 是 <c>onChange({ ...value, [name]: v })</c> —— <c>value</c> 就是這裡回去的
    /// 東西。不剪的話，一支 schema 收斂之後，編輯者改任何一格都會把看不見的舊欄位
    /// 原封送回，撞上 <c>additionalProperties:false</c> 變成 400，而錯誤指向畫面上
    /// 根本不存在的欄位。剪過之後儲存還會順手把 DB 那一列洗乾淨。
    /// </para>
    /// </summary>
    private static JsonNode? PruneForForm(SectionSchema schema, string dataJson)
    {
        var node = JsonNode.Parse(dataJson);
        SectionWalker.PruneUnknown(schema.Raw, node);
        return node;
    }

    internal static bool IsRenderable(SectionSchema schema, JsonObject data)
    {
        if (schema.Raw["required"] is not JsonArray required) return data.Count > 0;

        foreach (var node in required)
        {
            var name = node?.GetValue<string>();
            if (name is null) continue;

            var value = data[name];
            var empty = value switch
            {
                null              => true,
                JsonArray a       => a.Count == 0,
                JsonValue v       => v.TryGetValue<string>(out var s) && string.IsNullOrWhiteSpace(s),
                _                 => false,
            };
            if (empty) return false;
        }

        return true;
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    /// <summary>
    /// 維護端點除了 Admin 角色，另需 <c>X-Maintenance-Key</c>。
    /// 這樣 CI 不需要使用者帳號就能呼叫，而單靠一枚外洩的 Admin JWT 也動不了。
    /// </summary>
    private void RequireMaintenanceKey(HttpRequest req)
    {
        var expected = cfg["Maintenance:Key"];
        if (string.IsNullOrEmpty(expected)) return;   // 未設定則不強制（本機）

        if (req.Headers["X-Maintenance-Key"].FirstOrDefault() != expected)
            throw AppException.Forbidden("缺少或錯誤的 X-Maintenance-Key。");
    }

    /// <summary>把驗證結果攤平成「JSON Pointer: 訊息」的字串陣列。</summary>
    private static IEnumerable<string> Flatten(EvaluationResults results)
    {
        foreach (var r in (results.Details ?? []).Where(d => !d.IsValid))
        {
            if (r.Errors is not null)
                foreach (var (kw, msg) in r.Errors)
                    yield return $"{r.InstanceLocation}: {kw} — {msg}";

            foreach (var nested in Flatten(r)) yield return nested;
        }
    }

    private async Task ResolveMediaAsync(JsonNode schemaRaw, JsonObject data)
    {
        var refs = SectionWalker.FindMedia(schemaRaw, data);
        if (refs.Count == 0) return;

        var ids = refs.Select(r => r.MediaId).Distinct().ToArray();

        var media = await db.Media.Where(m => ids.Contains(m.Id))
            .Select(m => new { m.Id, m.BlobUrl, m.AltText }).ToDictionaryAsync(m => m.Id);

        var variants = await db.Set<MediaVariant>().Where(v => ids.Contains(v.MediaId))
            .GroupBy(v => v.MediaId)
            .ToDictionaryAsync(g => g.Key, g => g.OrderBy(v => v.Width).ToArray());

        SectionWalker.ResolveMedia(schemaRaw, data, id =>
        {
            if (!media.TryGetValue(id, out var m)) return null;

            var node = new JsonObject
            {
                ["url"] = m.BlobUrl,
                ["alt"] = m.AltText,
            };

            if (variants.TryGetValue(id, out var vs))
            {
                var arr = new JsonArray();
                foreach (var v in vs)
                    arr.Add(new JsonObject
                    {
                        ["format"] = v.Format, ["width"] = v.Width, ["url"] = v.BlobUrl,
                    });
                node["variants"] = arr;
            }

            return node;
        });
    }

    /// <summary>把 <c>ref:Entity</c> 解析成精簡 DTO，放進 <c>refs</c> 讓前端免二次往返。</summary>
    private async Task<JsonObject> ResolveRefsAsync(List<EntityRef> refs, string locale)
    {
        var result = new JsonObject
        {
            ["certifications"] = new JsonObject(),
            ["products"] = new JsonObject(),
            ["articles"] = new JsonObject(),
            ["downloads"] = new JsonObject(),
        };

        var certSlugs = refs.Where(r => r.EntityType == "Certification")
                            .Select(r => r.Identifier).Distinct().ToArray();

        if (certSlugs.Length > 0)
        {
            var certs = await db.Set<Certification>()
                .Where(c => certSlugs.Contains(c.Slug))
                .Select(c => new
                {
                    c.Slug, c.Mark,
                    Tr = c.Translations.FirstOrDefault(t => t.Locale == locale),
                    LogoUrl = db.Media.Where(m => m.Id == c.LogoMediaId).Select(m => m.BlobUrl).FirstOrDefault(),
                })
                .ToListAsync();

            var bucket = (JsonObject)result["certifications"]!;
            foreach (var c in certs)
                bucket[c.Slug] = new JsonObject
                {
                    ["mark"]        = c.Mark,
                    ["subLabel"]    = c.Tr?.SubLabel,
                    ["description"] = c.Tr?.Description,
                    ["logo"]        = c.LogoUrl,
                };
        }

        // ── 文章 ───────────────────────────────────────────────────────────
        //
        // 以 slug 識別。**未翻譯的文章不會出現在 refs 裡** —— 語言純度，
        // 呼叫端（模板）拿不到就略過那一格，而不是顯示他語標題。
        var articleSlugs = refs.Where(r => r.EntityType == "Article")
                               .Select(r => r.Identifier).Distinct().ToArray();

        if (articleSlugs.Length > 0)
        {
            var articles = await db.Set<Article>()
                .Where(a => articleSlugs.Contains(a.Slug) && a.Status == ContentStatus.Published)
                // 排程發布：時間未到的一律不解析（與公開列表同一條件）
                .Where(a => a.PublishedAt == null || a.PublishedAt <= Clock.Now)
                .Select(a => new
                {
                    a.Slug, a.Type, a.PublishedAt,
                    Tr = a.Translations.FirstOrDefault(t => t.Locale == locale),
                    CoverUrl = db.Media.Where(m => m.Id == a.CoverMediaId).Select(m => m.BlobUrl).FirstOrDefault(),
                })
                .ToListAsync();

            var bucket = (JsonObject)result["articles"]!;
            foreach (var a in articles.Where(a => a.Tr is not null))
                bucket[a.Slug] = new JsonObject
                {
                    ["title"]       = a.Tr!.Title,
                    ["excerpt"]     = a.Tr.Excerpt,
                    ["kind"]        = a.Type == ArticleType.News ? "news" : "insight",
                    ["publishedAt"] = a.PublishedAt?.ToString("o"),
                    ["cover"]       = a.CoverUrl,
                    ["url"]         = $"/{locale}/{(a.Type == ArticleType.News ? "news" : "insights")}/{a.Slug}",
                };
        }

        // ── 下載 ───────────────────────────────────────────────────────────
        //
        // Download **沒有 slug**（它不是一個頁面），所以識別字串是 Id。
        var downloadIds = refs.Where(r => r.EntityType == "Download")
                              .Select(r => r.Identifier).Distinct()
                              .Select(id => Guid.TryParse(id, out var g) ? g : Guid.Empty)
                              .Where(g => g != Guid.Empty).ToArray();

        if (downloadIds.Length > 0)
        {
            var downloads = await db.Set<Download>()
                .Where(d => downloadIds.Contains(d.Id) && d.Status == ContentStatus.Published)
                .Select(d => new
                {
                    d.Id, d.Type, d.FileLocale,
                    Tr = d.Translations.FirstOrDefault(t => t.Locale == locale),
                    File = db.Media.Where(m => m.Id == d.MediaId)
                                   .Select(m => new { m.BlobUrl, m.FileName, m.SizeBytes }).FirstOrDefault(),
                })
                .ToListAsync();

            var bucket = (JsonObject)result["downloads"]!;
            foreach (var d in downloads.Where(d => d.Tr is not null))
                bucket[d.Id.ToString()] = new JsonObject
                {
                    ["title"]       = d.Tr!.Title,
                    ["description"] = d.Tr.Description,
                    ["type"]        = d.Type switch
                    {
                        DownloadType.Manual      => "manual",
                        DownloadType.Certificate => "certificate",
                        _                        => "catalog",
                    },
                    ["fileLocale"] = d.FileLocale.ToUpperInvariant(),
                    ["fileExt"]    = Path.GetExtension(d.File?.FileName ?? "").TrimStart('.').ToUpperInvariant(),
                    ["sizeBytes"]  = d.File?.SizeBytes ?? 0,
                    ["url"]        = d.File?.BlobUrl,
                };
        }

        return result;
    }

    /// <summary>
    /// 把標了 <c>x-localeInvariant</c> 的欄位複製到其他語系（docs/09 §9.3）。
    /// 文字欄位不同步；repeatable 以**索引**對應，以本次儲存的長度為準。
    /// </summary>
    private static void SyncInvariant(
        SectionSchema schema, PageSection section, string sourceLocale, JsonObject sourceData)
    {
        var paths = SectionWalker.FindLocaleInvariantPaths(schema.Raw, sourceData);
        if (paths.Count == 0) return;

        // 補建尚不存在的語系列。
        //
        // 這是這個功能的重點：編輯者填完英文、勾「同步至其他語系」之後，
        // 切到中文分頁時圖片與連結就該已經在那裡了。只推給「已存在的列」等於
        // 第一次編輯永遠同步不到，那正是本功能要消除的成本（docs/05 §3.7 rule 1）。
        //
        // 副作用由公開端點的 IsRenderable 處理：只含 invariant 欄位、尚未填文字的
        // 區段不會通過 schema 的 required，因此不會半空地渲染出去。
        foreach (var locale in Locales.Supported)
        {
            if (locale == sourceLocale) continue;
            if (section.Translations.Any(t => t.Locale == locale)) continue;

            section.Translations.Add(new PageSectionTranslation
            {
                PageSectionId = section.Id, Locale = locale, DataJson = "{}",
            });
        }

        foreach (var other in section.Translations.Where(t => t.Locale != sourceLocale))
        {
            var target = JsonNode.Parse(other.DataJson) as JsonObject ?? [];
            var changed = false;

            foreach (var path in paths)
            {
                var value = ReadPath(sourceData, path);
                if (value is null) continue;
                if (WritePath(target, path, value.DeepClone())) changed = true;
            }

            if (changed) other.DataJson = target.ToJsonString();
        }
    }

    private static JsonNode? ReadPath(JsonNode? root, string path)
    {
        foreach (var seg in path.Split('.'))
        {
            if (root is null) return null;
            root = root is JsonObject o ? o[seg] : null;
        }
        return root;
    }

    private static bool WritePath(JsonObject root, string path, JsonNode value)
    {
        var segs = path.Split('.');
        JsonObject? cur = root;

        for (var i = 0; i < segs.Length - 1; i++)
        {
            if (cur![segs[i]] is not JsonObject next)
            {
                next = [];
                cur[segs[i]] = next;
            }
            cur = next;
        }

        cur![segs[^1]] = value;
        return true;
    }

    /// <summary>依 <c>x-mediaPreset</c> 展開尺寸與提示，供後台顯示。</summary>
    private static void ExpandMediaPresets(JsonNode? node, MediaPresetCatalog presets)
    {
        if (node is JsonObject o)
        {
            if (o["x-mediaPreset"]?.GetValue<string>() is { } key && presets.TryGet(key, out var p))
            {
                o["x-recommendedWidth"]  = p.Width;
                o["x-recommendedHeight"] = p.Height;
                o["x-aspect"]            = p.Aspect;
                o["x-maxBytes"]          = p.MaxBytes;
                o["x-hint"] = new JsonObject
                {
                    ["en"] = p.Hint("en"), ["zh-TW"] = p.Hint("zh-TW"),
                };
            }

            foreach (var (_, child) in o) ExpandMediaPresets(child, presets);
        }
        else if (node is JsonArray a)
        {
            foreach (var child in a) ExpandMediaPresets(child, presets);
        }
    }

    private sealed record UpsertSectionRequest(string Locale, JsonElement? Data, bool SyncInvariantFields = true);
    private sealed record ToggleRequest(bool IsEnabled);
}
