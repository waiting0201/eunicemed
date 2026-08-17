using EuniceMed.Api.Common;

namespace EuniceMed.Api.Models.Entities;

public static class ArticleType
{
    public const byte News    = 1;
    public const byte Insight = 2;
}

/// <summary>
/// 文章分類。取代舊的 <c>Article.Topic</c> 列舉 —— 側欄 rail 需要計數、排序與篩選，
/// 那是實體才做得到的事（docs/05-database.md §3.5）。
/// </summary>
public class ArticleCategory : ITranslatable<ArticleCategoryTranslation>
{
    public Guid Id { get; set; }

    /// <summary>1 = news、2 = insight</summary>
    public byte Kind { get; set; }

    /// <summary>
    /// **只在同一個 Kind 內唯一**（`UX_ArticleCategory (Kind, Slug)`）。
    /// seed 資料中 `sponsorship` 同時存在於 news 與 insight 兩邊，這是刻意的。
    /// </summary>
    public string Slug { get; set; } = string.Empty;

    public int      SortOrder { get; set; }
    public byte     Status    { get; set; } = ContentStatus.Published;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ArticleCategoryTranslation> Translations { get; set; } = [];
}

public class ArticleCategoryTranslation : ILocalized
{
    public Guid              Id                { get; set; }
    public Guid              ArticleCategoryId { get; set; }
    public ArticleCategory?  ArticleCategory   { get; set; }
    public string            Locale            { get; set; } = string.Empty;

    public string  Name      { get; set; } = string.Empty;
    /// <summary>側欄促購卡覆寫 `{title,body,ctaLabel,linkUrl}`</summary>
    public string? PromoJson { get; set; }
}

/// <summary>News 與 Insights 共用同一個實體，以 <see cref="Type"/> 分流。</summary>
public class Article : ITranslatable<ArticleTranslation>
{
    public Guid   Id   { get; set; }
    public string Slug { get; set; } = string.Empty;

    /// <summary>1 = news、2 = insight</summary>
    public byte Type { get; set; } = ArticleType.News;

    /// <summary>
    /// ⚠️ <c>ArticleCategory.Kind</c> 必須等於本文章的 <see cref="Type"/>。
    /// FK 無法表達這條約束（需要複合 FK 才行），所以由應用層驗證 —— 見 ArticleHandler。
    /// </summary>
    public Guid?            CategoryId { get; set; }
    public ArticleCategory? Category   { get; set; }

    public Guid? CoverMediaId { get; set; }

    public short? ReadMinutes { get; set; }
    /// <summary>News 列表的大卡</summary>
    public bool   IsFeatured  { get; set; }

    public byte      Status      { get; set; } = ContentStatus.Draft;
    public DateTime? PublishedAt { get; set; }

    public bool     IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public byte[]?  RowVer    { get; set; }

    public ICollection<ArticleTranslation> Translations { get; set; } = [];
    public ICollection<ArticleImage>       Images       { get; set; } = [];
    public ICollection<ArticleTag>         Tags         { get; set; } = [];
    public NewsEvent?                      Event        { get; set; }
}

public class ArticleTranslation : ILocalized
{
    public Guid     Id        { get; set; }
    public Guid     ArticleId { get; set; }
    public Article? Article   { get; set; }
    public string   Locale    { get; set; } = string.Empty;

    public string  Title      { get; set; } = string.Empty;
    public string? Standfirst { get; set; }

    /// <summary>
    /// 已淨化的 HTML。**側欄 TOC 由此處的 H2 於伺服器端推導並回填 anchor id**，
    /// 不是資料庫欄位（docs/04 §4）。
    /// </summary>
    public string? Body { get; set; }

    public string? Excerpt        { get; set; }
    public string? AuthorName     { get; set; }
    public string? Disclaimer     { get; set; }
    public string? SeoTitle       { get; set; }
    public string? SeoDescription { get; set; }
}

/// <summary>
/// News 的活動資訊面板。與 <see cref="Article"/> 是**共用主鍵的 1:1**。
///
/// <para>
/// ⚠️ 兩個容易漏的設定：<c>ArticleId</c> 必須 <c>ValueGeneratedNever()</c>
/// （否則 EF 會自己生新 GUID 把 FK 打斷），而
/// <see cref="NewsEventTranslation"/> 的 FK 指向 **NewsEvent** 而非 Article。
/// </para>
/// </summary>
public class NewsEvent
{
    public Guid     ArticleId { get; set; }
    public Article? Article   { get; set; }

    public DateOnly? StartDate    { get; set; }
    public DateOnly? EndDate      { get; set; }
    public string?   ContactEmail { get; set; }
    public string?   CtaUrl       { get; set; }
    public DateTime  UpdatedAt    { get; set; }

    public ICollection<NewsEventTranslation> Translations { get; set; } = [];
}

public class NewsEventTranslation : ILocalized
{
    public Guid       Id        { get; set; }
    public Guid       ArticleId { get; set; }
    public NewsEvent? NewsEvent { get; set; }
    public string     Locale    { get; set; } = string.Empty;

    public string? DatesLabel { get; set; }
    public string? Venue      { get; set; }
    public string? Booth      { get; set; }
    public string? CtaLabel   { get; set; }
}

/// <summary>News 內頁的圖庫。</summary>
public class ArticleImage
{
    public Guid     Id        { get; set; }
    public Guid     ArticleId { get; set; }
    public Article? Article   { get; set; }
    public Guid     MediaId   { get; set; }
    public int      SortOrder { get; set; }
}

public class ArticleTag
{
    public Guid     ArticleId { get; set; }
    public Article? Article   { get; set; }
    public Guid     TagId     { get; set; }
    public Tag?     Tag       { get; set; }
}
