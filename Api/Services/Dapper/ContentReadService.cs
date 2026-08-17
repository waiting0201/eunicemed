using System.Data;
using Dapper;
using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Dtos;

namespace EuniceMed.Api.Services.Dapper;

public interface IContentReadService
{
    Task<IReadOnlyList<FaqDto>>       GetFaqsAsync(string locale, string? category);
    Task<IReadOnlyList<FacetCount>>   GetFaqCategoriesAsync(string locale);

    Task<IReadOnlyList<DownloadDto>>  GetDownloadsAsync(string locale, byte? type, string? productSlug);
    Task<IReadOnlyList<FacetCount>>   GetDownloadFacetsAsync(string locale, string? productSlug);

    Task<SalesLocationsDto>           GetSalesLocationsAsync(string locale);
}

public sealed class ContentReadService(IDbConnection db) : IContentReadService
{
    private static DynamicParameters P(string locale)
    {
        var p = new DynamicParameters();
        p.Add("@locale", locale, DbType.AnsiString, size: 10);
        return p;
    }

    // ── FAQ ────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<FaqDto>> GetFaqsAsync(string locale, string? category)
    {
        var p = P(locale);
        var filter = "";
        if (category is not null) { filter = " AND fc.Slug = @category"; p.Add("@category", category, DbType.String, size: 80); }

        var rows = await db.QueryAsync<(Guid Id, string Question, string Answer, string CategorySlug, string? CategoryName)>($"""
            SELECT f.Id, ft.Question, ft.Answer, fc.Slug AS CategorySlug, fct.Name AS CategoryName
            FROM   Faqs f
                   INNER JOIN FaqTranslations ft ON ft.FaqId = f.Id AND ft.Locale = @locale
                   INNER JOIN FaqCategories fc ON fc.Id = f.FaqCategoryId AND fc.Status = 1
                   LEFT  JOIN FaqCategoryTranslations fct
                          ON fct.FaqCategoryId = fc.Id AND fct.Locale = @locale
            WHERE  f.Status = 1{filter}
            ORDER  BY fc.SortOrder, f.SortOrder
            """, p);

        return rows.Select(r => new FaqDto(r.Id, r.Question, r.Answer,
            new SlugName(r.CategorySlug, r.CategoryName ?? r.CategorySlug))).ToList();
    }

    /// <summary>
    /// FAQ 只有一個 facet 維度，「不受同維度篩選影響」因此等於**完全忽略 category 篩選**，
    /// 一句 GROUP BY 就夠 —— 不需要 FacetFolder 那套多維折算。
    /// </summary>
    public async Task<IReadOnlyList<FacetCount>> GetFaqCategoriesAsync(string locale)
    {
        var rows = await db.QueryAsync<FacetCount>("""
            SELECT fc.Slug, fct.Name AS Label,
                   (SELECT COUNT(*) FROM Faqs f
                      INNER JOIN FaqTranslations ft ON ft.FaqId = f.Id AND ft.Locale = @locale
                      WHERE f.FaqCategoryId = fc.Id AND f.Status = 1) AS Count
            FROM   FaqCategories fc
                   INNER JOIN FaqCategoryTranslations fct
                          ON fct.FaqCategoryId = fc.Id AND fct.Locale = @locale
            WHERE  fc.Status = 1
            ORDER  BY fc.SortOrder
            """, P(locale));

        return rows.ToList();
    }

    // ── 下載 ───────────────────────────────────────────────────────────────

    private sealed record DlRow(
        Guid Id, string Title, string? Description, byte Type,
        string FileLocale, string FileName, long SizeBytes, string BlobUrl);

    public async Task<IReadOnlyList<DownloadDto>> GetDownloadsAsync(string locale, byte? type, string? productSlug)
    {
        var p = P(locale);
        var (filter, _) = DownloadFilters(p, type, productSlug);

        var rows = await db.QueryAsync<DlRow>($"""
            SELECT d.Id, dt.Title, dt.Description, d.Type, d.FileLocale,
                   m.FileName, m.SizeBytes, m.BlobUrl
            FROM   Downloads d
                   INNER JOIN DownloadTranslations dt ON dt.DownloadId = d.Id AND dt.Locale = @locale
                   INNER JOIN Media m ON m.Id = d.MediaId
            WHERE  d.Status = 1{filter}
            ORDER  BY d.Type, d.SortOrder, dt.Title
            """, p);

        return rows.Select(r => new DownloadDto(
            r.Id, r.Title, r.Description, TypeName(r.Type),
            r.FileLocale.ToUpperInvariant(), Extension(r.FileName), r.SizeBytes, r.BlobUrl)).ToList();
    }

