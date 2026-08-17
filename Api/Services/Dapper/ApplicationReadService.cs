using System.Data;
using Dapper;
using EuniceMed.Api.Models.Dtos;

namespace EuniceMed.Api.Services.Dapper;

public interface IApplicationReadService
{
    Task<IReadOnlyList<ApplicationListItemDto>> GetListAsync(string locale, byte? type);
    Task<IReadOnlyList<BodyMapItemDto>>         GetBodyMapAsync(string locale);
    Task<ApplicationRow?>                       GetAsync(string slug, string locale);
    Task<IReadOnlyList<ApplicationRefDto>>      GetSiblingsAsync(Guid excludeId, byte type, string locale);

    /// <summary>推薦產品：先用人工指定的 <c>ProductApplication</c>，沒有才退回部位比對。</summary>
    Task<IReadOnlyList<ProductListItemDto>> GetRecommendedProductsAsync(
        Guid applicationId, string locale, int take);
}

public sealed record ApplicationRow(
    Guid    Id,
    string  Slug,
    byte    Type,
    string  Name,
    string? Lead,
    string? Body,
    string? StatsJson,
    string? ConcernsJson,
    string? SupportLevelsJson,
    string? HowToJson,
    string? Disclaimer,
    string? SeoTitle,
    string? SeoDescription,
    string? HeroUrl,
    string? HeroAlt,
    Guid?   HeroMediaId,
    string? FittingUrl,
    string? FittingAlt,
    Guid?   FittingMediaId,
    int     ProductCount);

public sealed class ApplicationReadService(IDbConnection db) : IApplicationReadService
{
    private static DynamicParameters P(string locale)
    {
        var p = new DynamicParameters();
        p.Add("@locale", locale, DbType.AnsiString, size: 10);
        return p;
    }

    /// <summary>
    /// 產品數 / 推薦產品的歸屬判定。
    ///
    /// <para>
    /// 兩條來源取聯集：編輯者在 <c>ProductApplications</c> 手動掛的，
    /// 以及應用方案有指定 <c>BodyPartId</c> 時該部位底下的產品。
    /// 只認前者的話，149 筆匯入產品在編輯者一筆一筆掛完之前，
    /// 每個部位頁都會是「0 products」——那正是上線初期的狀態。
    /// </para>
    ///
    /// <para>
    /// 條件與產品列表一致（未刪除、已發布、**有該語系翻譯**），
    /// 否則中文站會出現數字與實際格線對不上的情形。
    /// </para>
    /// </summary>
    private const string BelongsTo = """
        FROM   Products p
               INNER JOIN ProductTranslations pt ON pt.ProductId = p.Id AND pt.Locale = @locale
        WHERE  p.IsDeleted = 0 AND p.Status = 1
          AND (EXISTS (SELECT 1 FROM ProductApplications pa
                        WHERE pa.ProductId = p.Id AND pa.ApplicationId = a.Id)
            OR (a.BodyPartId IS NOT NULL
                AND EXISTS (SELECT 1 FROM ProductBodyParts pbp
                             WHERE pbp.ProductId = p.Id AND pbp.BodyPartId = a.BodyPartId)))
        """;

    private const string CountExpr = $"(SELECT COUNT(*) {BelongsTo})";

    private sealed record ListRow(
        string Slug, byte Type, string Name, string? Lead,
        string? ImageUrl, string? ImageAlt, Guid? ImageMediaId, int ProductCount);

    public async Task<IReadOnlyList<ApplicationListItemDto>> GetListAsync(string locale, byte? type)
    {
        var p = P(locale);
        var filter = "";
        if (type is { } t) { filter = " AND a.Type = @type"; p.Add("@type", t, DbType.Byte); }

        var rows = (await db.QueryAsync<ListRow>($"""
            SELECT a.Slug, a.Type, at2.Name, at2.Lead,
                   (SELECT BlobUrl FROM Media WHERE Id = COALESCE(a.CardImageMediaId, a.ImageMediaId)) AS ImageUrl,
                   (SELECT AltText FROM Media WHERE Id = COALESCE(a.CardImageMediaId, a.ImageMediaId)) AS ImageAlt,
                   COALESCE(a.CardImageMediaId, a.ImageMediaId) AS ImageMediaId,
                   {CountExpr} AS ProductCount
            FROM   Applications a
                   INNER JOIN ApplicationTranslations at2 ON at2.ApplicationId = a.Id AND at2.Locale = @locale
            WHERE  a.IsDeleted = 0 AND a.Status = 1{filter}
            ORDER  BY a.Type, a.SortOrder
            """, p)).AsList();

        var variants = await MediaVariantLoader.LoadAsync(db, rows.Select(r => r.ImageMediaId));

        return rows.Select(r => new ApplicationListItemDto(
            r.Slug, TypeName(r.Type), r.Name, r.Lead,
            MediaVariantLoader.Ref(r.ImageUrl, r.ImageAlt, r.ImageMediaId, variants),
            r.ProductCount, Url(locale, r.Slug))).ToList();
    }

