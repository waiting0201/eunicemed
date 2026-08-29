using EuniceMed.Api.Common;
using EuniceMed.Api.Data;
using EuniceMed.Api.Models.Dtos;
using EuniceMed.Api.Models.Entities;
using EuniceMed.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EuniceMed.Api.Handlers;

/// <summary>
/// 後台文章（News / Insights）、文章分類、活動面板、圖庫。公開端點在 <see cref="ArticleHandler"/>。
///
/// <para>
/// 形狀照 <see cref="AdminProductHandler"/>。這裡多出一條 FK 表達不了的約束：
/// <b><c>ArticleCategory.Kind</c> 必須等於文章的 <c>Type</c></b>
/// （需要複合 FK 才做得到，所以由應用層驗證）。不擋的話 insight 可以掛到 news 分類下，
/// 而公開列表兩邊都是照 Type 撈的，那篇文章會在側欄計數裡出現、點進分類卻找不到。
/// </para>
/// </summary>
public sealed class AdminArticleHandler(
    AppDbContext     db,
    MediaUsageWriter mediaUsage,
    RedirectWriter   redirects,
    HtmlSanitizers   sanitizers)
{
    // ── 文章分類 ───────────────────────────────────────────────────────────

    /// <summary>GET /admin/article-categories?kind=news|insight</summary>
    public async Task<IActionResult> GetCategoriesAsync(HttpRequest req)
    {
        var q = db.ArticleCategories.Include(c => c.Translations).AsQueryable();

        if (ProductHandler.Nullable(req.Query["kind"]) is { } rawKind)
        {
            var kind = ParseKind(rawKind);
            q = q.Where(c => c.Kind == kind);
        }

        var rows   = await q.OrderBy(c => c.Kind).ThenBy(c => c.SortOrder).ToListAsync();
        var counts = await db.Articles.Where(a => a.CategoryId != null)
                                      .GroupBy(a => a.CategoryId!.Value)
                                      .Select(g => new { g.Key, Count = g.Count() })
                                      .ToDictionaryAsync(x => x.Key, x => x.Count);

        return new OkObjectResult(ApiResponse.Ok(
            rows.Select(c => ToDto(c, counts.GetValueOrDefault(c.Id))).ToArray()));
    }

    public async Task<IActionResult> GetCategoryAsync(string id)
    {
        var entity = await LoadCategoryAsync(AdminWrite.ParseId(id, "article category"));
        return new OkObjectResult(ApiResponse.Ok(await WithCountAsync(entity)));
    }

    public async Task<IActionResult> CreateCategoryAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpsertArticleCategoryRequest>(req);

        if (body.Kind is not { } kind || (kind != ArticleType.News && kind != ArticleType.Insight))
            throw AppException.BadRequest("kind 為必填，且必須是 1（news）或 2（insight）。");
        if (string.IsNullOrWhiteSpace(body.Slug))
            throw AppException.BadRequest("slug 為必填。");
        if (body.Translations is null || body.Translations.Count == 0)
            throw AppException.BadRequest("至少要有一個語系的翻譯。");

        var slug = Slugify.Make(body.Slug.Trim());
        await EnsureCategorySlugFreeAsync(kind, slug, null);

        var now = Clock.Now;
        var entity = new ArticleCategory
        {
            Kind      = kind,
            Slug      = slug,
            SortOrder = body.SortOrder ?? 0,
            Status    = body.Status ?? ContentStatus.Published,
            CreatedAt = now,
            UpdatedAt = now,
        };
        ApplyCategoryTranslations(entity, body.Translations);

        db.ArticleCategories.Add(entity);
        await db.SaveChangesAsync();

        return new ObjectResult(ApiResponse.Ok(ToDto(entity, 0), "文章分類已建立。")) { StatusCode = 201 };
    }

    public async Task<IActionResult> UpdateCategoryAsync(HttpRequest req, string id)
    {
        var body   = await AdminWrite.ReadAsync<UpsertArticleCategoryRequest>(req);
        var entity = await LoadCategoryAsync(AdminWrite.ParseId(id, "article category"));

        // Kind 換掉會讓底下的文章與新 Kind 不符（Kind 必須等於 Article.Type）。
        // 有文章時直接擋，沒文章時才允許改。
        if (body.Kind is { } kind && kind != entity.Kind)
        {
            var articles = await db.Articles.CountAsync(a => a.CategoryId == entity.Id);
            if (articles > 0)
                throw AppException.Conflict($"此分類底下仍有 {articles} 篇文章，換 kind 會讓它們與分類不符。請先搬移文章。");

            await EnsureCategorySlugFreeAsync(kind, entity.Slug, entity.Id);
            entity.Kind = kind;
        }

        if (!string.IsNullOrWhiteSpace(body.Slug))
        {
            var slug = Slugify.Make(body.Slug.Trim());
            if (slug != entity.Slug) await EnsureCategorySlugFreeAsync(entity.Kind, slug, entity.Id);
            entity.Slug = slug;
        }

        if (body.SortOrder is { } sortOrder) entity.SortOrder = sortOrder;
        if (body.Status    is { } status)    entity.Status    = status;

        ApplyCategoryTranslations(entity, body.Translations);
        AdminWrite.EnsureAnyTranslation(entity.Translations);
        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(await WithCountAsync(entity), "文章分類已更新。"));
    }

    /// <summary>DELETE /admin/article-categories/{id} —— 硬刪除（此表無 IsDeleted）。</summary>
    public async Task<IActionResult> DeleteCategoryAsync(string id)
    {
        var guid   = AdminWrite.ParseId(id, "article category");
        var entity = await db.ArticleCategories.FirstOrDefaultAsync(c => c.Id == guid)
            ?? throw AppException.NotFound("ArticleCategory");

        var articles = await db.Articles.CountAsync(a => a.CategoryId == guid);
        if (articles > 0)
            throw AppException.Conflict($"分類仍被 {articles} 篇文章引用，請先改掉引用再刪除。");

        db.ArticleCategories.Remove(entity);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok($"文章分類 '{entity.Slug}' 已刪除。"));
    }

    // ── 文章 ───────────────────────────────────────────────────────────────

    /// <summary>GET /admin/articles?type=&amp;status=&amp;category=&amp;search=&amp;page=&amp;pageSize=</summary>
    public async Task<IActionResult> GetListAsync(HttpRequest req)
    {
        var q = db.Articles.Include(a => a.Category).AsQueryable();

        if (ProductHandler.Nullable(req.Query["type"]) is { } rawType)
        {
            var type = ParseKind(rawType);
            q = q.Where(a => a.Type == type);
        }

        if (ProductHandler.Nullable(req.Query["status"]) is { } rawStatus)
        {
            var status = AdminWrite.ParseStatus(rawStatus);
            q = q.Where(a => a.Status == status);
        }

        if (ProductHandler.Nullable(req.Query["category"]) is { } category)
            q = q.Where(a => a.Category!.Slug == category);

        if (ProductHandler.Nullable(req.Query["search"]) is { } search)
        {
            var like = $"%{search}%";
            q = q.Where(a => a.Translations.Any(t => EF.Functions.Like(t.Title, like)));
        }

        var (page, pageSize) = ProductHandler.Paging(req);
        var total = await q.CountAsync();

        // 未發布的排在最前面（PublishedAt 為 null）—— 後台清單的用途是「還有什麼要處理」，
        // 照發布時間倒序會把草稿埋在最後一頁。
        var rows = await q
            .OrderByDescending(a => a.PublishedAt == null)
            .ThenByDescending(a => a.PublishedAt)
            .ThenByDescending(a => a.UpdatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new AdminArticleListItemDto(
                a.Id, a.Slug, a.Type, a.Category!.Slug,
                a.Translations.Where(t => t.Locale == Locales.En).Select(t => t.Title).FirstOrDefault(),
                a.Translations.Where(t => t.Locale == Locales.ZhTw).Select(t => t.Title).FirstOrDefault(),
                a.Status, a.IsFeatured, a.PublishedAt, a.UpdatedAt))
            .ToListAsync();

        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        return new OkObjectResult(ApiResponse.Ok(
            new PagedResult<AdminArticleListItemDto>(rows, total, page, pageSize, totalPages)));
    }

    public async Task<IActionResult> GetByIdAsync(string id)
    {
        var entity = await LoadFullAsync(AdminWrite.ParseId(id, "article"));
        return new OkObjectResult(ApiResponse.Ok(await ToDtoAsync(entity)));
    }

    public async Task<IActionResult> CreateAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpsertArticleRequest>(req);

        if (string.IsNullOrWhiteSpace(body.Slug))
            throw AppException.BadRequest("slug 為必填。");
        if (body.Type is not { } type || (type != ArticleType.News && type != ArticleType.Insight))
            throw AppException.BadRequest("type 為必填，且必須是 1（news）或 2（insight）。");
        if (body.Translations is null || body.Translations.Count == 0)
            throw AppException.BadRequest("至少要有一個語系的翻譯。");

        var slug = Slugify.Make(body.Slug.Trim());
        if (await db.Articles.AnyAsync(a => a.Slug == slug))
            throw AppException.Conflict($"Slug '{slug}' 已被使用。");

        await ValidateCategoryAsync(type, body.CategoryId);

        var now = Clock.Now;
        var entity = new Article
        {
            Slug         = slug,
            Type         = type,
            CategoryId   = body.CategoryId,
            CoverMediaId = body.CoverMediaId,
            ReadMinutes  = body.ReadMinutes,
            IsFeatured   = body.IsFeatured ?? false,
            PublishedAt  = NormalizePublishedAt(body.PublishedAt),
            Status       = ContentStatus.Draft,
            CreatedAt    = now,
            UpdatedAt    = now,
        };

        ApplyTranslations(entity, body.Translations);
        if (body.TagIds is { } tags) await ApplyTagsAsync(entity, tags);
        await AdminWrite.EnsureMediaExistsAsync(db, entity.CoverMediaId);

        db.Articles.Add(entity);
        await db.SaveChangesAsync();
        await RebuildUsageAsync(entity);

        return new ObjectResult(ApiResponse.Ok(await ToDtoAsync(entity), "文章已建立（草稿）。")) { StatusCode = 201 };
    }

    public async Task<IActionResult> UpdateAsync(HttpRequest req, string id)
    {
        var body   = await AdminWrite.ReadAsync<UpsertArticleRequest>(req);
        var entity = await LoadFullAsync(AdminWrite.ParseId(id, "article"));

        AdminWrite.ApplyRowVersion(db.Entry(entity).Property(a => a.RowVer), body.RowVersion);

        // 文章網址是 /{news|insights}/{slug} —— type 與 slug 都會改到它
        var before = (entity.Type, entity.Slug);

        if (!string.IsNullOrWhiteSpace(body.Slug))
        {
            var slug = Slugify.Make(body.Slug.Trim());
            if (slug != entity.Slug && await db.Articles.AnyAsync(a => a.Slug == slug))
                throw AppException.Conflict($"Slug '{slug}' 已被使用。");
            entity.Slug = slug;
        }

        var type       = body.Type ?? entity.Type;
        var categoryId = body.ClearCategory ? null : body.CategoryId ?? entity.CategoryId;
        await ValidateCategoryAsync(type, categoryId);

        // Type 換掉會讓公開網址從 /news/{slug} 變成 /insights/{slug}。
        // 以前這在已發布的文章上是擋下來的（轉址得人工補），現在 RedirectWriter
        // 會自動把舊網址接過去，所以不需要再擋。
        entity.Type       = type;
        entity.CategoryId = categoryId;

        if (body.ClearCover)                          entity.CoverMediaId = null;
        else if (body.CoverMediaId is { } cover)      entity.CoverMediaId = cover;

        if (body.ReadMinutes is { } minutes) entity.ReadMinutes = minutes;
        if (body.IsFeatured  is { } featured) entity.IsFeatured = featured;
        if (body.PublishedAt is not null)     entity.PublishedAt = NormalizePublishedAt(body.PublishedAt);

        ApplyTranslations(entity, body.Translations);
        AdminWrite.EnsureAnyTranslation(entity.Translations);
        if (body.TagIds is { } tags) await ApplyTagsAsync(entity, tags);
        await AdminWrite.EnsureMediaExistsAsync(db, entity.CoverMediaId);

        entity.UpdatedAt = Clock.Now;
        var after = (entity.Type, entity.Slug);
        if (after != before) await redirects.ArticlePathChangedAsync(before, after);

        await db.SaveChangesAsync();
        await RebuildUsageAsync(entity);

        return new OkObjectResult(ApiResponse.Ok(await ToDtoAsync(entity), "文章已更新。"));
    }

    /// <summary>DELETE /admin/articles/{id} —— 軟刪除，連帶清 MediaUsage。</summary>
    public async Task<IActionResult> DeleteAsync(string id)
    {
        var guid   = AdminWrite.ParseId(id, "article");
        var entity = await db.Articles.FirstOrDefaultAsync(a => a.Id == guid)
            ?? throw AppException.NotFound("Article");

        entity.IsDeleted = true;
        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();

        await mediaUsage.RebuildAsync(nameof(Article), guid, []);

        return new OkObjectResult(ApiResponse.Ok($"文章 '{entity.Slug}' 已刪除。"));
    }

    /// <summary>
    /// POST /admin/articles/{id}/publish
    ///
    /// <para>
    /// ⚠️ <c>PublishedAt</c> 為未來時間時是**排程發布**：公開端點查不到，但狀態就是 Published
    /// （docs/13 Phase 6）。因此這裡不能像產品那樣無條件 <c>??= now</c> ——
    /// 已排程的文章按下發布會被改成立刻上線，等於把排程默默取消掉。
    /// </para>
    /// </summary>
    public async Task<IActionResult> PublishAsync(string id)
    {
        var entity = await LoadFullAsync(AdminWrite.ParseId(id, "article"));

        if (entity.Translations.Count == 0)
            throw AppException.BadRequest("沒有任何語系翻譯，無法發布。");

        entity.Status      = ContentStatus.Published;
        entity.PublishedAt ??= Clock.Now;
        entity.UpdatedAt   = Clock.Now;
        // 刻意用 ??= 而非直接指派：PublishedAt 已是未來時間時那是**排程發布**，
        // 覆寫成 now 等於把編輯者排好的時間默默取消掉。
        await db.SaveChangesAsync();

        var scheduled = entity.PublishedAt > Clock.Now;
        return new OkObjectResult(ApiResponse.Ok(await ToDtoAsync(entity),
            scheduled
                ? $"文章已排程於 {entity.PublishedAt:yyyy-MM-dd HH:mm} UTC 發布，在那之前前台查不到。"
                : "文章已發布。"));
    }

    public async Task<IActionResult> UnpublishAsync(string id)
    {
        var entity = await LoadFullAsync(AdminWrite.ParseId(id, "article"));

        entity.Status    = ContentStatus.Draft;
        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(await ToDtoAsync(entity), "文章已取消發布。"));
    }

    // ── 活動面板（NewsEvent）──────────────────────────────────────────────

    public async Task<IActionResult> GetEventAsync(string id)
    {
        var guid = AdminWrite.ParseId(id, "article");
        var ev   = await LoadEventAsync(guid);

        return ev is null
            ? new NotFoundObjectResult(ApiResponse.Fail("NewsEvent not found.", $"文章 {guid} 沒有活動資訊。"))
            : new OkObjectResult(ApiResponse.Ok(ToDto(ev)));
    }

    /// <summary>PUT /admin/articles/{id}/event —— 沒有就建、有就改（共用主鍵的 1:1）。</summary>
    public async Task<IActionResult> UpsertEventAsync(HttpRequest req, string id)
    {
        var guid = AdminWrite.ParseId(id, "article");
        var body = await AdminWrite.ReadAsync<UpsertNewsEventRequest>(req);

        var article = await db.Articles.FirstOrDefaultAsync(a => a.Id == guid)
            ?? throw AppException.NotFound("Article");

        // 活動面板是 News 專屬的版位（docs/09）。掛到 insight 上前台永遠不會渲染，
        // 是那種存得下去但看不見的錯誤，所以在這裡擋。
        if (article.Type != ArticleType.News)
            throw AppException.BadRequest("活動資訊只適用於 News（type=1）。");

        if (body.StartDate is { } start && body.EndDate is { } end && end < start)
            throw AppException.BadRequest("endDate 不可早於 startDate。");

        var ev = await LoadEventAsync(guid);
        if (ev is null)
        {
            ev = new NewsEvent { ArticleId = guid };
            db.NewsEvents.Add(ev);
        }

        ev.StartDate    = body.StartDate;
        ev.EndDate      = body.EndDate;
        ev.ContactEmail = body.ContactEmail;
        ev.CtaUrl       = body.CtaUrl;
        ev.UpdatedAt    = Clock.Now;

        ApplyEventTranslations(ev, body.Translations);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(ToDto(ev), "活動資訊已儲存。"));
    }

    public async Task<IActionResult> DeleteEventAsync(string id)
    {
        var guid = AdminWrite.ParseId(id, "article");
        var ev   = await LoadEventAsync(guid) ?? throw AppException.NotFound("NewsEvent");

        db.NewsEvents.Remove(ev);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok("活動資訊已刪除。"));
    }

    // ── 圖庫（ArticleImage）───────────────────────────────────────────────

    public async Task<IActionResult> GetGalleryAsync(string id)
    {
        var guid = AdminWrite.ParseId(id, "article");
        if (!await db.Articles.AnyAsync(a => a.Id == guid)) throw AppException.NotFound("Article");

        var rows = await db.ArticleImages
            .Where(i => i.ArticleId == guid).OrderBy(i => i.SortOrder)
            .Select(i => new ArticleImageInput(i.MediaId, i.SortOrder))
            .ToListAsync();

        return new OkObjectResult(ApiResponse.Ok(rows.ToArray()));
    }

    /// <summary>PUT /admin/articles/{id}/gallery —— 整批取代，陣列順序即畫面順序。</summary>
    public async Task<IActionResult> UpdateGalleryAsync(HttpRequest req, string id)
    {
        var guid = AdminWrite.ParseId(id, "article");
        var body = await AdminWrite.ReadAsync<UpdateGalleryRequest>(req);

        var entity = await db.Articles.Include(a => a.Images).FirstOrDefaultAsync(a => a.Id == guid)
            ?? throw AppException.NotFound("Article");

        var ordered = body.Images
            .GroupBy(i => i.MediaId).Select(g => g.First())
            .OrderBy(i => i.SortOrder).ToArray();

        await AdminWrite.EnsureMediaExistsAsync(db, ordered.Select(i => (Guid?)i.MediaId));

        entity.Images.Clear();
        for (var i = 0; i < ordered.Length; i++)
            entity.Images.Add(new ArticleImage { MediaId = ordered[i].MediaId, SortOrder = i });

        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();
        await RebuildUsageAsync(entity);

        return new OkObjectResult(ApiResponse.Ok(
            ordered.Length == 0 ? "圖庫已清空。" : $"圖庫已更新，共 {ordered.Length} 張。"));
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    /// <summary>
    /// 進來的時間一律當成 UTC。DB 的 datetime2 不帶時區，全站慣例是存 UTC
    /// （Common/Clock.cs）—— 少了這步，帶 offset 的 ISO 字串會被當成本地時間存進去，
    /// 排程發布會差好幾個小時。
    /// </summary>
    private static DateTime? NormalizePublishedAt(DateTime? value) => value switch
    {
        null => null,
        { Kind: DateTimeKind.Utc } v => v,
        { Kind: DateTimeKind.Local } v => v.ToUniversalTime(),
        var v => DateTime.SpecifyKind(v!.Value, DateTimeKind.Utc),
    };

    private static byte ParseKind(string raw) =>
        raw.ToLowerInvariant() switch
        {
            "news"    or "1" => ArticleType.News,
            "insight" or "insights" or "2" => ArticleType.Insight,
            _ => throw AppException.BadRequest($"未知的 kind/type：{raw}（news / insight）。"),
        };

    private async Task<ArticleCategory> LoadCategoryAsync(Guid id) =>
        await db.ArticleCategories.Include(c => c.Translations).FirstOrDefaultAsync(c => c.Id == id)
        ?? throw AppException.NotFound("ArticleCategory");

    private async Task<Article> LoadFullAsync(Guid id) =>
        await db.Articles
            .Include(a => a.Translations)
            .Include(a => a.Tags)
            .Include(a => a.Images)
            .FirstOrDefaultAsync(a => a.Id == id)
        ?? throw AppException.NotFound("Article");

    private Task<NewsEvent?> LoadEventAsync(Guid articleId) =>
        db.NewsEvents.Include(e => e.Translations).FirstOrDefaultAsync(e => e.ArticleId == articleId);

    /// <summary>slug 只在同一個 Kind 內唯一，所以比對必須帶上 Kind。</summary>
    private async Task EnsureCategorySlugFreeAsync(byte kind, string slug, Guid? exceptId)
    {
        var taken = await db.ArticleCategories
            .AnyAsync(c => c.Kind == kind && c.Slug == slug && (exceptId == null || c.Id != exceptId));

        if (taken)
            throw AppException.Conflict($"kind={kind} 底下的 slug '{slug}' 已被使用。");
    }

    /// <summary>FK 表達不了的那條：分類的 Kind 必須等於文章的 Type。</summary>
    private async Task ValidateCategoryAsync(byte type, Guid? categoryId)
    {
        if (categoryId is not { } id) return;

        var kind = await db.ArticleCategories.Where(c => c.Id == id).Select(c => (byte?)c.Kind).FirstOrDefaultAsync()
            ?? throw AppException.BadRequest($"文章分類 {id} 不存在。");

        if (kind != type)
            throw AppException.BadRequest(
                $"文章分類的 kind（{kind}）與文章的 type（{type}）不符 —— 文章會出現在分類計數裡但點進去找不到。");
    }

    private static void ApplyCategoryTranslations(
        ArticleCategory entity, Dictionary<string, ArticleCategoryTranslationInput?>? input)
    {
        if (input is null) return;

        foreach (var (locale, value) in AdminWrite.NormalizeTranslations(input, v => v.Name, "name"))
        {
            if (AdminWrite.DropTranslation(entity.Translations, t => t.Locale, locale, value)) continue;

            var tr = entity.Translations.FirstOrDefault(t => t.Locale == locale);
            if (tr is null)
            {
                tr = new ArticleCategoryTranslation { Locale = locale };
                entity.Translations.Add(tr);
            }

            tr.Name      = value.Name.Trim();
            tr.PromoJson = value.Promo?.ToJsonString();
        }
    }

    private void ApplyTranslations(Article entity, Dictionary<string, ArticleTranslationInput?>? input)
    {
        if (input is null) return;

        foreach (var (locale, value) in AdminWrite.NormalizeTranslations(input, v => v.Title, "title"))
        {
            if (AdminWrite.DropTranslation(entity.Translations, t => t.Locale, locale, value)) continue;

            var tr = entity.Translations.FirstOrDefault(t => t.Locale == locale);
            if (tr is null)
            {
                tr = new ArticleTranslation { Locale = locale };
                entity.Translations.Add(tr);
            }

            tr.Title      = value.Title.Trim();
            tr.Standfirst = value.Standfirst;
            // 文章內文用 Article profile（允許 h2/h3/blockquote/figure/img），
            // TOC 就是靠這些 H2 在讀取時推導的（Services/TocBuilder.cs）。
            tr.Body       = string.IsNullOrWhiteSpace(value.Body)
                ? null
                : sanitizers.Sanitize(value.Body, RichTextProfile.Article);
            tr.Excerpt        = value.Excerpt;
            tr.AuthorName     = value.AuthorName;
            tr.Disclaimer     = value.Disclaimer;
            tr.SeoTitle       = value.SeoTitle;
            tr.SeoDescription = value.SeoDescription;
        }
    }

    private static void ApplyEventTranslations(
        NewsEvent ev, Dictionary<string, NewsEventTranslationInput>? input)
    {
        if (input is null) return;

        foreach (var (rawLocale, value) in input)
        {
            var locale = AdminWrite.ValidLocale(rawLocale);

            var tr = ev.Translations.FirstOrDefault(t => t.Locale == locale);
            if (tr is null)
            {
                // FK 指向 NewsEvent 而非 Article，但兩者共用主鍵，值是同一個
                tr = new NewsEventTranslation { Locale = locale, ArticleId = ev.ArticleId };
                ev.Translations.Add(tr);
            }

            tr.DatesLabel = value.DatesLabel;
            tr.Venue      = value.Venue;
            tr.Booth      = value.Booth;
            tr.CtaLabel   = value.CtaLabel;
        }
    }

    private async Task ApplyTagsAsync(Article entity, Guid[] ids)
    {
        var distinct = ids.Distinct().ToArray();
        await AdminWrite.EnsureAllExistAsync(db.Tags.Select(t => t.Id), distinct, "tagId");

        entity.Tags.Clear();
        foreach (var id in distinct) entity.Tags.Add(new ArticleTag { TagId = id });
    }

    private Task RebuildUsageAsync(Article entity)
    {
        var refs = new List<(string, Guid)>();

        if (entity.CoverMediaId is { } cover) refs.Add(("cover", cover));

        var ordered = entity.Images.OrderBy(i => i.SortOrder).ToArray();
        for (var i = 0; i < ordered.Length; i++) refs.Add(($"gallery/{i}", ordered[i].MediaId));

        return mediaUsage.RebuildAsync(nameof(Article), entity.Id, refs);
    }

    // ── 對映 ───────────────────────────────────────────────────────────────

    private async Task<AdminArticleCategoryDto> WithCountAsync(ArticleCategory c) =>
        ToDto(c, await db.Articles.CountAsync(a => a.CategoryId == c.Id));

    private static AdminArticleCategoryDto ToDto(ArticleCategory c, int articleCount) => new(
        c.Id, c.Kind, c.Slug, c.SortOrder, c.Status, articleCount,
        c.Translations.OrderBy(t => t.Locale).ToDictionary(t => t.Locale,
            t => new ArticleCategoryTranslationInput(t.Name, JsonField.Parse(t.PromoJson))),
        c.CreatedAt, c.UpdatedAt);

    private async Task<AdminArticleDto> ToDtoAsync(Article a) => new(
        a.Id, a.Slug, a.Type, a.CategoryId, a.CoverMediaId, a.ReadMinutes, a.IsFeatured,
        a.Status, a.PublishedAt,
        a.Tags.Select(t => t.TagId).ToArray(),
        await db.NewsEvents.AnyAsync(e => e.ArticleId == a.Id),
        a.Images.Count,
        a.Translations.OrderBy(t => t.Locale).ToDictionary(t => t.Locale, t => new ArticleTranslationInput(
            t.Title, t.Standfirst, t.Body, t.Excerpt, t.AuthorName, t.Disclaimer, t.SeoTitle, t.SeoDescription)),
        AdminWrite.Base64(a.RowVer),
        a.CreatedAt, a.UpdatedAt);

    private static AdminNewsEventDto ToDto(NewsEvent e) => new(
        e.ArticleId, e.StartDate, e.EndDate, e.ContactEmail, e.CtaUrl,
        e.Translations.OrderBy(t => t.Locale).ToDictionary(t => t.Locale,
            t => new NewsEventTranslationInput(t.DatesLabel, t.Venue, t.Booth, t.CtaLabel)),
        e.UpdatedAt);
}
