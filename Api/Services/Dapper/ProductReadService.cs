using System.Data;
using Dapper;
using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Dtos;

namespace EuniceMed.Api.Services.Dapper;

public interface IProductReadService
{
    Task<(IReadOnlyList<ProductListItemDto> Items, int Total)> GetListAsync(
        ProductFilter filter, string locale, bool? featured, string? sort, int page, int pageSize);

    /// <summary>
    /// facet 折算用的最小投影：通過「基礎條件」（已發布 **且有該語系翻譯**）的候選列。
    /// </summary>
    Task<IReadOnlyList<FacetRow>> GetFacetRowsAsync(string locale);

    /// <summary>三段路徑查詢；任一段歸屬不符即回 null（呼叫端轉 404）。</summary>
    Task<ProductRow?> GetByPathAsync(string category, string sub, string slug, string locale);

    Task<ProductRow?> GetBySlugAsync(string slug, string locale);

    Task<IReadOnlyList<ProductListItemDto>> GetRelatedAsync(Guid productId, string locale, int take);

    /// <summary>詳情頁的圖庫。已依「主圖優先 → SortOrder」排序，且帶 variants。</summary>
    Task<IReadOnlyList<ProductImageDto>> GetImagesAsync(Guid productId);

    /// <summary>詳情頁的適用部位 slug（docs/04 §4 的 <c>bodyParts</c> 是 slug 陣列）。</summary>
    Task<IReadOnlyList<string>> GetBodyPartSlugsAsync(Guid productId);
}

/// <summary>詳情查詢的原始列（JSON 欄位維持字串，由 Handler 解析）。</summary>
public sealed record ProductRow(
    Guid      Id,
    string    Slug,
    string?   Sku,
    string    Name,
    string?   Summary,
    string?   Description,
    string?   FeaturesJson,
    string?   UseCasesJson,
    string?   SpecsJson,
    string?   SizeChartJson,
    string?   ConditionsJson,
    string?   SeoTitle,
    string?   SeoDescription,
    string?   OgImageUrl,
    string?   CategorySlug,
    string?   CategoryName,
    string?   SubCategorySlug,
    string?   SubCategoryName,
    string?   CollectionSlug,
    string?   CollectionName,
    string?   UseCaseImageUrl,
    DateTime? PublishedAt);

public sealed class ProductReadService(IDbConnection db) : IProductReadService
{
    /// <summary>
    /// 公開查詢的基礎條件。三處都必須一致，否則列表數字與 facet 對不上。
    /// 注意 <c>pt.Locale = @locale</c> 是 INNER JOIN 的一部分 —— 缺該語系翻譯的產品
    /// 會整筆消失，這就是語言純度原則（見 Common/LocaleQuery.cs）。
    /// </summary>
    private const string PublishedFrom = """
        FROM   Products p
               INNER JOIN ProductTranslations pt ON pt.ProductId = p.Id AND pt.Locale = @locale
               INNER JOIN Categories  c  ON c.Id  = p.CategoryId  AND c.IsDeleted = 0
               LEFT  JOIN CategoryTranslations   ct  ON ct.CategoryId    = c.Id  AND ct.Locale = @locale
               LEFT  JOIN SubCategories sc          ON sc.Id             = p.SubCategoryId AND sc.IsDeleted = 0
               LEFT  JOIN SubCategoryTranslations sct ON sct.SubCategoryId = sc.Id AND sct.Locale = @locale
               LEFT  JOIN Collections col           ON col.Id            = p.CollectionId
               LEFT  JOIN CollectionTranslations colt ON colt.CollectionId = col.Id AND colt.Locale = @locale
        WHERE  p.IsDeleted = 0 AND p.Status = 1
        """;

    // 分類／系列名稱用 LEFT JOIN 而非 INNER：
    // 產品自己有該語系翻譯、但分類沒有時，**回傳產品並讓 category 為 null**，
    // 而不是把產品整筆藏起來。理由：因分類漏翻而讓產品消失，是不會有人發現的
    // 靜默內容錯誤（此決策記於 CLAUDE.md §7 🟢，待客戶確認）。

