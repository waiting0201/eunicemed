using System.Data;
using Dapper;
using EuniceMed.Api.Common;
using Microsoft.AspNetCore.Mvc;

namespace EuniceMed.Api.Handlers;

/// <summary>
/// 後台側欄的內容統計。
///
/// <para>
/// **為什麼需要一支專門的端點**：後台的側欄每一項帶一個完整度儀表
/// （因此不做 Dashboard 頁）。若由前端拿各模組的列表來算，
/// 分頁的模組（產品 149 筆、文章）只看得到第一頁，數字會騙人；
/// 而為了算數字去抓完整清單，等於每次載入後台都把整個資料庫拉一遍。
/// </para>
///
/// <para>
/// 一次查詢回全部模組。每列是「總數 + 各語系有翻譯的數量」，
/// 前端據此決定儀表要填幾段。
/// </para>
/// </summary>
public sealed class AdminSummaryHandler(IDbConnection db)
{
    public async Task<IActionResult> GetAsync()
    {
        // 每個模組一段 SELECT，UNION 起來一次來回。
        // `Translated` 的口徑與公開端點一致：**有該語系的翻譯列才算數**——
        // 那正是語言純度會不會讓內容消失的分界。
        // 每個模組一段 SELECT，UNION 起來一次來回。
        //
        // ⚠️ 用 LEFT JOIN + `COUNT(DISTINCT CASE …)`，**不能寫成
        // `SUM(CASE WHEN EXISTS (子查詢))`** —— SQL Server 拒絕
        // 「彙總函式內含子查詢」（Msg 130），而那個寫法看起來完全合理。
        //
        // `En` / `ZhTw` 的口徑與公開端點一致：**有該語系的翻譯列才算數**——
        // 那正是語言純度會不會讓內容消失的分界。
        const string sql = """
            SELECT 'products' AS [Key],
                   COUNT(DISTINCT p.Id) AS Total,
                   COUNT(DISTINCT CASE WHEN t.Locale = 'en'    THEN p.Id END) AS [En],
                   COUNT(DISTINCT CASE WHEN t.Locale = 'zh-TW' THEN p.Id END) AS ZhTw
            FROM   Products p LEFT JOIN ProductTranslations t ON t.ProductId = p.Id
            WHERE p.IsDeleted = 0
            UNION ALL
            SELECT 'articles' AS [Key],
                   COUNT(DISTINCT a.Id) AS Total,
                   COUNT(DISTINCT CASE WHEN t.Locale = 'en'    THEN a.Id END) AS [En],
                   COUNT(DISTINCT CASE WHEN t.Locale = 'zh-TW' THEN a.Id END) AS ZhTw
            FROM   Articles a LEFT JOIN ArticleTranslations t ON t.ArticleId = a.Id
            WHERE a.IsDeleted = 0
            UNION ALL
            SELECT 'applications' AS [Key],
                   COUNT(DISTINCT ap.Id) AS Total,
                   COUNT(DISTINCT CASE WHEN t.Locale = 'en'    THEN ap.Id END) AS [En],
                   COUNT(DISTINCT CASE WHEN t.Locale = 'zh-TW' THEN ap.Id END) AS ZhTw
            FROM   Applications ap LEFT JOIN ApplicationTranslations t ON t.ApplicationId = ap.Id
            WHERE ap.IsDeleted = 0
            UNION ALL
            SELECT 'faqs' AS [Key],
                   COUNT(DISTINCT f.Id) AS Total,
                   COUNT(DISTINCT CASE WHEN t.Locale = 'en'    THEN f.Id END) AS [En],
                   COUNT(DISTINCT CASE WHEN t.Locale = 'zh-TW' THEN f.Id END) AS ZhTw
            FROM   Faqs f LEFT JOIN FaqTranslations t ON t.FaqId = f.Id
            UNION ALL
            SELECT 'downloads' AS [Key],
                   COUNT(DISTINCT d.Id) AS Total,
                   COUNT(DISTINCT CASE WHEN t.Locale = 'en'    THEN d.Id END) AS [En],
                   COUNT(DISTINCT CASE WHEN t.Locale = 'zh-TW' THEN d.Id END) AS ZhTw
            FROM   Downloads d LEFT JOIN DownloadTranslations t ON t.DownloadId = d.Id
            UNION ALL
            SELECT 'locations' AS [Key],
                   COUNT(DISTINCT l.Id) AS Total,
                   COUNT(DISTINCT CASE WHEN t.Locale = 'en'    THEN l.Id END) AS [En],
                   COUNT(DISTINCT CASE WHEN t.Locale = 'zh-TW' THEN l.Id END) AS ZhTw
            FROM   SalesLocations l LEFT JOIN SalesLocationTranslations t ON t.SalesLocationId = l.Id
            UNION ALL
            SELECT 'categories' AS [Key],
                   COUNT(DISTINCT c.Id) AS Total,
                   COUNT(DISTINCT CASE WHEN t.Locale = 'en'    THEN c.Id END) AS [En],
                   COUNT(DISTINCT CASE WHEN t.Locale = 'zh-TW' THEN c.Id END) AS ZhTw
            FROM   Categories c LEFT JOIN CategoryTranslations t ON t.CategoryId = c.Id
            WHERE c.IsDeleted = 0
            UNION ALL
            SELECT 'collections' AS [Key],
                   COUNT(DISTINCT co.Id) AS Total,
                   COUNT(DISTINCT CASE WHEN t.Locale = 'en'    THEN co.Id END) AS [En],
                   COUNT(DISTINCT CASE WHEN t.Locale = 'zh-TW' THEN co.Id END) AS ZhTw
            FROM   Collections co LEFT JOIN CollectionTranslations t ON t.CollectionId = co.Id
            UNION ALL
            SELECT 'certifications' AS [Key],
                   COUNT(DISTINCT ce.Id) AS Total,
                   COUNT(DISTINCT CASE WHEN t.Locale = 'en'    THEN ce.Id END) AS [En],
                   COUNT(DISTINCT CASE WHEN t.Locale = 'zh-TW' THEN ce.Id END) AS ZhTw
            FROM   Certifications ce LEFT JOIN CertificationTranslations t ON t.CertificationId = ce.Id
            """;

        var rows = await db.QueryAsync<SummaryRow>(sql);

        // 頁面區段是另一種形狀：不是「幾筆內容」，而是「幾個區段有該語系的內容」。
        // 判準必須與公開端點一致，但那需要 schema registry —— 這裡先只回區段總數，
        // 讓側欄至少知道有沒有東西；精確的可渲染判定留在 PageHandler。
        const string pagesSql = """
            SELECT 'pages' AS [Key], COUNT(DISTINCT ps.Id) AS Total,
                   COUNT(DISTINCT CASE WHEN pst.Locale = 'en' THEN ps.Id END) AS [En],
                   COUNT(DISTINCT CASE WHEN pst.Locale = 'zh-TW' THEN ps.Id END) AS ZhTw
            FROM PageSections ps
                 LEFT JOIN PageSectionTranslations pst ON pst.PageSectionId = ps.Id
            WHERE ps.IsEnabled = 1
            """;

        var pages = await db.QuerySingleAsync<SummaryRow>(pagesSql);

        // 收件匣量的是完全不同的東西：不是「翻譯缺多少」而是「有幾封在等」。
        // 借用同一個形狀（Total = 未處理筆數、語系兩欄留 0），因為側欄只讀 total ——
        // 為了一個數字多開一支端點，會讓後台每次載入多一次來回
        const string contactSql = "SELECT 'contact-submissions' AS [Key], COUNT(*) AS Total, "
                                + "0 AS [En], 0 AS ZhTw FROM ContactSubmissions WHERE Status = 0";

        var contact = await db.QuerySingleAsync<SummaryRow>(contactSql);

        var result = rows.Append(pages).Append(contact).ToDictionary(
            r => r.Key,
            r => new { total = r.Total, locales = new { en = r.En, zhTw = r.ZhTw } });

        return new OkObjectResult(ApiResponse.Ok(result));
    }

    private sealed record SummaryRow(string Key, int Total, int En, int ZhTw);
}