    public async Task<IReadOnlyList<FacetCount>> GetDownloadFacetsAsync(string locale, string? productSlug)
    {
        var p = P(locale);
        // 忽略 type 篩選（同維度），但保留 productSlug（另一個維度）。
        var (filter, _) = DownloadFilters(p, type: null, productSlug);

        var rows = (await db.QueryAsync<(byte Type, int Count)>($"""
            SELECT d.Type, COUNT(*) AS Count
            FROM   Downloads d
                   INNER JOIN DownloadTranslations dt ON dt.DownloadId = d.Id AND dt.Locale = @locale
                   INNER JOIN Media m ON m.Id = d.MediaId
            WHERE  d.Status = 1{filter}
            GROUP  BY d.Type
            ORDER  BY d.Type
            """, p)).AsList();

        // label 用 slug 本身：三種型態的中英顯示字在前端字典裡，
        // 這裡回 slug 讓前端決定，避免把 UI 文案埋進 API。
        return rows.Select(r => new FacetCount(TypeName(r.Type), TypeName(r.Type), r.Count)).ToList();
    }

    private static (string Sql, bool Any) DownloadFilters(
        DynamicParameters p, byte? type, string? productSlug)
    {
        var where = new List<string>();

        if (type is { } t) { where.Add("d.Type = @type"); p.Add("@type", t, DbType.Byte); }

        if (productSlug is not null)
        {
            where.Add("""
                EXISTS (SELECT 1 FROM ProductDownloads pd INNER JOIN Products pr ON pr.Id = pd.ProductId
                         WHERE pd.DownloadId = d.Id AND pr.Slug = @productSlug AND pr.IsDeleted = 0)
                """);
            p.Add("@productSlug", productSlug, DbType.String, size: 160);
        }

        return (where.Count == 0 ? "" : " AND " + string.Join(" AND ", where), where.Count > 0);
    }

    public static string TypeName(byte type) => type switch
    {
        Models.Entities.DownloadType.Manual      => "manual",
        Models.Entities.DownloadType.Certificate => "certificate",
        _                                        => "catalog",
    };

    public static byte? ParseType(string? value) => value?.ToLowerInvariant() switch
    {
        "catalog"     => Models.Entities.DownloadType.Catalog,
        "manual"      => Models.Entities.DownloadType.Manual,
        "certificate" => Models.Entities.DownloadType.Certificate,
        _             => null,
    };

    /// <summary>副檔名取自檔名而非 MIME —— 清單顯示的是 `PDF`，那是使用者看到的東西。</summary>
    private static string Extension(string fileName)
    {
        var ext = Path.GetExtension(fileName);
        return ext.Length <= 1 ? "FILE" : ext[1..].ToUpperInvariant();
    }

    // ── 銷售據點 ───────────────────────────────────────────────────────────

    public async Task<SalesLocationsDto> GetSalesLocationsAsync(string locale)
    {
        var rows = (await db.QueryAsync<(byte LocationType, string CountryCode, string Name,
                                         string? Address, string? RegionLabel, string? Note,
                                         string? Phone, string? WebsiteUrl)>("""
            SELECT s.LocationType, s.CountryCode, st.Name, st.Address, st.RegionLabel, st.Note,
                   s.Phone, s.WebsiteUrl
            FROM   SalesLocations s
                   INNER JOIN SalesLocationTranslations st
                          ON st.SalesLocationId = s.Id AND st.Locale = @locale
            WHERE  s.Status = 1
            ORDER  BY s.LocationType, s.SortOrder, st.Name
            """, P(locale))).AsList();

        var domestic = rows
            .Where(r => r.LocationType == Models.Entities.SalesLocationType.Domestic)
            .Select(ToDto).ToArray();

        // Region 目前是自由字串（CLAUDE.md §7 待確認）。未填者集中到最後一組，
        // 而不是各自成組 —— 否則沒填 region 的據點會變成一堆單筆分組。
        var international = rows
            .Where(r => r.LocationType == Models.Entities.SalesLocationType.International)
            .GroupBy(r => r.RegionLabel ?? string.Empty)
            .OrderBy(g => g.Key.Length == 0).ThenBy(g => g.Key, StringComparer.Ordinal)
            .Select(g => new RegionGroupDto(g.Key, g.Select(ToDto).ToArray()))
            .ToArray();

        return new SalesLocationsDto(domestic, international);

        static SalesLocationDto ToDto((byte LocationType, string CountryCode, string Name,
                                       string? Address, string? RegionLabel, string? Note,
                                       string? Phone, string? WebsiteUrl) r) =>
            new(r.Name, r.Address, r.Note, r.Phone, r.WebsiteUrl, r.CountryCode);
    }
}
