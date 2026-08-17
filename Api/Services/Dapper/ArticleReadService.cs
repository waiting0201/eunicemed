using System.Data;
using Dapper;
using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Dtos;

namespace EuniceMed.Api.Services.Dapper;

public interface IArticleReadService
{
    Task<(IReadOnlyList<ArticleListItemDto> Items, int Total)> GetListAsync(
        byte type, string locale, string? category, string? tag, int page, int pageSize);

    /// <summary>分類 facet。單一維度，因此「不受同維度篩選影響」＝計數時忽略 category。</summary>
    Task<IReadOnlyList<FacetCount>> GetCategoryFacetsAsync(byte type, string locale, string? tag);

    Task<IReadOnlyList<ArticleCategoryDto>> GetCategoriesAsync(byte? kind, string locale);

    Task<ArticleRow?> GetAsync(byte type, string slug, string locale);

    Task<IReadOnlyList<SlugName>>    GetTagsAsync(Guid articleId, string locale);
    Task<IReadOnlyList<MediaRefDto>> GetGalleryAsync(Guid articleId);
    Task<NewsEventDto?>              GetEventAsync(Guid articleId, string locale);
    Task<(ArticleRefDto? Prev, ArticleRefDto? Next)> GetNeighboursAsync(ArticleRow row, string locale);
    Task<IReadOnlyList<ArticleRefDto>> GetRelatedAsync(ArticleRow row, string locale, int take);
}

public sealed record ArticleRow(
    Guid      Id,
    string    Slug,
    byte      Type,
    string?   CategorySlug,
    string?   CategoryName,
    string    Title,
    string?   Standfirst,
    string?   Excerpt,
    string?   Body,
    string?   AuthorName,
    short?    ReadMinutes,
    DateTime? PublishedAt,
    string?   Disclaimer,
    string?   SeoTitle,
    string?   SeoDescription,
    string?   CoverUrl,
    string?   CoverAlt,
    Guid?     CoverMediaId);

public sealed class ArticleReadService(IDbConnection db) : IArticleReadService
{
    private static DynamicParameters P(string locale)
    {
        var p = new DynamicParameters();
        p.Add("@locale", locale, DbType.AnsiString, size: 10);
        return p;
    }

    /// <summary>
    /// 公開查詢的基礎條件，列表 / facet / 詳情三處共用。
    ///
    /// <para>
    /// <c>PublishedAt &lt;= 現在</c> 是排程發布（docs/03 §3 文章列表「排程發布」）：
    /// 未來日期的文章維持 <c>Status=Published</c> 但尚不對外。
    /// </para>
    ///
    /// <para>
    /// 分類走 LEFT JOIN 而非 INNER —— 文章有該語系翻譯但分類沒有時，
    /// 回傳文章並讓 <c>category</c> 為 null，與產品的處理一致。
    /// </para>
    /// </summary>
    private const string PublishedFrom = """
        FROM   Articles a
               INNER JOIN ArticleTranslations tr ON tr.ArticleId = a.Id AND tr.Locale = @locale
               LEFT  JOIN ArticleCategories ac ON ac.Id = a.CategoryId AND ac.Status = 1
               LEFT  JOIN ArticleCategoryTranslations act
                      ON act.ArticleCategoryId = ac.Id AND act.Locale = @locale
        WHERE  a.IsDeleted = 0 AND a.Status = 1 AND a.Type = @type
          AND (a.PublishedAt IS NULL OR a.PublishedAt <= SYSUTCDATETIME())
        """;

    private const string ListSelect = """
        SELECT a.Slug, a.Type, tr.Title, tr.Excerpt, tr.AuthorName,
               ac.Slug AS CategorySlug, act.Name AS CategoryName,
               a.PublishedAt, a.ReadMinutes, a.IsFeatured,
               (SELECT BlobUrl FROM Media WHERE Id = a.CoverMediaId) AS CoverUrl,
               (SELECT AltText FROM Media WHERE Id = a.CoverMediaId) AS CoverAlt,
               a.CoverMediaId
        """;

