using System.Data;
using Dapper;
using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Dtos;

namespace EuniceMed.Api.Services.Dapper;

public interface ITaxonomyReadService
{
    Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(string locale, bool includeSubCategories);
    Task<CategoryDto?> GetCategoryAsync(string slug, string locale);
    Task<IReadOnlyList<SubCategoryRefDto>> GetSubCategoriesAsync(string locale, string? categorySlug);
    Task<CategoryDto?> GetSubCategoryAsync(string categorySlug, string subSlug, string locale);
    Task<IReadOnlyList<CertificationDto>> GetCertificationsAsync(string locale);

    /// <summary>facet 標籤用的 slug → name 對照（依語系）。</summary>
    Task<FacetLabels> GetFacetLabelsAsync(string locale);
}

public sealed record FacetLabels(
    IReadOnlyDictionary<string, string> Categories,
    IReadOnlyDictionary<string, string> SubCategories,
    IReadOnlyDictionary<string, string> Collections,
    IReadOnlyDictionary<string, string> BodyParts);

public sealed class TaxonomyReadService(IDbConnection db) : ITaxonomyReadService
{
    private static DynamicParameters P(string locale)
    {
        var p = new DynamicParameters();
        p.Add("@locale", locale, DbType.AnsiString, size: 10);
        return p;
    }

    private sealed record CatRow(
        string Slug, string Name, string? Description,
        Guid? ImageMediaId, string? ImageUrl, string? ImageAlt,
        Guid? HeroMediaId, string? HeroUrl, string? HeroAlt,
        string? StatsJson, string? SupportLevelsJson, string? SeoTitle, string? SeoDescription);

    private const string CatSelect = """
        SELECT c.Slug, ct.Name, ct.Description,
               c.ImageMediaId,
               (SELECT BlobUrl FROM Media WHERE Id = c.ImageMediaId) AS ImageUrl,
               (SELECT AltText FROM Media WHERE Id = c.ImageMediaId) AS ImageAlt,
               c.HeroImageMediaId AS HeroMediaId,
               (SELECT BlobUrl FROM Media WHERE Id = c.HeroImageMediaId) AS HeroUrl,
               (SELECT AltText FROM Media WHERE Id = c.HeroImageMediaId) AS HeroAlt,
               ct.StatsJson, ct.SupportLevelsJson, ct.SeoTitle, ct.SeoDescription
        FROM   Categories c
               INNER JOIN CategoryTranslations ct ON ct.CategoryId = c.Id AND ct.Locale = @locale
        WHERE  c.IsDeleted = 0
        """;

    public async Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(string locale, bool includeSubCategories)
    {
        var rows = (await db.QueryAsync<CatRow>($"{CatSelect} ORDER BY c.SortOrder", P(locale))).ToList();
        if (rows.Count == 0) return [];

        var subs = includeSubCategories
            ? await SubCategoryRefsByCategoryAsync(locale)
            : new Dictionary<string, SubCategoryRefDto[]>();

        var variants = await VariantsAsync(rows);

        return rows.Select(r => ToDto(r, subs.GetValueOrDefault(r.Slug, []), variants)).ToList();
    }

    public async Task<CategoryDto?> GetCategoryAsync(string slug, string locale)
    {
        var p = P(locale);
        p.Add("@slug", slug, DbType.String, size: 120);

        var row = await db.QueryFirstOrDefaultAsync<CatRow>($"{CatSelect} AND c.Slug = @slug", p);
        if (row is null) return null;

        var subs = await SubCategoryRefsByCategoryAsync(locale);
        return ToDto(row, subs.GetValueOrDefault(slug, []), await VariantsAsync([row]));
    }

    public async Task<IReadOnlyList<SubCategoryRefDto>> GetSubCategoriesAsync(string locale, string? categorySlug)
    {
        var p = P(locale);
        var filter = "";
        if (categorySlug is not null)
        {
            filter = " AND c.Slug = @category";
            p.Add("@category", categorySlug, DbType.String, size: 120);
        }

        var rows = await db.QueryAsync<SubCategoryRefDto>($"""
            SELECT sc.Slug, sct.Name,
                   (SELECT COUNT(*) FROM Products pr
                      WHERE pr.SubCategoryId = sc.Id AND pr.IsDeleted = 0 AND pr.Status = 1) AS Count
            FROM   SubCategories sc
                   INNER JOIN SubCategoryTranslations sct ON sct.SubCategoryId = sc.Id AND sct.Locale = @locale
                   INNER JOIN Categories c ON c.Id = sc.CategoryId AND c.IsDeleted = 0
            WHERE  sc.IsDeleted = 0 AND sc.Status = 1{filter}
            ORDER  BY c.SortOrder, sc.SortOrder
            """, p);

        return rows.ToList();
    }