    private const string ListSelect = """
        SELECT p.Slug, pt.Name, p.Sku,
               c.Slug AS CategorySlug, ct.Name AS CategoryName,
               sc.Slug AS SubCategorySlug, sct.Name AS SubCategoryName,
               col.Slug AS CollectionSlug, colt.Name AS CollectionName,
               pt.FeaturedBlurb,
               (SELECT TOP 1 m.BlobUrl FROM ProductImages pi
                  INNER JOIN Media m ON m.Id = pi.MediaId
                  WHERE pi.ProductId = p.Id ORDER BY pi.IsPrimary DESC, pi.SortOrder) AS ImageUrl,
               (SELECT TOP 1 m.AltText FROM ProductImages pi
                  INNER JOIN Media m ON m.Id = pi.MediaId
                  WHERE pi.ProductId = p.Id ORDER BY pi.IsPrimary DESC, pi.SortOrder) AS ImageAlt,
               (SELECT TOP 1 m.Id FROM ProductImages pi
                  INNER JOIN Media m ON m.Id = pi.MediaId
                  WHERE pi.ProductId = p.Id ORDER BY pi.IsPrimary DESC, pi.SortOrder) AS ImageMediaId,
               STUFF((SELECT ',' + bp.Slug FROM ProductBodyParts pbp
                        INNER JOIN BodyParts bp ON bp.Id = pbp.BodyPartId
                        WHERE pbp.ProductId = p.Id ORDER BY bp.SortOrder
                        FOR XML PATH('')), 1, 1, '') AS BodyPartCsv
        """;

    private sealed record ListRow(
        string Slug, string Name, string? Sku,
        string? CategorySlug, string? CategoryName,
        string? SubCategorySlug, string? SubCategoryName,
        string? CollectionSlug, string? CollectionName,
        string? FeaturedBlurb, string? ImageUrl, string? ImageAlt, Guid? ImageMediaId, string? BodyPartCsv);

    public async Task<(IReadOnlyList<ProductListItemDto>, int)> GetListAsync(
        ProductFilter filter, string locale, bool? featured, string? sort, int page, int pageSize)
    {
        var p = Params(locale);
        var where = new List<string>();

        if (filter.Category    is not null) { where.Add("c.Slug   = @category");    p.Add("@category",    filter.Category,    DbType.String, size: 120); }
        if (filter.SubCategory is not null) { where.Add("sc.Slug  = @subCategory"); p.Add("@subCategory", filter.SubCategory, DbType.String, size: 120); }
        if (filter.Collection  is not null) { where.Add("col.Slug = @collection");  p.Add("@collection",  filter.Collection,  DbType.String, size: 120); }
        if (filter.BodyPart    is not null)
        {
            where.Add("EXISTS (SELECT 1 FROM ProductBodyParts pbp INNER JOIN BodyParts bp ON bp.Id = pbp.BodyPartId WHERE pbp.ProductId = p.Id AND bp.Slug = @bodyPart)");
            p.Add("@bodyPart", filter.BodyPart, DbType.String, size: 60);
        }
        if (featured == true) where.Add("p.IsFeatured = 1");

        var filterSql = where.Count == 0 ? "" : " AND " + string.Join(" AND ", where);

        var orderBy = sort switch
        {
            "name"       => "pt.Name",
            "collection" => "col.SortOrder, pt.Name",
            _ when featured == true => "p.FeaturedSortOrder, pt.Name",
            "newest"     => "p.PublishedAt DESC, p.CreatedAt DESC",
            _            => "p.SortOrder, pt.Name",
        };

        p.Add("@skip", (page - 1) * pageSize);
        p.Add("@take", pageSize);

        var total = await db.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*) {PublishedFrom}{filterSql}", p);

        var rows = await db.QueryAsync<ListRow>(
            $"{ListSelect} {PublishedFrom}{filterSql} ORDER BY {orderBy} OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY", p);