    private sealed record ListRow(
        string Slug, byte Type, string Title, string? Excerpt, string? AuthorName,
        string? CategorySlug, string? CategoryName, DateTime? PublishedAt,
        short? ReadMinutes, bool IsFeatured, string? CoverUrl, string? CoverAlt, Guid? CoverMediaId);

    public async Task<(IReadOnlyList<ArticleListItemDto>, int)> GetListAsync(
        byte type, string locale, string? category, string? tag, int page, int pageSize)
    {
        var p = P(locale);
        p.Add("@type", type, DbType.Byte);

        var (filterSql, _) = Filters(p, category, tag);

        p.Add("@skip", (page - 1) * pageSize);
        p.Add("@take", pageSize);

        var total = await db.ExecuteScalarAsync<int>($"SELECT COUNT(*) {PublishedFrom}{filterSql}", p);

        // 精選在前，其餘依發布日新到舊。IsFeatured 只影響 News 的大卡版位。
        var rows = (await db.QueryAsync<ListRow>($"""
            {ListSelect} {PublishedFrom}{filterSql}
            ORDER BY a.IsFeatured DESC, a.PublishedAt DESC, a.CreatedAt DESC
            OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY
            """, p)).AsList();

        var variants = await MediaVariantLoader.LoadAsync(db, rows.Select(r => r.CoverMediaId));

        var items = rows.Select(r => new ArticleListItemDto(
            r.Slug, TypeName(r.Type), r.Title, r.Excerpt,
            r.CategorySlug is null ? null : new SlugName(r.CategorySlug, r.CategoryName ?? r.CategorySlug),
            r.PublishedAt, r.ReadMinutes, r.AuthorName,
            MediaVariantLoader.Ref(r.CoverUrl, r.CoverAlt, r.CoverMediaId, variants),
            r.IsFeatured, Url(locale, r.Type, r.Slug))).ToList();

        return (items, total);
    }

    public async Task<IReadOnlyList<FacetCount>> GetCategoryFacetsAsync(byte type, string locale, string? tag)
    {
        var p = P(locale);
        p.Add("@type", type, DbType.Byte);

        // ⚠️ 刻意**不套用 category 篩選**：facet 的意思是「切到那個分類會看到幾筆」，
        // 套了自己的篩選就只剩被選中的那一項有數字（docs/04 §4、Common/FacetFolder.cs）。
        // tag 是另一個維度，仍要套用。
        var (filterSql, _) = Filters(p, category: null, tag);

        var rows = await db.QueryAsync<FacetCount>($"""
            SELECT ac.Slug, COALESCE(act.Name, ac.Slug) AS Label, COUNT(*) AS Count
            {PublishedFrom}{filterSql} AND ac.Id IS NOT NULL
            GROUP BY ac.Slug, act.Name, ac.SortOrder
            ORDER BY ac.SortOrder
            """, p);

        return rows.ToList();
    }

    /// <summary>側欄 rail：分類清單本身（含計數），未被任何文章使用的分類仍要出現。</summary>
    public async Task<IReadOnlyList<ArticleCategoryDto>> GetCategoriesAsync(byte? kind, string locale)
    {
        var p = P(locale);
        var filter = "";
        if (kind is { } k) { filter = " AND ac.Kind = @kind"; p.Add("@kind", k, DbType.Byte); }

        var rows = (await db.QueryAsync<(byte Kind, string Slug, string Name, int Count)>($"""
            SELECT ac.Kind, ac.Slug, act.Name,
                   (SELECT COUNT(*) FROM Articles a
                      INNER JOIN ArticleTranslations tr ON tr.ArticleId = a.Id AND tr.Locale = @locale
                      WHERE a.CategoryId = ac.Id AND a.IsDeleted = 0 AND a.Status = 1
                        AND (a.PublishedAt IS NULL OR a.PublishedAt <= SYSUTCDATETIME())) AS Count
            FROM   ArticleCategories ac
                   INNER JOIN ArticleCategoryTranslations act
                          ON act.ArticleCategoryId = ac.Id AND act.Locale = @locale
            WHERE  ac.Status = 1{filter}
            ORDER  BY ac.Kind, ac.SortOrder
            """, p)).AsList();

        return rows.Select(r => new ArticleCategoryDto(TypeName(r.Kind), r.Slug, r.Name, r.Count)).ToList();
    }

