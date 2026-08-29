using System.Data;
using Dapper;
using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Dtos;

namespace EuniceMed.Api.Services.Dapper;

public interface ISiteReadService
{
    /// <summary>
    /// sitemap 的**實體驅動**部分（分類／子分類／產品／應用方案／文章）。
    /// 靜態頁那半在 <c>SiteHandler</c>，因為它必須共用 <c>PageHandler.IsRenderable</c>。
    /// </summary>
    Task<IReadOnlyList<SitemapEntryDto>> GetSitemapAsync();
}

public sealed class SiteReadService(IDbConnection db) : ISiteReadService
{
    private static DynamicParameters P(string locale)
    {
        var p = new DynamicParameters();
        p.Add("@locale", locale, DbType.AnsiString, size: 10);
        return p;
    }

    // ── Sitemap ────────────────────────────────────────────────────────────

    /// <summary>
    /// 每一列是「一個語系無關的路徑 + 哪些語系有內容」。
    ///
    /// <para>
    /// **`locales` 是關鍵**：語言純度會讓缺翻譯的頁面回 404，
    /// 若 sitemap 對每個路徑都列出兩個語系，等於向搜尋引擎宣告一堆 404
    /// 並在 hreflang 裡互指到不存在的頁面。所以要逐語系檢查內容是否存在。
    /// </para>
    /// </summary>
    public async Task<IReadOnlyList<SitemapEntryDto>> GetSitemapAsync()
    {
        var entries = new List<SitemapEntryDto>();

        entries.AddRange(await QueryAsync(
            """
            SELECT '/products/' + c.Slug AS Path, c.UpdatedAt, ct.Locale
            FROM   Categories c INNER JOIN CategoryTranslations ct ON ct.CategoryId = c.Id
            WHERE  c.IsDeleted = 0
            """, "weekly", 0.9));

        entries.AddRange(await QueryAsync(
            """
            SELECT '/products/' + c.Slug + '/' + sc.Slug AS Path, sc.UpdatedAt, sct.Locale
            FROM   SubCategories sc
                   INNER JOIN Categories c ON c.Id = sc.CategoryId AND c.IsDeleted = 0
                   INNER JOIN SubCategoryTranslations sct ON sct.SubCategoryId = sc.Id
            WHERE  sc.IsDeleted = 0 AND sc.Status = 1
            """, "weekly", 0.8));

        entries.AddRange(await QueryAsync(
            """
            SELECT '/products/' + c.Slug + '/' + sc.Slug + '/' + p.Slug AS Path, p.UpdatedAt, pt.Locale
            FROM   Products p
                   INNER JOIN Categories c ON c.Id = p.CategoryId AND c.IsDeleted = 0
                   INNER JOIN SubCategories sc ON sc.Id = p.SubCategoryId AND sc.IsDeleted = 0
                   INNER JOIN ProductTranslations pt ON pt.ProductId = p.Id
            WHERE  p.IsDeleted = 0 AND p.Status = 1
            """, "weekly", 0.8));

        entries.AddRange(await QueryAsync(
            """
            SELECT '/applications/' + a.Slug AS Path, a.UpdatedAt, at2.Locale
            FROM   Applications a INNER JOIN ApplicationTranslations at2 ON at2.ApplicationId = a.Id
            WHERE  a.IsDeleted = 0 AND a.Status = 1
            """, "weekly", 0.8));

        // 排程發布：PublishedAt 為未來時間者不進 sitemap（與公開列表同一條件）
        entries.AddRange(await QueryAsync(
            """
            SELECT CASE WHEN a.[Type] = 1 THEN '/news/' ELSE '/insights/' END + a.Slug AS Path,
                   a.UpdatedAt, at2.Locale
            FROM   Articles a INNER JOIN ArticleTranslations at2 ON at2.ArticleId = a.Id
            WHERE  a.IsDeleted = 0 AND a.Status = 1
                   AND (a.PublishedAt IS NULL OR a.PublishedAt <= SYSUTCDATETIME())
            """, "monthly", 0.7));

        return entries;
    }

    private async Task<List<SitemapEntryDto>> QueryAsync(string sql, string changeFreq, double priority)
    {
        var rows = await db.QueryAsync<(string Path, DateTime UpdatedAt, string Locale)>(sql);

        return rows.GroupBy(r => r.Path)
            .Select(g => new SitemapEntryDto(
                g.Key, g.Max(r => r.UpdatedAt), changeFreq, priority,
                g.Select(r => r.Locale).Distinct().ToArray()))
            .ToList();
    }

}