        var list = rows.AsList();
        var variants = await LoadVariantsAsync(list.Select(r => r.ImageMediaId));
        var items = list.Select(r => ToListItem(r, locale, variants)).ToList();
        return (items, total);
    }

    public async Task<IReadOnlyList<FacetRow>> GetFacetRowsAsync(string locale)
    {
        // ⚠️ **必須 join 翻譯表**，條件要與列表查詢的 PublishedFrom 完全一致。
        //
        // 初版沒 join，理由是「產品是否存在與語系無關」—— 那是錯的。
        // facet 數字對使用者的意思是「點下去會看到幾筆」，而列表因語言純度原則
        // 會濾掉缺該語系翻譯的產品。兩邊條件不一致時，中文站會出現
        // 「膝 16」但格線空無一物的情況，等於數字在騙人。
        //
        // 這個 bug 只有在翻譯不完整時才看得出來，而那正是內容建置期間的常態。
        const string sql = """
            SELECT c.Slug AS CategorySlug,
                   sc.Slug AS SubCategorySlug,
                   col.Slug AS CollectionSlug,
                   STUFF((SELECT ',' + bp.Slug FROM ProductBodyParts pbp
                            INNER JOIN BodyParts bp ON bp.Id = pbp.BodyPartId
                            WHERE pbp.ProductId = p.Id FOR XML PATH('')), 1, 1, '') AS BodyPartCsv
            FROM   Products p
                   INNER JOIN ProductTranslations pt ON pt.ProductId = p.Id AND pt.Locale = @locale
                   INNER JOIN Categories c ON c.Id = p.CategoryId AND c.IsDeleted = 0
                   LEFT  JOIN SubCategories sc ON sc.Id = p.SubCategoryId AND sc.IsDeleted = 0
                   LEFT  JOIN Collections col  ON col.Id = p.CollectionId
            WHERE  p.IsDeleted = 0 AND p.Status = 1
            """;

        var rows = await db.QueryAsync<(string CategorySlug, string? SubCategorySlug, string? CollectionSlug, string? BodyPartCsv)>(sql, Params(locale));
        return rows.Select(r => new FacetRow(r.CategorySlug, r.SubCategorySlug, r.CollectionSlug, Split(r.BodyPartCsv))).ToList();
    }

    private const string DetailSelect = """
        SELECT p.Id, p.Slug, p.Sku, pt.Name, pt.Summary, pt.Description,
               pt.FeaturesJson, pt.UseCasesJson, pt.SpecsJson, pt.SizeChartJson, pt.ConditionsJson,
               pt.SeoTitle, pt.SeoDescription,
               (SELECT BlobUrl FROM Media WHERE Id = pt.OgImageMediaId) AS OgImageUrl,
               c.Slug AS CategorySlug, ct.Name AS CategoryName,
               sc.Slug AS SubCategorySlug, sct.Name AS SubCategoryName,
               col.Slug AS CollectionSlug, colt.Name AS CollectionName,
               (SELECT BlobUrl FROM Media WHERE Id = p.UseCaseImageMediaId) AS UseCaseImageUrl,
               p.PublishedAt
        """;

    public async Task<ProductRow?> GetByPathAsync(string category, string sub, string slug, string locale)
    {
        var p = Params(locale);
        p.Add("@category", category, DbType.String, size: 120);
        p.Add("@sub",      sub,      DbType.String, size: 120);
        p.Add("@slug",     slug,     DbType.String, size: 160);

        // 三段皆列入 WHERE —— 歸屬不符就查無資料，呼叫端回 404。
        // 刻意不做寬鬆比對（例如只認 slug），否則同一個產品會有多個可索引 URL。
        return await db.QueryFirstOrDefaultAsync<ProductRow>(
            $"{DetailSelect} {PublishedFrom} AND c.Slug = @category AND sc.Slug = @sub AND p.Slug = @slug", p);
    }

    public async Task<ProductRow?> GetBySlugAsync(string slug, string locale)
    {
        var p = Params(locale);
        p.Add("@slug", slug, DbType.String, size: 160);
        return await db.QueryFirstOrDefaultAsync<ProductRow>(
            $"{DetailSelect} {PublishedFrom} AND p.Slug = @slug", p);
    }

    /// <summary>
    /// 相關產品：先取人工指定的 <c>ProductRelated</c>；不足時依
    /// 同 SubCategory → 同 Category → 同 BodyPart 的順序遞補（docs/05 §3.2）。
    /// </summary>
    public async Task<IReadOnlyList<ProductListItemDto>> GetRelatedAsync(Guid productId, string locale, int take)
    {
        var p = Params(locale);
        p.Add("@pid", productId);
        p.Add("@take", take);

        const string manual = """
            AND EXISTS (SELECT 1 FROM ProductRelated pr WHERE pr.ProductId = @pid AND pr.RelatedProductId = p.Id)
            """;

        var rows = (await db.QueryAsync<ListRow>(
            $"{ListSelect} {PublishedFrom} {manual} ORDER BY (SELECT pr.SortOrder FROM ProductRelated pr WHERE pr.ProductId = @pid AND pr.RelatedProductId = p.Id)", p)).ToList();

        if (rows.Count > 0)
        {
            var v = await LoadVariantsAsync(rows.Select(r => r.ImageMediaId));
            return rows.Select(r => ToListItem(r, locale, v)).ToList();
        }

        // 自動遞補。ORDER BY 的三段就是規格的優先序。
        const string auto = """
            AND p.Id <> @pid
            AND (   p.SubCategoryId = (SELECT SubCategoryId FROM Products WHERE Id = @pid)
                 OR p.CategoryId    = (SELECT CategoryId    FROM Products WHERE Id = @pid)
                 OR EXISTS (SELECT 1 FROM ProductBodyParts a
                            INNER JOIN ProductBodyParts b ON b.BodyPartId = a.BodyPartId
                            WHERE a.ProductId = @pid AND b.ProductId = p.Id))
            """;

        const string autoOrder = """
            ORDER BY CASE WHEN p.SubCategoryId = (SELECT SubCategoryId FROM Products WHERE Id = @pid) THEN 0
                          WHEN p.CategoryId    = (SELECT CategoryId    FROM Products WHERE Id = @pid) THEN 1
                          ELSE 2 END,
                     p.SortOrder, pt.Name
            OFFSET 0 ROWS FETCH NEXT @take ROWS ONLY
            """;

        var fallback = (await db.QueryAsync<ListRow>($"{ListSelect} {PublishedFrom} {auto} {autoOrder}", p)).AsList();
        var fv = await LoadVariantsAsync(fallback.Select(r => r.ImageMediaId));
        return fallback.Select(r => ToListItem(r, locale, fv)).ToList();
    }

    /// <summary>
    /// 詳情頁圖庫。列表卡只取一張主圖（在 <see cref="ListSelect"/> 的子查詢裡），
    /// 詳情要全部，所以另外一支查詢 —— 兩者的排序規則必須一致，
    /// 否則列表卡和詳情頁第一張圖會是不同的圖。
    /// </summary>
    public async Task<IReadOnlyList<ProductImageDto>> GetImagesAsync(Guid productId)
    {
        var rows = (await db.QueryAsync<(Guid MediaId, string BlobUrl, string? AltText, bool IsPrimary)>(
            """
            SELECT pi.MediaId, m.BlobUrl, m.AltText, pi.IsPrimary
            FROM   ProductImages pi
                   INNER JOIN Media m ON m.Id = pi.MediaId
            WHERE  pi.ProductId = @pid
            ORDER  BY pi.IsPrimary DESC, pi.SortOrder
            """, new { pid = productId })).AsList();

        if (rows.Count == 0) return [];

        var variants = await LoadVariantsAsync(rows.Select(r => (Guid?)r.MediaId));

        return rows.Select(r => new ProductImageDto(
            r.BlobUrl, r.AltText, r.IsPrimary, variants.GetValueOrDefault(r.MediaId))).ToList();
    }

    public async Task<IReadOnlyList<string>> GetBodyPartSlugsAsync(Guid productId)
    {
        var rows = await db.QueryAsync<string>(
            """
            SELECT bp.Slug
            FROM   ProductBodyParts pbp
                   INNER JOIN BodyParts bp ON bp.Id = pbp.BodyPartId
            WHERE  pbp.ProductId = @pid
            ORDER  BY bp.SortOrder
            """, new { pid = productId });

        return rows.AsList();
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    /// <summary>⚠️ locale 必須以 AnsiString 送出（欄位是 varchar(10)），否則索引失效。</summary>
    private static DynamicParameters Params(string locale)
    {
        var p = new DynamicParameters();
        p.Add("@locale", locale, DbType.AnsiString, size: 10);
        return p;
    }

    private Task<Dictionary<Guid, ImageVariantDto[]>> LoadVariantsAsync(IEnumerable<Guid?> mediaIds) =>
        MediaVariantLoader.LoadAsync(db, mediaIds);

    private static string[] Split(string? csv) =>
        string.IsNullOrEmpty(csv) ? [] : csv.Split(',', StringSplitOptions.RemoveEmptyEntries);

    private static ProductListItemDto ToListItem(
        ListRow r, string locale, Dictionary<Guid, ImageVariantDto[]> variants) => new(
        r.Slug,
        r.Name,
        r.Sku,
        Pair(r.CategorySlug, r.CategoryName),
        Pair(r.SubCategorySlug, r.SubCategoryName),
        Pair(r.CollectionSlug, r.CollectionName),
        Split(r.BodyPartCsv),
        r.ImageUrl is null ? null : new MediaRefDto(
            r.ImageUrl, r.ImageAlt,
            r.ImageMediaId is { } mid ? variants.GetValueOrDefault(mid) : null),
        r.FeaturedBlurb,
        ProductUrl(locale, r.CategorySlug, r.SubCategorySlug, r.Slug));

    private static SlugName? Pair(string? slug, string? name) =>
        slug is null ? null : new SlugName(slug, name ?? slug);

    public static string ProductUrl(string locale, string? category, string? sub, string slug) =>
        category is null || sub is null
            ? $"/{locale}/products/{slug}"
            : $"/{locale}/products/{category}/{sub}/{slug}";
}
