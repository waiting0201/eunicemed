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
/// 後台分類 / 子分類 / 認證 / 部位 CRUD。公開端點在 <see cref="TaxonomyHandler"/>。
///
/// <para>
/// **刪除一律先擋引用，不做連帶清除**（回 409），與媒體庫的引用保護同一套規則：
/// 這四張表是全站的骨架，靜默把 149 筆產品的認證清空、或讓產品掉到沒有分類，
/// 是不會有人當場發現的破壞。要刪就先把引用改掉。
/// </para>
/// </summary>
public sealed class AdminTaxonomyHandler(AppDbContext db, MediaUsageWriter mediaUsage)
{
    // ── 分類 ───────────────────────────────────────────────────────────────

    public async Task<IActionResult> GetCategoriesAsync()
    {
        var rows = await db.Categories
            .Include(c => c.Translations)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        var subCounts     = await CountByAsync(db.SubCategories.GroupBy(s => s.CategoryId));
        var productCounts = await CountByAsync(db.Products.GroupBy(p => p.CategoryId));

        return new OkObjectResult(ApiResponse.Ok(
            rows.Select(c => ToDto(c, subCounts.GetValueOrDefault(c.Id), productCounts.GetValueOrDefault(c.Id))).ToArray()));
    }

    public async Task<IActionResult> GetCategoryAsync(string id)
    {
        var entity = await LoadCategoryAsync(AdminWrite.ParseId(id, "category"));
        return new OkObjectResult(ApiResponse.Ok(await WithCountsAsync(entity)));
    }

    public async Task<IActionResult> CreateCategoryAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpsertCategoryRequest>(req);

        if (string.IsNullOrWhiteSpace(body.Slug))
            throw AppException.BadRequest("slug 為必填。");
        if (body.Translations is null || body.Translations.Count == 0)
            throw AppException.BadRequest("至少要有一個語系的翻譯。");

        var slug = Slugify.Make(body.Slug.Trim());
        if (await db.Categories.AnyAsync(c => c.Slug == slug))
            throw AppException.Conflict($"Slug '{slug}' 已被使用。");

        var now = Clock.Now;
        var entity = new Category
        {
            Slug      = slug,
            SortOrder = body.SortOrder ?? 0,
            CreatedAt = now,
            UpdatedAt = now,
        };

        ApplyCategoryFields(entity, body);
        ApplyCategoryTranslations(entity, body.Translations);
        await AdminWrite.EnsureMediaExistsAsync(db, [entity.ImageMediaId, entity.HeroImageMediaId]);

        db.Categories.Add(entity);
        await db.SaveChangesAsync();
        await RebuildCategoryUsageAsync(entity);