    public async Task<IReadOnlyList<BodyMapItemDto>> GetBodyMapAsync(string locale)
    {
        var rows = await db.QueryAsync<(string Slug, string Name, string? MapCopy, string? MapCtaLabel,
                                        string? MapPositionJson, int ProductCount)>($"""
            SELECT a.Slug, at2.Name, at2.MapCopy, at2.MapCtaLabel, a.MapPositionJson,
                   {CountExpr} AS ProductCount
            FROM   Applications a
                   INNER JOIN ApplicationTranslations at2 ON at2.ApplicationId = a.Id AND at2.Locale = @locale
            WHERE  a.IsDeleted = 0 AND a.Status = 1 AND a.ShowOnBodyMap = 1
            ORDER  BY a.SortOrder
            """, P(locale));

        return rows.Select(r => new BodyMapItemDto(
            r.Slug, r.Name, r.ProductCount, r.MapCopy, r.MapCtaLabel,
            Common.JsonField.Parse(r.MapPositionJson), Url(locale, r.Slug))).ToList();
    }

    public async Task<ApplicationRow?> GetAsync(string slug, string locale)
    {
        var p = P(locale);
        p.Add("@slug", slug, DbType.String, size: 120);

        return await db.QueryFirstOrDefaultAsync<ApplicationRow>($"""
            SELECT a.Id, a.Slug, a.Type, at2.Name, at2.Lead, at2.Body,
                   at2.StatsJson, at2.ConcernsJson, at2.SupportLevelsJson, at2.HowToJson,
                   at2.Disclaimer, at2.SeoTitle, at2.SeoDescription,
                   (SELECT BlobUrl FROM Media WHERE Id = a.ImageMediaId)        AS HeroUrl,
                   (SELECT AltText FROM Media WHERE Id = a.ImageMediaId)        AS HeroAlt,
                   a.ImageMediaId                                               AS HeroMediaId,
                   (SELECT BlobUrl FROM Media WHERE Id = a.FittingImageMediaId) AS FittingUrl,
                   (SELECT AltText FROM Media WHERE Id = a.FittingImageMediaId) AS FittingAlt,
                   a.FittingImageMediaId                                        AS FittingMediaId,
                   {CountExpr} AS ProductCount
            FROM   Applications a
                   INNER JOIN ApplicationTranslations at2 ON at2.ApplicationId = a.Id AND at2.Locale = @locale
            WHERE  a.IsDeleted = 0 AND a.Status = 1 AND a.Slug = @slug
            """, p);
    }

    public async Task<IReadOnlyList<ApplicationRefDto>> GetSiblingsAsync(
        Guid excludeId, byte type, string locale)
    {
        var p = P(locale);
        p.Add("@id",   excludeId);
        p.Add("@type", type, DbType.Byte);

        var rows = await db.QueryAsync<(string Slug, string Name, int ProductCount)>($"""
            SELECT a.Slug, at2.Name, {CountExpr} AS ProductCount
            FROM   Applications a
                   INNER JOIN ApplicationTranslations at2 ON at2.ApplicationId = a.Id AND at2.Locale = @locale
            WHERE  a.IsDeleted = 0 AND a.Status = 1 AND a.Type = @type AND a.Id <> @id
            ORDER  BY a.SortOrder
            """, p);

        return rows.Select(r => new ApplicationRefDto(r.Slug, r.Name, r.ProductCount, Url(locale, r.Slug))).ToList();
    }

    public async Task<IReadOnlyList<ProductListItemDto>> GetRecommendedProductsAsync(
        Guid applicationId, string locale, int take)
    {
        var p = P(locale);
        p.Add("@appId", applicationId);
        p.Add("@take",  take);

        // 人工指定優先，且**只要有一筆就完全採用人工結果** ——
        // 與自動遞補混在一起會讓編輯者的排序被無關產品插隊。
        var manual = await QueryProductsAsync(locale, """
            AND EXISTS (SELECT 1 FROM ProductApplications pa
                         WHERE pa.ProductId = p.Id AND pa.ApplicationId = @appId)
            ORDER BY (SELECT pa.SortOrder FROM ProductApplications pa
                       WHERE pa.ProductId = p.Id AND pa.ApplicationId = @appId), pt.Name
            OFFSET 0 ROWS FETCH NEXT @take ROWS ONLY
            """, p);

        if (manual.Count > 0) return manual;

        return await QueryProductsAsync(locale, """
            AND EXISTS (SELECT 1 FROM ProductBodyParts pbp
                        INNER JOIN Applications a2 ON a2.BodyPartId = pbp.BodyPartId
                         WHERE pbp.ProductId = p.Id AND a2.Id = @appId)
            ORDER BY p.SortOrder, pt.Name
            OFFSET 0 ROWS FETCH NEXT @take ROWS ONLY
            """, p);
    }

