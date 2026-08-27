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
/// 後台產品 CRUD。公開端點與舊站匯入在 <see cref="ProductHandler"/>。
///
/// <para>
/// 形狀沿用 <see cref="CollectionHandler"/>（後台 CRUD 的參考實作），
/// 但多了三件 Collection 沒有的事，其餘內容模組會重複遇到：
/// </para>
/// <list type="number">
/// <item><b>關聯表整批取代</b>：BodyPart / Certification / Tag / Image。
///       null = 不動，空陣列 = 清空 —— 兩者必須分得出來。</item>
/// <item><b>發布分權</b>：Author 可存草稿但不可發布。權限由 AppRouter 把關，
///       這裡只負責狀態轉換與「發布前資料是否完整」。</item>
/// <item><b>ROWVERSION 併發</b>：帶 rowVersion 就比對，不帶就是「最後寫入者贏」。</item>
/// </list>
/// </summary>
public sealed class AdminProductHandler(
    AppDbContext     db,
    MediaUsageWriter mediaUsage,
    HtmlSanitizers   sanitizers)
{
    // ── 讀取 ───────────────────────────────────────────────────────────────

    /// <summary>GET /admin/products?status=&amp;search=&amp;category=&amp;subCategory=&amp;page=&amp;pageSize=</summary>
    public async Task<IActionResult> GetListAsync(HttpRequest req)
    {
        var q = db.Products
            .Include(p => p.Translations)
            .Include(p => p.Category)
            .Include(p => p.SubCategory)
            .Include(p => p.Collection)
            .AsQueryable();

        if (ProductHandler.Nullable(req.Query["status"]) is { } rawStatus)
        {
            var status = AdminWrite.ParseStatus(rawStatus);
            q = q.Where(p => p.Status == status);
        }

        if (ProductHandler.Nullable(req.Query["category"]) is { } category)
            q = q.Where(p => p.Category!.Slug == category);

        if (ProductHandler.Nullable(req.Query["subCategory"]) is { } sub)
            q = q.Where(p => p.SubCategory!.Slug == sub);

        // docs/04 §6：search 同時比對 Name 與 Sku。Name 在翻譯表，任一語系命中即可 ——
        // 編輯者搜「膝」時不該因為當前介面語系是 en 就查不到。
        if (ProductHandler.Nullable(req.Query["search"]) is { } search)
        {
            var like = $"%{search}%";
            q = q.Where(p => EF.Functions.Like(p.Sku ?? "", like)
                          || p.Translations.Any(t => EF.Functions.Like(t.Name, like)));
        }

        var (page, pageSize) = ProductHandler.Paging(req);
        var total = await q.CountAsync();

        var rows = await q
            .OrderBy(p => p.SortOrder).ThenBy(p => p.Slug)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => new
            {
                p.Id, p.Slug, p.Sku, p.Status, p.IsFeatured, p.SortOrder, p.PublishedAt, p.UpdatedAt,
                CategorySlug    = p.Category!.Slug,
                SubCategorySlug = p.SubCategory!.Slug,
                CollectionSlug  = p.Collection!.Slug,
                NameEn   = p.Translations.Where(t => t.Locale == Locales.En).Select(t => t.Name).FirstOrDefault(),
                NameZhTw = p.Translations.Where(t => t.Locale == Locales.ZhTw).Select(t => t.Name).FirstOrDefault(),
                PrimaryImageId = p.Images
                    .OrderByDescending(i => i.IsPrimary).ThenBy(i => i.SortOrder)
                    .Select(i => (Guid?)i.MediaId).FirstOrDefault(),
            })
            .ToListAsync();

        // 主圖網址分開查：ProductImage 沒有 Media 導覽屬性，硬塞進上面的投影會變成
        // 每列一次子查詢。這裡一次撈完整頁。
        var imageIds = rows.Where(r => r.PrimaryImageId is not null).Select(r => r.PrimaryImageId!.Value).Distinct().ToArray();
        var imageUrls = imageIds.Length == 0
            ? new Dictionary<Guid, string>()
            : await db.Media.Where(m => imageIds.Contains(m.Id))
                            .ToDictionaryAsync(m => m.Id, m => m.BlobUrl);

        var items = rows.Select(r => new AdminProductListItemDto(
            r.Id, r.Slug, r.Sku, r.NameEn, r.NameZhTw,
            r.CategorySlug, r.SubCategorySlug, r.CollectionSlug,
            r.Status, r.IsFeatured, r.SortOrder,
            r.PrimaryImageId is { } mid ? imageUrls.GetValueOrDefault(mid) : null,
            r.PublishedAt, r.UpdatedAt)).ToArray();

        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        return new OkObjectResult(ApiResponse.Ok(
            new PagedResult<AdminProductListItemDto>(items, total, page, pageSize, totalPages)));
    }

    /// <summary>GET /admin/products/{id}</summary>
    public async Task<IActionResult> GetByIdAsync(string id)
    {
        var entity = await LoadFullAsync(AdminWrite.ParseId(id, "product"));
        return new OkObjectResult(ApiResponse.Ok(ToDto(entity)));
    }

    // ── 寫入 ───────────────────────────────────────────────────────────────

    /// <summary>POST /admin/products —— 一律建為草稿，發布走 /publish。</summary>
    public async Task<IActionResult> CreateAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpsertProductRequest>(req);

        if (string.IsNullOrWhiteSpace(body.Slug))
            throw AppException.BadRequest("slug 為必填。");
        if (body.CategoryId is not { } categoryId)
            throw AppException.BadRequest("categoryId 為必填。");
        if (body.Translations is null || body.Translations.Count == 0)
            throw AppException.BadRequest("至少要有一個語系的翻譯。");

        var slug = Slugify.Make(body.Slug.Trim());
        if (await db.Products.AnyAsync(p => p.Slug == slug))
            throw AppException.Conflict($"Slug '{slug}' 已被使用。");

        await ValidateTaxonomyAsync(categoryId, body.SubCategoryId);

        var now = Clock.Now;
        var entity = new Product
        {
            Slug              = slug,
            Sku               = ProductHandler.Nullable(body.Sku),
            CategoryId        = categoryId,
            SubCategoryId     = body.SubCategoryId,
            CollectionId      = body.CollectionId,
            Status            = ContentStatus.Draft,
            IsFeatured        = body.IsFeatured ?? false,
            FeaturedSortOrder = body.FeaturedSortOrder ?? 0,
            SortOrder         = body.SortOrder ?? 0,
            CreatedAt         = now,
            UpdatedAt         = now,
        };

        await ApplyAsync(entity, body);

        db.Products.Add(entity);
        await db.SaveChangesAsync();
        await RebuildUsageAsync(entity);

        return new ObjectResult(ApiResponse.Ok(ToDto(entity), "產品已建立（草稿）。")) { StatusCode = 201 };
    }

    /// <summary>PUT /admin/products/{id}</summary>
    public async Task<IActionResult> UpdateAsync(HttpRequest req, string id)
    {
        var body   = await AdminWrite.ReadAsync<UpsertProductRequest>(req);
        var entity = await LoadFullAsync(AdminWrite.ParseId(id, "product"));

        AdminWrite.ApplyRowVersion(db.Entry(entity).Property(p => p.RowVer), body.RowVersion);

        if (!string.IsNullOrWhiteSpace(body.Slug))
        {
            var slug = Slugify.Make(body.Slug.Trim());
            if (slug != entity.Slug && await db.Products.AnyAsync(p => p.Slug == slug))
                throw AppException.Conflict($"Slug '{slug}' 已被使用。");
            entity.Slug = slug;
        }

        var categoryId    = body.CategoryId ?? entity.CategoryId;
        var subCategoryId = body.ClearSubCategory ? null : body.SubCategoryId ?? entity.SubCategoryId;
        await ValidateTaxonomyAsync(categoryId, subCategoryId);

        entity.CategoryId    = categoryId;
        entity.SubCategoryId = subCategoryId;
        entity.CollectionId  = body.ClearCollection ? null : body.CollectionId ?? entity.CollectionId;

        if (body.Sku is not null)               entity.Sku               = ProductHandler.Nullable(body.Sku);
        if (body.IsFeatured is { } featured)    entity.IsFeatured        = featured;
        if (body.FeaturedSortOrder is { } fso)  entity.FeaturedSortOrder = fso;
        if (body.SortOrder is { } sortOrder)    entity.SortOrder         = sortOrder;

        await ApplyAsync(entity, body);
        entity.UpdatedAt = Clock.Now;

        await db.SaveChangesAsync();
        await RebuildUsageAsync(entity);

        return new OkObjectResult(ApiResponse.Ok(ToDto(entity), "產品已更新。"));
    }

    /// <summary>
    /// DELETE /admin/products/{id} —— **軟刪除**（docs/05 §1）。
    ///
    /// <para>
    /// 兩件事必須一起做：清掉兩側的 <c>ProductRelated</c>（否則其他產品的相關產品區
    /// 會指向一個已消失的產品），以及清掉 <c>MediaUsage</c>（否則被刪產品的圖永遠
    /// 刪不掉 —— 媒體庫的引用保護會擋下）。
    /// </para>
    /// </summary>
    public async Task<IActionResult> DeleteAsync(string id)
    {
        var guid   = AdminWrite.ParseId(id, "product");
        var entity = await db.Products.FirstOrDefaultAsync(p => p.Id == guid)
            ?? throw AppException.NotFound("Product");

        await db.ProductRelated
            .Where(r => r.ProductId == guid || r.RelatedProductId == guid)
            .ExecuteDeleteAsync();

        entity.IsDeleted = true;
        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();

        await mediaUsage.RebuildAsync(nameof(Product), guid, []);

        return new OkObjectResult(ApiResponse.Ok($"產品 '{entity.Slug}' 已刪除。"));
    }

    // ── 發布 ───────────────────────────────────────────────────────────────

    /// <summary>POST /admin/products/{id}/publish —— Editor 以上（AppRouter 把關）。</summary>
    public async Task<IActionResult> PublishAsync(string id)
    {
        var entity = await LoadFullAsync(AdminWrite.ParseId(id, "product"));

        // 沒有任何翻譯就發布 = 前台每個語系都查不到它（語言純度原則會把它整筆濾掉）。
        // 讓它在後台就擋下來，而不是上線後才發現「已發布但看不到」。
        if (entity.Translations.Count == 0)
            throw AppException.BadRequest("沒有任何語系翻譯，無法發布。");

        entity.Status      = ContentStatus.Published;
        entity.PublishedAt ??= Clock.Now;
        entity.UpdatedAt   = Clock.Now;
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(ToDto(entity), "產品已發布。"));
    }

    /// <summary>POST /admin/products/{id}/unpublish —— 退回草稿，保留 PublishedAt。</summary>
    public async Task<IActionResult> UnpublishAsync(string id)
    {
        var entity = await LoadFullAsync(AdminWrite.ParseId(id, "product"));

        // PublishedAt 刻意保留：它是「首次發布時間」，用於排序與 SEO 的 datePublished。
        // 清掉的話重新發布會讓文章跳到列表最前面，等於竄改時序。
        entity.Status    = ContentStatus.Draft;
        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(ToDto(entity), "產品已取消發布。"));
    }

    // ── 相關產品 ───────────────────────────────────────────────────────────

    /// <summary>GET /admin/products/{id}/related —— 只回人工指定的，不含自動遞補。</summary>
    public async Task<IActionResult> GetRelatedAsync(string id)
    {
        var guid = AdminWrite.ParseId(id, "product");
        if (!await db.Products.AnyAsync(p => p.Id == guid))
            throw AppException.NotFound("Product");

        var rows = await db.ProductRelated
            .Where(r => r.ProductId == guid)
            .OrderBy(r => r.SortOrder)
            .Select(r => new AdminRelatedItemDto(
                r.RelatedProductId,
                r.RelatedProduct!.Slug,
                r.RelatedProduct.Translations.Where(t => t.Locale == Locales.En).Select(t => t.Name).FirstOrDefault(),
                r.RelatedProduct.Sku,
                r.SortOrder))
            .ToListAsync();

        return new OkObjectResult(ApiResponse.Ok(rows.ToArray()));
    }

    /// <summary>
    /// PUT /admin/products/{id}/related —— 整批取代，**陣列順序即畫面順序**。
    /// 空陣列＝回到自動計算（docs/04 §6）。
    /// </summary>
    public async Task<IActionResult> UpdateRelatedAsync(HttpRequest req, string id)
    {
        var guid = AdminWrite.ParseId(id, "product");
        if (!await db.Products.AnyAsync(p => p.Id == guid))
            throw AppException.NotFound("Product");

        var body = await req.ReadFromJsonAsync<UpdateRelatedRequest>()
            ?? throw AppException.BadRequest("Invalid request body.");

        var ids = body.RelatedProductIds.Distinct().ToArray();

        if (ids.Contains(guid))
            throw AppException.BadRequest("產品不能把自己列為相關產品。");

        var existing = await db.Products.Where(p => ids.Contains(p.Id)).Select(p => p.Id).ToListAsync();
        if (existing.Count != ids.Length)
            throw AppException.BadRequest($"有 {ids.Length - existing.Count} 筆 relatedProductId 不存在或已刪除。");

        await db.ProductRelated.Where(r => r.ProductId == guid).ExecuteDeleteAsync();

        for (var i = 0; i < ids.Length; i++)
            db.ProductRelated.Add(new ProductRelated { ProductId = guid, RelatedProductId = ids[i], SortOrder = i });

        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(
            ids.Length == 0 ? "已清空人工指定，相關產品回到自動計算。" : $"已更新 {ids.Length} 筆相關產品。"));
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    private async Task<Product> LoadFullAsync(Guid id) =>
        await db.Products
            .Include(p => p.Translations)
            .Include(p => p.Images)
            .Include(p => p.BodyParts)
            .Include(p => p.Certifications)
            .Include(p => p.Tags)
            .FirstOrDefaultAsync(p => p.Id == id)
        ?? throw AppException.NotFound("Product");

    /// <summary>
    /// 三段 URL 的歸屬在寫入時就要守住：子分類必須屬於該分類。
    /// 不擋的話資料存得下去，但 <c>/products/{category}/{sub}/{slug}</c> 會永遠 404，
    /// 而編輯者只會看到「產品明明是已發布卻打不開」。
    /// </summary>
    private async Task ValidateTaxonomyAsync(Guid categoryId, Guid? subCategoryId)
    {
        if (!await db.Categories.AnyAsync(c => c.Id == categoryId))
            throw AppException.BadRequest($"分類 {categoryId} 不存在。");

        if (subCategoryId is not { } subId) return;

        var owner = await db.SubCategories.Where(s => s.Id == subId).Select(s => (Guid?)s.CategoryId).FirstOrDefaultAsync()
            ?? throw AppException.BadRequest($"子分類 {subId} 不存在。");

        if (owner != categoryId)
            throw AppException.BadRequest("子分類不屬於指定的分類，三段 URL 會解析不到。");
    }

    /// <summary>翻譯與四組關聯的整批套用。null 一律代表「這次不動它」。</summary>
    private async Task ApplyAsync(Product entity, UpsertProductRequest body)
    {
        if (body.ClearUseCaseImage)                     entity.UseCaseImageMediaId = null;
        else if (body.UseCaseImageMediaId is { } ucId)  entity.UseCaseImageMediaId = ucId;

        if (body.ClearSizeChartDiagram)                    entity.SizeChartDiagramMediaId = null;
        else if (body.SizeChartDiagramMediaId is { } scId) entity.SizeChartDiagramMediaId = scId;

        ApplyTranslations(entity, body.Translations);

        // 刪到一個語系都不剩的話，這筆產品在前台每個語系都查不到，
        // 而後台列表只顯示名稱 —— 它會變成一列空白，難以辨認也難以救回。
        if (entity.Translations.Count == 0)
            throw AppException.BadRequest("至少要保留一個語系的翻譯。");

        if (body.Images is { } images)          await ApplyImagesAsync(entity, images);
        if (body.BodyPartIds is { } bodyParts)  await ApplyBodyPartsAsync(entity, bodyParts);
        if (body.CertificationIds is { } certs) await ApplyCertificationsAsync(entity, certs);
        if (body.TagIds is { } tags)            await ApplyTagsAsync(entity, tags);

        await ValidateMediaAsync(entity);
    }

    /// <summary>
    /// 翻譯列 upsert：只處理 request 帶到的語系，未帶到的維持原狀
    /// （避免前端只送 en 就把 zh-TW 洗掉）。與 CollectionHandler 同一套規則。
    /// </summary>
    private void ApplyTranslations(Product entity, Dictionary<string, ProductTranslationInput?>? input)
    {
        if (input is null) return;

        foreach (var (rawLocale, value) in input)
        {
            var locale = AdminWrite.ValidLocale(rawLocale);

            // 值為 null = 刪除該語系。
            //
            // 「未帶到 = 不動它」讓前端只送 en 時不會洗掉 zh-TW，這是對的；
            // 但少了刪除的途徑，編輯者就無法表達「這個產品不提供中文版」——
            // 加錯一個語系之後只能改資料庫。null 是明確的刪除意圖，
            // 與「沒提到」分得開。
            if (value is null)
            {
                if (entity.Translations.FirstOrDefault(t => t.Locale == locale) is { } drop)
                    entity.Translations.Remove(drop);
                continue;
            }

            if (string.IsNullOrWhiteSpace(value.Name))
                throw AppException.BadRequest($"語系 {locale} 的 name 為必填。");

            var tr = entity.Translations.FirstOrDefault(t => t.Locale == locale);
            if (tr is null)
            {
                tr = new ProductTranslation { Locale = locale };
                entity.Translations.Add(tr);
            }

            tr.Name          = value.Name.Trim();
            tr.Summary       = value.Summary;
            // 後台的編輯器不是安全邊界 —— 任何人都能直接打這支 API（Services/HtmlSanitizers.cs）
            tr.Description   = string.IsNullOrWhiteSpace(value.Description)
                ? null
                : sanitizers.Sanitize(value.Description, RichTextProfile.Section);
            tr.FeaturedBlurb = value.FeaturedBlurb;

            tr.FeaturesJson   = value.Features?.ToJsonString();
            tr.UseCasesJson   = value.UseCases?.ToJsonString();
            tr.SpecsJson      = value.Specs?.ToJsonString();
            tr.SizeChartJson  = value.SizeChart?.ToJsonString();
            tr.ConditionsJson = value.Conditions?.ToJsonString();

            tr.SeoTitle       = value.SeoTitle;
            tr.SeoDescription = value.SeoDescription;
            tr.OgImageMediaId = value.OgImageMediaId;
        }
    }

    /// <summary>
    /// 產品圖整批取代。**主圖唯一由這裡保證** —— DB 端沒有約束（docs/05 §3.2）。
    /// 沒指定主圖時取第一張，指定多張時只認第一張。
    /// </summary>
    private async Task ApplyImagesAsync(Product entity, AdminProductImageInput[] images)
    {
        var ordered = images
            .GroupBy(i => i.MediaId).Select(g => g.First())   // 同一張圖掛兩次是資料問題
            .OrderBy(i => i.SortOrder).ToArray();

        await AdminWrite.EnsureMediaExistsAsync(db, ordered.Select(i => (Guid?)i.MediaId));

        entity.Images.Clear();

        var primaryIndex = Array.FindIndex(ordered, i => i.IsPrimary);
        if (primaryIndex < 0 && ordered.Length > 0) primaryIndex = 0;

        for (var i = 0; i < ordered.Length; i++)
        {
            entity.Images.Add(new ProductImage
            {
                MediaId   = ordered[i].MediaId,
                IsPrimary = i == primaryIndex,
                SortOrder = i,
            });
        }
    }

    private async Task ApplyBodyPartsAsync(Product entity, Guid[] ids)
    {
        var distinct = ids.Distinct().ToArray();
        await AdminWrite.EnsureAllExistAsync(db.BodyParts.Select(b => b.Id), distinct, "bodyPartId");

        entity.BodyParts.Clear();
        foreach (var id in distinct) entity.BodyParts.Add(new ProductBodyPart { BodyPartId = id });
    }

    private async Task ApplyCertificationsAsync(Product entity, Guid[] ids)
    {
        var distinct = ids.Distinct().ToArray();
        await AdminWrite.EnsureAllExistAsync(db.Certifications.Select(c => c.Id), distinct, "certificationId");

        entity.Certifications.Clear();
        foreach (var id in distinct) entity.Certifications.Add(new ProductCertification { CertificationId = id });
    }

    private async Task ApplyTagsAsync(Product entity, Guid[] ids)
    {
        var distinct = ids.Distinct().ToArray();
        await AdminWrite.EnsureAllExistAsync(db.Tags.Select(t => t.Id), distinct, "tagId");

        entity.Tags.Clear();
        foreach (var id in distinct) entity.Tags.Add(new ProductTag { TagId = id });
    }

    /// <summary>FK 型的媒體引用（use-case 圖、og 圖）也要驗，否則會撞 FK 變成 500。</summary>
    private async Task ValidateMediaAsync(Product entity)
    {
        var ids = new List<Guid?> { entity.UseCaseImageMediaId, entity.SizeChartDiagramMediaId };
        ids.AddRange(entity.Translations.Select(t => t.OgImageMediaId));

        await AdminWrite.EnsureMediaExistsAsync(db, ids);
    }

    /// <summary>
    /// 存檔後重建自身的 MediaUsage（docs/04 §6）。
    /// og 圖是逐語系的，FieldPath 必須帶上語系才不會互相蓋掉。
    /// </summary>
    private Task RebuildUsageAsync(Product entity)
    {
        var refs = new List<(string, Guid)>();

        var ordered = entity.Images.OrderBy(i => i.SortOrder).ToArray();
        for (var i = 0; i < ordered.Length; i++) refs.Add(($"images/{i}", ordered[i].MediaId));

        if (entity.UseCaseImageMediaId is { } uc) refs.Add(("useCaseImage", uc));
        if (entity.SizeChartDiagramMediaId is { } sc) refs.Add(("sizeChartDiagram", sc));

        foreach (var tr in entity.Translations.Where(t => t.OgImageMediaId is not null))
            refs.Add(($"translations/{tr.Locale}/ogImage", tr.OgImageMediaId!.Value));

        return mediaUsage.RebuildAsync(nameof(Product), entity.Id, refs);
    }

    private static AdminProductDto ToDto(Product p) => new(
        p.Id, p.Slug, p.Sku,
        p.CategoryId, p.SubCategoryId, p.CollectionId,
        p.Status, p.IsFeatured, p.FeaturedSortOrder,
        p.UseCaseImageMediaId, p.SizeChartDiagramMediaId, p.SortOrder, p.PublishedAt,
        p.Images.OrderBy(i => i.SortOrder)
                .Select(i => new AdminProductImageInput(i.MediaId, i.IsPrimary, i.SortOrder)).ToArray(),
        p.BodyParts.Select(b => b.BodyPartId).ToArray(),
        p.Certifications.Select(c => c.CertificationId).ToArray(),
        p.Tags.Select(t => t.TagId).ToArray(),
        p.Translations.OrderBy(t => t.Locale).ToDictionary(t => t.Locale, t => new ProductTranslationInput(
            t.Name, t.Summary, t.Description, t.FeaturedBlurb,
            JsonField.Parse(t.FeaturesJson), JsonField.Parse(t.UseCasesJson),
            JsonField.Parse(t.SpecsJson), JsonField.Parse(t.SizeChartJson), JsonField.Parse(t.ConditionsJson),
            t.SeoTitle, t.SeoDescription, t.OgImageMediaId)),
        AdminWrite.Base64(p.RowVer),
        p.CreatedAt, p.UpdatedAt);
}