        return new ObjectResult(ApiResponse.Ok(await WithCountsAsync(entity), "分類已建立。")) { StatusCode = 201 };
    }

    public async Task<IActionResult> UpdateCategoryAsync(HttpRequest req, string id)
    {
        var body   = await AdminWrite.ReadAsync<UpsertCategoryRequest>(req);
        var entity = await LoadCategoryAsync(AdminWrite.ParseId(id, "category"));

        AdminWrite.ApplyRowVersion(db.Entry(entity).Property(c => c.RowVer), body.RowVersion);

        if (!string.IsNullOrWhiteSpace(body.Slug))
        {
            var slug = Slugify.Make(body.Slug.Trim());
            if (slug != entity.Slug && await db.Categories.AnyAsync(c => c.Slug == slug))
                throw AppException.Conflict($"Slug '{slug}' 已被使用。");
            entity.Slug = slug;
        }

        if (body.SortOrder is { } sortOrder) entity.SortOrder = sortOrder;

        ApplyCategoryFields(entity, body);
        ApplyCategoryTranslations(entity, body.Translations);
        await AdminWrite.EnsureMediaExistsAsync(db, [entity.ImageMediaId, entity.HeroImageMediaId]);

        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();
        await RebuildCategoryUsageAsync(entity);

        return new OkObjectResult(ApiResponse.Ok(await WithCountsAsync(entity), "分類已更新。"));
    }

    public async Task<IActionResult> DeleteCategoryAsync(string id)
    {
        var guid   = AdminWrite.ParseId(id, "category");
        var entity = await db.Categories.FirstOrDefaultAsync(c => c.Id == guid)
            ?? throw AppException.NotFound("Category");

        var products = await db.Products.CountAsync(p => p.CategoryId == guid);
        var subs     = await db.SubCategories.CountAsync(s => s.CategoryId == guid);
        if (products > 0 || subs > 0)
            throw AppException.Conflict($"分類仍被 {subs} 個子分類、{products} 筆產品引用，請先改掉引用再刪除。");

        entity.IsDeleted = true;
        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();
        await mediaUsage.RebuildAsync(nameof(Category), guid, []);

        return new OkObjectResult(ApiResponse.Ok($"分類 '{entity.Slug}' 已刪除。"));
    }

    // ── 子分類 ─────────────────────────────────────────────────────────────

    public async Task<IActionResult> GetSubCategoriesAsync(HttpRequest req)
    {
        var q = db.SubCategories.Include(s => s.Translations).Include(s => s.Category).AsQueryable();

        if (ProductHandler.Nullable(req.Query["category"]) is { } category)
            q = q.Where(s => s.Category!.Slug == category);

        var rows   = await q.OrderBy(s => s.Category!.SortOrder).ThenBy(s => s.SortOrder).ToListAsync();
        var counts = await CountByAsync(db.Products.Where(p => p.SubCategoryId != null)
                                                   .GroupBy(p => p.SubCategoryId!.Value));

        return new OkObjectResult(ApiResponse.Ok(
            rows.Select(s => ToDto(s, counts.GetValueOrDefault(s.Id))).ToArray()));
    }

    public async Task<IActionResult> GetSubCategoryAsync(string id)
    {
        var entity = await LoadSubCategoryAsync(AdminWrite.ParseId(id, "sub-category"));
        return new OkObjectResult(ApiResponse.Ok(await WithCountsAsync(entity)));
    }

    public async Task<IActionResult> CreateSubCategoryAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpsertSubCategoryRequest>(req);

        if (string.IsNullOrWhiteSpace(body.Slug))
            throw AppException.BadRequest("slug 為必填。");
        if (body.CategoryId is not { } categoryId)
            throw AppException.BadRequest("categoryId 為必填。");
        if (body.Translations is null || body.Translations.Count == 0)
            throw AppException.BadRequest("至少要有一個語系的翻譯。");

        if (!await db.Categories.AnyAsync(c => c.Id == categoryId))
            throw AppException.BadRequest($"分類 {categoryId} 不存在。");

        // slug 是**全站唯一**而非分類內唯一 —— URL 是 /products/{category}/{sub}（docs/05 §3.1）
        var slug = Slugify.Make(body.Slug.Trim());
        if (await db.SubCategories.AnyAsync(s => s.Slug == slug))
            throw AppException.Conflict($"Slug '{slug}' 已被使用（子分類 slug 為全站唯一）。");

        var now = Clock.Now;
        var entity = new SubCategory
        {
            CategoryId = categoryId,
            Slug       = slug,
            SortOrder  = body.SortOrder ?? 0,
            Status     = body.Status ?? ContentStatus.Published,
            CreatedAt  = now,
            UpdatedAt  = now,
        };

        ApplySubCategoryFields(entity, body);
        ApplySubCategoryTranslations(entity, body.Translations);
        await AdminWrite.EnsureMediaExistsAsync(db, [entity.ImageMediaId, entity.HeroImageMediaId]);

        db.SubCategories.Add(entity);
        await db.SaveChangesAsync();
        await RebuildSubCategoryUsageAsync(entity);

        return new ObjectResult(ApiResponse.Ok(await WithCountsAsync(entity), "子分類已建立。")) { StatusCode = 201 };
    }

    public async Task<IActionResult> UpdateSubCategoryAsync(HttpRequest req, string id)
    {
        var body   = await AdminWrite.ReadAsync<UpsertSubCategoryRequest>(req);
        var entity = await LoadSubCategoryAsync(AdminWrite.ParseId(id, "sub-category"));

        AdminWrite.ApplyRowVersion(db.Entry(entity).Property(s => s.RowVer), body.RowVersion);

        if (!string.IsNullOrWhiteSpace(body.Slug))
        {
            var slug = Slugify.Make(body.Slug.Trim());
            if (slug != entity.Slug && await db.SubCategories.AnyAsync(s => s.Slug == slug))
                throw AppException.Conflict($"Slug '{slug}' 已被使用（子分類 slug 為全站唯一）。");
            entity.Slug = slug;
        }

        if (body.CategoryId is { } categoryId && categoryId != entity.CategoryId)
        {
            if (!await db.Categories.AnyAsync(c => c.Id == categoryId))
                throw AppException.BadRequest($"分類 {categoryId} 不存在。");

            // 換分類會讓底下所有產品的三段 URL 一起改變，且舊 URL 立刻 404。
            // 擋在這裡，要求編輯者先把產品搬走 —— 轉址規則要人工判斷（Phase 7 的 Redirect）。
            var products = await db.Products.CountAsync(p => p.SubCategoryId == entity.Id);
            if (products > 0)
                throw AppException.Conflict($"此子分類底下仍有 {products} 筆產品，換分類會讓它們的網址全部失效。請先搬移產品。");

            entity.CategoryId = categoryId;
        }

        if (body.SortOrder is { } sortOrder) entity.SortOrder = sortOrder;
        if (body.Status    is { } status)    entity.Status    = status;

        ApplySubCategoryFields(entity, body);
        ApplySubCategoryTranslations(entity, body.Translations);
        await AdminWrite.EnsureMediaExistsAsync(db, [entity.ImageMediaId, entity.HeroImageMediaId]);

        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();
        await RebuildSubCategoryUsageAsync(entity);

        return new OkObjectResult(ApiResponse.Ok(await WithCountsAsync(entity), "子分類已更新。"));
    }

    public async Task<IActionResult> DeleteSubCategoryAsync(string id)
    {
        var guid   = AdminWrite.ParseId(id, "sub-category");
        var entity = await db.SubCategories.FirstOrDefaultAsync(s => s.Id == guid)
            ?? throw AppException.NotFound("SubCategory");

        var products = await db.Products.CountAsync(p => p.SubCategoryId == guid);
        if (products > 0)
            throw AppException.Conflict($"子分類仍被 {products} 筆產品引用，請先改掉引用再刪除。");

        entity.IsDeleted = true;
        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();
        await mediaUsage.RebuildAsync(nameof(SubCategory), guid, []);

        return new OkObjectResult(ApiResponse.Ok($"子分類 '{entity.Slug}' 已刪除。"));
    }

    // ── 認證 ───────────────────────────────────────────────────────────────

    public async Task<IActionResult> GetCertificationsAsync()
    {
        var rows   = await db.Certifications.Include(c => c.Translations).OrderBy(c => c.SortOrder).ToListAsync();
        var counts = await CountByAsync(db.ProductCertifications.GroupBy(pc => pc.CertificationId));

        return new OkObjectResult(ApiResponse.Ok(
            rows.Select(c => ToDto(c, counts.GetValueOrDefault(c.Id))).ToArray()));
    }

    public async Task<IActionResult> GetCertificationAsync(string id)
    {
        var entity = await LoadCertificationAsync(AdminWrite.ParseId(id, "certification"));
        return new OkObjectResult(ApiResponse.Ok(await WithCountsAsync(entity)));
    }

    public async Task<IActionResult> CreateCertificationAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpsertCertificationRequest>(req);

        if (string.IsNullOrWhiteSpace(body.Slug))
            throw AppException.BadRequest("slug 為必填。");
        if (string.IsNullOrWhiteSpace(body.Mark))
            throw AppException.BadRequest("mark 為必填（品牌標章文字，不翻譯）。");

        var slug = Slugify.Make(body.Slug.Trim());
        if (await db.Certifications.AnyAsync(c => c.Slug == slug))
            throw AppException.Conflict($"Slug '{slug}' 已被使用。");

        var now = Clock.Now;
        var entity = new Certification
        {
            Slug      = slug,
            Mark      = body.Mark.Trim(),
            SortOrder = body.SortOrder ?? 0,
            Status    = body.Status ?? ContentStatus.Published,
            CreatedAt = now,
            UpdatedAt = now,
        };

        ApplyCertificationFields(entity, body);
        ApplyCertificationTranslations(entity, body.Translations);
        await AdminWrite.EnsureMediaExistsAsync(db, [entity.LogoMediaId]);

        db.Certifications.Add(entity);
        await db.SaveChangesAsync();
        await RebuildCertificationUsageAsync(entity);

        return new ObjectResult(ApiResponse.Ok(await WithCountsAsync(entity), "認證已建立。")) { StatusCode = 201 };
    }

    public async Task<IActionResult> UpdateCertificationAsync(HttpRequest req, string id)
    {
        var body   = await AdminWrite.ReadAsync<UpsertCertificationRequest>(req);
        var entity = await LoadCertificationAsync(AdminWrite.ParseId(id, "certification"));

        if (!string.IsNullOrWhiteSpace(body.Slug))
        {
            var slug = Slugify.Make(body.Slug.Trim());
            if (slug != entity.Slug && await db.Certifications.AnyAsync(c => c.Slug == slug))
                throw AppException.Conflict($"Slug '{slug}' 已被使用。");
            entity.Slug = slug;
        }

        if (!string.IsNullOrWhiteSpace(body.Mark)) entity.Mark      = body.Mark.Trim();
        if (body.SortOrder is { } sortOrder)       entity.SortOrder = sortOrder;
        if (body.Status    is { } status)          entity.Status    = status;

        ApplyCertificationFields(entity, body);
        ApplyCertificationTranslations(entity, body.Translations);
        await AdminWrite.EnsureMediaExistsAsync(db, [entity.LogoMediaId]);

        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();
        await RebuildCertificationUsageAsync(entity);

        return new OkObjectResult(ApiResponse.Ok(await WithCountsAsync(entity), "認證已更新。"));
    }

    /// <summary>DELETE /admin/certifications/{id} —— **硬刪除**（此表無 IsDeleted）。</summary>
    public async Task<IActionResult> DeleteCertificationAsync(string id)
    {
        var guid   = AdminWrite.ParseId(id, "certification");
        var entity = await db.Certifications.FirstOrDefaultAsync(c => c.Id == guid)
            ?? throw AppException.NotFound("Certification");

        var products = await db.ProductCertifications.CountAsync(pc => pc.CertificationId == guid);
        if (products > 0)
            throw AppException.Conflict($"認證仍掛在 {products} 筆產品上，請先取消掛載再刪除。");

        db.Certifications.Remove(entity);
        await db.SaveChangesAsync();
        await mediaUsage.RebuildAsync(nameof(Certification), guid, []);

        return new OkObjectResult(ApiResponse.Ok($"認證 '{entity.Slug}' 已刪除。"));
    }

    // ── 部位（僅 GET / PUT）────────────────────────────────────────────────

    public async Task<IActionResult> GetBodyPartsAsync()
    {
        var rows   = await db.BodyParts.OrderBy(b => b.SortOrder).ToListAsync();
        var counts = await CountByAsync(db.ProductBodyParts.GroupBy(pb => pb.BodyPartId));

        return new OkObjectResult(ApiResponse.Ok(
            rows.Select(b => ToDto(b, counts.GetValueOrDefault(b.Id))).ToArray()));
    }

    public async Task<IActionResult> UpdateBodyPartAsync(HttpRequest req, string id)
    {
        var guid = AdminWrite.ParseId(id, "body-part");
        var body = await AdminWrite.ReadAsync<UpdateBodyPartRequest>(req);

        var entity = await db.BodyParts.FirstOrDefaultAsync(b => b.Id == guid)
            ?? throw AppException.NotFound("BodyPart");

        // slug 刻意不可改：Application 的人體圖熱區與前端版型都以 slug 對應。
        if (!string.IsNullOrWhiteSpace(body.NameEn))   entity.NameEn   = body.NameEn.Trim();
        if (!string.IsNullOrWhiteSpace(body.NameZhTw)) entity.NameZhTw = body.NameZhTw.Trim();
        if (body.ShowOnBodyMap is { } show)            entity.ShowOnBodyMap = show;
        if (body.SortOrder     is { } sortOrder)       entity.SortOrder     = sortOrder;

        await db.SaveChangesAsync();

        var count = await db.ProductBodyParts.CountAsync(pb => pb.BodyPartId == guid);
        return new OkObjectResult(ApiResponse.Ok(ToDto(entity, count), "部位已更新。"));
    }

    // ── 內部：載入 ─────────────────────────────────────────────────────────

    private async Task<Category> LoadCategoryAsync(Guid id) =>
        await db.Categories.Include(c => c.Translations).FirstOrDefaultAsync(c => c.Id == id)
        ?? throw AppException.NotFound("Category");

    private async Task<SubCategory> LoadSubCategoryAsync(Guid id) =>
        await db.SubCategories.Include(s => s.Translations).Include(s => s.Category)
                              .FirstOrDefaultAsync(s => s.Id == id)
        ?? throw AppException.NotFound("SubCategory");

    private async Task<Certification> LoadCertificationAsync(Guid id) =>
        await db.Certifications.Include(c => c.Translations).FirstOrDefaultAsync(c => c.Id == id)
        ?? throw AppException.NotFound("Certification");

    // ── 內部：欄位套用 ─────────────────────────────────────────────────────

    private static void ApplyCategoryFields(Category entity, UpsertCategoryRequest body)
    {
        if (body.ClearImage)                          entity.ImageMediaId     = null;
        else if (body.ImageMediaId is { } image)      entity.ImageMediaId     = image;

        if (body.ClearHeroImage)                      entity.HeroImageMediaId = null;
        else if (body.HeroImageMediaId is { } hero)   entity.HeroImageMediaId = hero;
    }

    private static void ApplySubCategoryFields(SubCategory entity, UpsertSubCategoryRequest body)
    {
        if (body.ClearImage)                          entity.ImageMediaId     = null;
        else if (body.ImageMediaId is { } image)      entity.ImageMediaId     = image;

        if (body.ClearHeroImage)                      entity.HeroImageMediaId = null;
        else if (body.HeroImageMediaId is { } hero)   entity.HeroImageMediaId = hero;
    }

    private static void ApplyCertificationFields(Certification entity, UpsertCertificationRequest body)
    {
        if (body.ClearLogo)                        entity.LogoMediaId = null;
        else if (body.LogoMediaId is { } logo)     entity.LogoMediaId = logo;

        if (body.DownloadId is { } download)       entity.DownloadId  = download;
    }

    private static void ApplyCategoryTranslations(
        Category entity, Dictionary<string, CategoryTranslationInput?>? input)
    {
        if (input is null) return;

        foreach (var (locale, value) in Normalize(input, v => v.Name))
        {
            // null = 刪除該語系
            if (value is null)
            {
                if (entity.Translations.FirstOrDefault(t => t.Locale == locale) is { } drop)
                    entity.Translations.Remove(drop);
                continue;
            }

            var tr = entity.Translations.FirstOrDefault(t => t.Locale == locale);
            if (tr is null)
            {
                tr = new CategoryTranslation { Locale = locale };
                entity.Translations.Add(tr);
            }

            tr.Name              = value.Name.Trim();
            tr.Description       = value.Description;
            tr.StatsJson         = value.Stats?.ToJsonString();
            tr.SupportLevelsJson = value.SupportLevels?.ToJsonString();
            tr.SeoTitle          = value.SeoTitle;
            tr.SeoDescription    = value.SeoDescription;
        }
    }

    private static void ApplySubCategoryTranslations(
        SubCategory entity, Dictionary<string, SubCategoryTranslationInput?>? input)
    {
        if (input is null) return;

        foreach (var (locale, value) in Normalize(input, v => v.Name))
        {
            // null = 刪除該語系
            if (value is null)
            {
                if (entity.Translations.FirstOrDefault(t => t.Locale == locale) is { } drop)
                    entity.Translations.Remove(drop);
                continue;
            }

            var tr = entity.Translations.FirstOrDefault(t => t.Locale == locale);
            if (tr is null)
            {
                tr = new SubCategoryTranslation { Locale = locale };
                entity.Translations.Add(tr);
            }

            tr.Name           = value.Name.Trim();
            tr.Description    = value.Description;
            tr.StatsJson      = value.Stats?.ToJsonString();
            tr.SeoTitle       = value.SeoTitle;
            tr.SeoDescription = value.SeoDescription;
        }
    }

    private static void ApplyCertificationTranslations(
        Certification entity, Dictionary<string, CertificationTranslationInput?>? input)
    {
        if (input is null) return;

        foreach (var (rawLocale, value) in input)
        {
            var locale = AdminWrite.ValidLocale(rawLocale);

            if (value is null)
            {
                if (entity.Translations.FirstOrDefault(t => t.Locale == locale) is { } drop)
                    entity.Translations.Remove(drop);
                continue;
            }

            var tr = entity.Translations.FirstOrDefault(t => t.Locale == locale);
            if (tr is null)
            {
                tr = new CertificationTranslation { Locale = locale };
                entity.Translations.Add(tr);
            }

            // 認證沒有 Name —— 標章文字 Mark 在主表且不翻譯（docs/05 §3.3）
            tr.SubLabel    = value.SubLabel;
            tr.Description = value.Description;
        }
    }

    /// <summary>
    /// 翻譯字典的共同前置檢查：語系合法、name 非空。
    ///
    /// <para>
    /// **值為 null 代表刪除該語系**，會以 `Value = default` 回傳，由呼叫端處理。
    /// 「未帶到 = 不動它」防止只送 en 時洗掉 zh-TW；沒有刪除途徑的話，
    /// 編輯者加錯語系就只能改資料庫（見 docs/13 的踩坑）。
    /// </para>
    /// </summary>
    private static IEnumerable<(string Locale, T? Value)> Normalize<T>(
        Dictionary<string, T?> input, Func<T, string> name) where T : class
    {
        foreach (var (rawLocale, value) in input)
        {
            var locale = AdminWrite.ValidLocale(rawLocale);

            if (value is null)
            {
                yield return (locale, null);
                continue;
            }

            if (string.IsNullOrWhiteSpace(name(value)))
                throw AppException.BadRequest($"語系 {locale} 的 name 為必填。");

            yield return (locale, value);
        }
    }

    // ── 內部：共用 ─────────────────────────────────────────────────────────

    private static async Task<Dictionary<Guid, int>> CountByAsync<T>(IQueryable<IGrouping<Guid, T>> grouped) =>
        await grouped.Select(g => new { g.Key, Count = g.Count() })
                     .ToDictionaryAsync(x => x.Key, x => x.Count);

    private Task RebuildCategoryUsageAsync(Category c) =>
        mediaUsage.RebuildAsync(nameof(Category), c.Id, AdminWrite.MediaRefs(
            ("image", c.ImageMediaId), ("heroImage", c.HeroImageMediaId)));

    private Task RebuildSubCategoryUsageAsync(SubCategory s) =>
        mediaUsage.RebuildAsync(nameof(SubCategory), s.Id, AdminWrite.MediaRefs(
            ("image", s.ImageMediaId), ("heroImage", s.HeroImageMediaId)));

    private Task RebuildCertificationUsageAsync(Certification c) =>
        mediaUsage.RebuildAsync(nameof(Certification), c.Id, AdminWrite.MediaRefs(("logo", c.LogoMediaId)));

    // ── 內部：對映 ─────────────────────────────────────────────────────────

    private async Task<AdminCategoryDto> WithCountsAsync(Category c) => ToDto(
        c,
        await db.SubCategories.CountAsync(s => s.CategoryId == c.Id),
        await db.Products.CountAsync(p => p.CategoryId == c.Id));

    private async Task<AdminSubCategoryDto> WithCountsAsync(SubCategory s) => ToDto(
        s, await db.Products.CountAsync(p => p.SubCategoryId == s.Id));

    private async Task<AdminCertificationDto> WithCountsAsync(Certification c) => ToDto(
        c, await db.ProductCertifications.CountAsync(pc => pc.CertificationId == c.Id));

    private static AdminCategoryDto ToDto(Category c, int subCount, int productCount) => new(
        c.Id, c.Slug, c.SortOrder, c.ImageMediaId, c.HeroImageMediaId,
        subCount, productCount,
        c.Translations.OrderBy(t => t.Locale).ToDictionary(t => t.Locale, t => new CategoryTranslationInput(
            t.Name, t.Description,
            JsonField.Parse(t.StatsJson), JsonField.Parse(t.SupportLevelsJson),
            t.SeoTitle, t.SeoDescription)),
        AdminWrite.Base64(c.RowVer),
        c.CreatedAt, c.UpdatedAt);

    private static AdminSubCategoryDto ToDto(SubCategory s, int productCount) => new(
        s.Id, s.CategoryId, s.Category?.Slug ?? string.Empty, s.Slug, s.SortOrder,
        s.ImageMediaId, s.HeroImageMediaId, s.Status, productCount,
        s.Translations.OrderBy(t => t.Locale).ToDictionary(t => t.Locale, t => new SubCategoryTranslationInput(
            t.Name, t.Description, JsonField.Parse(t.StatsJson), t.SeoTitle, t.SeoDescription)),
        AdminWrite.Base64(s.RowVer),
        s.CreatedAt, s.UpdatedAt);

    private static AdminCertificationDto ToDto(Certification c, int productCount) => new(
        c.Id, c.Slug, c.Mark, c.LogoMediaId, c.DownloadId, c.SortOrder, c.Status, productCount,
        c.Translations.OrderBy(t => t.Locale).ToDictionary(t => t.Locale, t => new CertificationTranslationInput(
            t.SubLabel, t.Description)),
        c.CreatedAt, c.UpdatedAt);

    private static AdminBodyPartDto ToDto(BodyPart b, int productCount) => new(
        b.Id, b.Slug, b.NameEn, b.NameZhTw, b.ShowOnBodyMap, b.SortOrder, productCount);
}