    private sealed record ProdRow(
        string Slug, string Name, string? Sku,
        string? CategorySlug, string? CategoryName,
        string? SubCategorySlug, string? SubCategoryName,
        string? CollectionSlug, string? CollectionName,
        string? FeaturedBlurb, string? ImageUrl, string? ImageAlt, Guid? ImageMediaId);

    private async Task<IReadOnlyList<ProductListItemDto>> QueryProductsAsync(
        string locale, string tail, DynamicParameters p)
    {
        var rows = (await db.QueryAsync<ProdRow>($"""
            SELECT p.Slug, pt.Name, p.Sku,
                   c.Slug AS CategorySlug, ct.Name AS CategoryName,
                   sc.Slug AS SubCategorySlug, sct.Name AS SubCategoryName,
                   col.Slug AS CollectionSlug, colt.Name AS CollectionName,
                   pt.FeaturedBlurb,
                   (SELECT TOP 1 m.BlobUrl FROM ProductImages pi INNER JOIN Media m ON m.Id = pi.MediaId
                      WHERE pi.ProductId = p.Id ORDER BY pi.IsPrimary DESC, pi.SortOrder) AS ImageUrl,
                   (SELECT TOP 1 m.AltText FROM ProductImages pi INNER JOIN Media m ON m.Id = pi.MediaId
                      WHERE pi.ProductId = p.Id ORDER BY pi.IsPrimary DESC, pi.SortOrder) AS ImageAlt,
                   (SELECT TOP 1 m.Id FROM ProductImages pi INNER JOIN Media m ON m.Id = pi.MediaId
                      WHERE pi.ProductId = p.Id ORDER BY pi.IsPrimary DESC, pi.SortOrder) AS ImageMediaId
            FROM   Products p
                   INNER JOIN ProductTranslations pt ON pt.ProductId = p.Id AND pt.Locale = @locale
                   INNER JOIN Categories c ON c.Id = p.CategoryId AND c.IsDeleted = 0
                   LEFT  JOIN CategoryTranslations ct ON ct.CategoryId = c.Id AND ct.Locale = @locale
                   LEFT  JOIN SubCategories sc ON sc.Id = p.SubCategoryId AND sc.IsDeleted = 0
                   LEFT  JOIN SubCategoryTranslations sct ON sct.SubCategoryId = sc.Id AND sct.Locale = @locale
                   LEFT  JOIN Collections col ON col.Id = p.CollectionId
                   LEFT  JOIN CollectionTranslations colt ON colt.CollectionId = col.Id AND colt.Locale = @locale
            WHERE  p.IsDeleted = 0 AND p.Status = 1
            {tail}
            """, p)).AsList();

        var variants = await MediaVariantLoader.LoadAsync(db, rows.Select(r => r.ImageMediaId));

        return rows.Select(r => new ProductListItemDto(
            r.Slug, r.Name, r.Sku,
            Pair(r.CategorySlug, r.CategoryName),
            Pair(r.SubCategorySlug, r.SubCategoryName),
            Pair(r.CollectionSlug, r.CollectionName),
            [],
            MediaVariantLoader.Ref(r.ImageUrl, r.ImageAlt, r.ImageMediaId, variants),
            r.FeaturedBlurb,
            ProductReadService.ProductUrl(locale, r.CategorySlug, r.SubCategorySlug, r.Slug))).ToList();
    }

    private static SlugName? Pair(string? slug, string? name) =>
        slug is null ? null : new SlugName(slug, name ?? slug);

    public static string TypeName(byte type) =>
        type == Models.Entities.ApplicationType.SpecialCare ? "special-care" : "body-part";

    public static byte? ParseType(string? value) => value?.ToLowerInvariant() switch
    {
        "body-part"    => Models.Entities.ApplicationType.BodyPart,
        "special-care" => Models.Entities.ApplicationType.SpecialCare,
        _              => null,
    };

    private static string Url(string locale, string slug) => $"/{locale}/applications/{slug}";
}