    public async Task<CategoryDto?> GetSubCategoryAsync(string categorySlug, string subSlug, string locale)
    {
        var p = P(locale);
        p.Add("@category", categorySlug, DbType.String, size: 120);
        p.Add("@sub",      subSlug,      DbType.String, size: 120);

        // 與產品詳情一樣驗證歸屬：category 與 sub 不相符即查無資料 → 404
        var row = await db.QueryFirstOrDefaultAsync<CatRow>("""
            SELECT sc.Slug, sct.Name, sct.Description,
                   sc.ImageMediaId,
                   (SELECT BlobUrl FROM Media WHERE Id = sc.ImageMediaId) AS ImageUrl,
                   (SELECT AltText FROM Media WHERE Id = sc.ImageMediaId) AS ImageAlt,
                   sc.HeroImageMediaId AS HeroMediaId,
                   (SELECT BlobUrl FROM Media WHERE Id = sc.HeroImageMediaId) AS HeroUrl,
                   (SELECT AltText FROM Media WHERE Id = sc.HeroImageMediaId) AS HeroAlt,
                   sct.StatsJson, CAST(NULL AS nvarchar(max)) AS SupportLevelsJson,
                   sct.SeoTitle, sct.SeoDescription
            FROM   SubCategories sc
                   INNER JOIN SubCategoryTranslations sct ON sct.SubCategoryId = sc.Id AND sct.Locale = @locale
                   INNER JOIN Categories c ON c.Id = sc.CategoryId AND c.IsDeleted = 0
            WHERE  sc.IsDeleted = 0 AND sc.Status = 1 AND c.Slug = @category AND sc.Slug = @sub
            """, p);

        return row is null ? null : ToDto(row, [], await VariantsAsync([row]));
    }

    public async Task<IReadOnlyList<CertificationDto>> GetCertificationsAsync(string locale)
    {
        var rows = await db.QueryAsync<CertRow>("""
            SELECT ce.Slug, ce.Mark, cet.SubLabel, cet.Description,
                   (SELECT BlobUrl FROM Media WHERE Id = ce.LogoMediaId) AS LogoUrl,
                   (SELECT AltText FROM Media WHERE Id = ce.LogoMediaId) AS LogoAlt
            FROM   Certifications ce
                   INNER JOIN CertificationTranslations cet
                       ON cet.CertificationId = ce.Id AND cet.Locale = @locale
            WHERE  ce.Status = 1
            ORDER  BY ce.SortOrder
            """, P(locale));

        return rows.Select(r => new CertificationDto(
            r.Slug, r.Mark, r.SubLabel, r.Description,
            r.LogoUrl is null ? null : new MediaRefDto(r.LogoUrl, r.LogoAlt))).ToList();
    }

    private sealed record CertRow(string Slug, string Mark, string? SubLabel, string? Description,
                                  string? LogoUrl, string? LogoAlt);

    public async Task<FacetLabels> GetFacetLabelsAsync(string locale)
    {
        // 一次往返取四組標籤，避免 facet 折算時逐項查名稱
        using var multi = await db.QueryMultipleAsync("""
            SELECT c.Slug, ct.Name FROM Categories c
              INNER JOIN CategoryTranslations ct ON ct.CategoryId = c.Id AND ct.Locale = @locale
              WHERE c.IsDeleted = 0;

            SELECT sc.Slug, sct.Name FROM SubCategories sc
              INNER JOIN SubCategoryTranslations sct ON sct.SubCategoryId = sc.Id AND sct.Locale = @locale
              WHERE sc.IsDeleted = 0;

            SELECT col.Slug, colt.Name FROM Collections col
              INNER JOIN CollectionTranslations colt ON colt.CollectionId = col.Id AND colt.Locale = @locale;

            SELECT Slug, CASE WHEN @locale = 'zh-TW' THEN NameZhTw ELSE NameEn END AS Name FROM BodyParts;
            """, P(locale));

        async Task<Dictionary<string, string>> Read() =>
            (await multi.ReadAsync<(string Slug, string Name)>())
                .ToDictionary(x => x.Slug, x => x.Name);

        return new FacetLabels(await Read(), await Read(), await Read(), await Read());
    }

    private Task<Dictionary<Guid, ImageVariantDto[]>> VariantsAsync(IEnumerable<CatRow> rows) =>
        MediaVariantLoader.LoadAsync(db, rows.SelectMany(r => new[] { r.ImageMediaId, r.HeroMediaId }));

    private static CategoryDto ToDto(
        CatRow r, SubCategoryRefDto[] subs, Dictionary<Guid, ImageVariantDto[]> variants) => new(
        r.Slug, r.Name, r.Description,
        MediaVariantLoader.Ref(r.ImageUrl, r.ImageAlt, r.ImageMediaId, variants),
        MediaVariantLoader.Ref(r.HeroUrl, r.HeroAlt, r.HeroMediaId, variants),
        JsonField.Parse(r.StatsJson),
        JsonField.Parse(r.SupportLevelsJson),
        subs,
        new SeoDto(r.SeoTitle, r.SeoDescription, null));

    private async Task<Dictionary<string, SubCategoryRefDto[]>> SubCategoryRefsByCategoryAsync(string locale)
    {
        var rows = await db.QueryAsync<(string CategorySlug, string Slug, string Name, int Count)>("""
            SELECT c.Slug AS CategorySlug, sc.Slug, sct.Name,
                   (SELECT COUNT(*) FROM Products pr
                      WHERE pr.SubCategoryId = sc.Id AND pr.IsDeleted = 0 AND pr.Status = 1) AS Count
            FROM   SubCategories sc
                   INNER JOIN SubCategoryTranslations sct ON sct.SubCategoryId = sc.Id AND sct.Locale = @locale
                   INNER JOIN Categories c ON c.Id = sc.CategoryId AND c.IsDeleted = 0
            WHERE  sc.IsDeleted = 0 AND sc.Status = 1
            ORDER  BY sc.SortOrder
            """, P(locale));

        return rows.GroupBy(r => r.CategorySlug)
                   .ToDictionary(g => g.Key,
                                 g => g.Select(r => new SubCategoryRefDto(r.Slug, r.Name, r.Count)).ToArray());
    }
}