    public async Task<ArticleRow?> GetAsync(byte type, string slug, string locale)
    {
        var p = P(locale);
        p.Add("@type", type, DbType.Byte);
        p.Add("@slug", slug, DbType.String, size: 180);

        return await db.QueryFirstOrDefaultAsync<ArticleRow>($"""
            SELECT a.Id, a.Slug, a.Type,
                   ac.Slug AS CategorySlug, act.Name AS CategoryName,
                   tr.Title, tr.Standfirst, tr.Excerpt, tr.Body, tr.AuthorName,
                   a.ReadMinutes, a.PublishedAt, tr.Disclaimer, tr.SeoTitle, tr.SeoDescription,
                   (SELECT BlobUrl FROM Media WHERE Id = a.CoverMediaId) AS CoverUrl,
                   (SELECT AltText FROM Media WHERE Id = a.CoverMediaId) AS CoverAlt,
                   a.CoverMediaId
            {PublishedFrom} AND a.Slug = @slug
            """, p);
    }

    public async Task<IReadOnlyList<SlugName>> GetTagsAsync(Guid articleId, string locale)
    {
        var p = P(locale);
        p.Add("@id", articleId);

        // Tag 的譯名是主表上的兩個欄位（沒有 translation 表，同 BodyPart）。
        // 缺該語系譯名時整個標籤不出現 —— 語言純度優先於「至少顯示點什麼」。
        var rows = await db.QueryAsync<SlugName>("""
            SELECT t.Slug, CASE WHEN @locale = 'zh-TW' THEN t.NameZhTw ELSE t.NameEn END AS Name
            FROM   ArticleTags at2
                   INNER JOIN Tags t ON t.Id = at2.TagId
            WHERE  at2.ArticleId = @id
              AND (CASE WHEN @locale = 'zh-TW' THEN t.NameZhTw ELSE t.NameEn END) IS NOT NULL
            ORDER  BY 2
            """, p);

        return rows.ToList();
    }

    public async Task<IReadOnlyList<MediaRefDto>> GetGalleryAsync(Guid articleId)
    {
        var rows = (await db.QueryAsync<(Guid MediaId, string BlobUrl, string? AltText)>("""
            SELECT m.Id AS MediaId, m.BlobUrl, m.AltText
            FROM   ArticleImages ai INNER JOIN Media m ON m.Id = ai.MediaId
            WHERE  ai.ArticleId = @id
            ORDER  BY ai.SortOrder
            """, new { id = articleId })).AsList();

        var variants = await MediaVariantLoader.LoadAsync(db, rows.Select(r => (Guid?)r.MediaId));

        return rows.Select(r => new MediaRefDto(r.BlobUrl, r.AltText, variants.GetValueOrDefault(r.MediaId))).ToList();
    }

    public async Task<NewsEventDto?> GetEventAsync(Guid articleId, string locale)
    {
        var p = P(locale);
        p.Add("@id", articleId);

        // 活動面板的翻譯列缺席時整個面板不出現（語言純度），但活動日期是
        // 語系無關的資料，所以以 NewsEvents 為主表、翻譯為 INNER JOIN。
        return await db.QueryFirstOrDefaultAsync<NewsEventDto>("""
            SELECT net.DatesLabel, ne.StartDate, ne.EndDate, net.Venue, net.Booth,
                   ne.ContactEmail, net.CtaLabel, ne.CtaUrl
            FROM   NewsEvents ne
                   INNER JOIN NewsEventTranslations net
                          ON net.ArticleId = ne.ArticleId AND net.Locale = @locale
            WHERE  ne.ArticleId = @id
            """, p);
    }

    /// <summary>
    /// 上一篇 / 下一篇。以 <c>(PublishedAt, Id)</c> 排序而非只看日期 ——
    /// 同日多篇時只看日期會讓兩篇互指，走訪時原地打轉。
    /// </summary>
    public async Task<(ArticleRefDto?, ArticleRefDto?)> GetNeighboursAsync(ArticleRow row, string locale)
    {
        var p = P(locale);
        p.Add("@type", row.Type, DbType.Byte);
        p.Add("@id",   row.Id);
        p.Add("@at",   row.PublishedAt);

        var prev = await db.QueryFirstOrDefaultAsync<RefRow>($"""
            SELECT TOP 1 a.Slug, tr.Title,
                   (SELECT BlobUrl FROM Media WHERE Id = a.CoverMediaId) AS CoverUrl,
                   (SELECT AltText FROM Media WHERE Id = a.CoverMediaId) AS CoverAlt
            {PublishedFrom}
              AND (a.PublishedAt < @at OR (a.PublishedAt = @at AND a.Id < @id))
            ORDER BY a.PublishedAt DESC, a.Id DESC
            """, p);

        var next = await db.QueryFirstOrDefaultAsync<RefRow>($"""
            SELECT TOP 1 a.Slug, tr.Title,
                   (SELECT BlobUrl FROM Media WHERE Id = a.CoverMediaId) AS CoverUrl,
                   (SELECT AltText FROM Media WHERE Id = a.CoverMediaId) AS CoverAlt
            {PublishedFrom}
              AND (a.PublishedAt > @at OR (a.PublishedAt = @at AND a.Id > @id))
            ORDER BY a.PublishedAt, a.Id
            """, p);

        return (ToRef(prev, locale, row.Type), ToRef(next, locale, row.Type));
    }

    public async Task<IReadOnlyList<ArticleRefDto>> GetRelatedAsync(ArticleRow row, string locale, int take)
    {
        var p = P(locale);
        p.Add("@type", row.Type, DbType.Byte);
        p.Add("@id",   row.Id);
        p.Add("@cat",  row.CategorySlug, DbType.String, size: 80);
        p.Add("@take", take);

        // 同分類優先，不足時同型態遞補 —— 與產品的相關推薦同一套思路。
        var rows = await db.QueryAsync<RefRow>($"""
            SELECT a.Slug, tr.Title,
                   (SELECT BlobUrl FROM Media WHERE Id = a.CoverMediaId) AS CoverUrl,
                   (SELECT AltText FROM Media WHERE Id = a.CoverMediaId) AS CoverAlt
            {PublishedFrom} AND a.Id <> @id
            ORDER BY CASE WHEN ac.Slug = @cat THEN 0 ELSE 1 END,
                     a.PublishedAt DESC, a.CreatedAt DESC
            OFFSET 0 ROWS FETCH NEXT @take ROWS ONLY
            """, p);

        return rows.Select(r => ToRef(r, locale, row.Type)!).ToList();
    }

    private sealed record RefRow(string Slug, string Title, string? CoverUrl, string? CoverAlt);

    private static ArticleRefDto? ToRef(RefRow? r, string locale, byte type) =>
        r is null ? null
                  : new ArticleRefDto(r.Slug, r.Title,
                        r.CoverUrl is null ? null : new MediaRefDto(r.CoverUrl, r.CoverAlt),
                        Url(locale, type, r.Slug));

    private (string Sql, bool Any) Filters(DynamicParameters p, string? category, string? tag)
    {
        var where = new List<string>();

        if (category is not null)
        {
            where.Add("ac.Slug = @category");
            p.Add("@category", category, DbType.String, size: 80);
        }

        if (tag is not null)
        {
            where.Add("""
                EXISTS (SELECT 1 FROM ArticleTags at2 INNER JOIN Tags t ON t.Id = at2.TagId
                         WHERE at2.ArticleId = a.Id AND t.Slug = @tag)
                """);
            p.Add("@tag", tag, DbType.String, size: 80);
        }

        return (where.Count == 0 ? "" : " AND " + string.Join(" AND ", where), where.Count > 0);
    }

    public static string TypeName(byte type) =>
        type == Models.Entities.ArticleType.Insight ? "insight" : "news";

    public static string Url(string locale, byte type, string slug) =>
        $"/{locale}/{(type == Models.Entities.ArticleType.Insight ? "insights" : "news")}/{slug}";
}
