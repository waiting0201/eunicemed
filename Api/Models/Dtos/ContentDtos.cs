namespace EuniceMed.Api.Models.Dtos;

// ── 應用方案 ───────────────────────────────────────────────────────────────

/// <summary>
/// 人體圖專用。<c>Map</c> 是原樣輸出的座標 JSON —— 座標屬版面而非內容，
/// 由 mockup4 的 viewBox 決定，API 不解讀它。
/// </summary>
public sealed record BodyMapItemDto(
    string  Slug,
    string  Name,
    int     ProductCount,
    string? Copy,
    string? CtaLabel,
    object? Map,
    string  Url);

public sealed record ApplicationListItemDto(
    string       Slug,
    string       Type,
    string       Name,
    string?      Lead,
    MediaRefDto? Image,
    int          ProductCount,
    string       Url);

public sealed record ApplicationDto(
    string                   Slug,
    string                   Type,
    string                   Name,
    string?                  Lead,
    string?                  Body,
    MediaRefDto?             HeroImage,
    object?                  Stats,
    object?                  Concerns,
    object?                  SupportLevels,
    ProductListItemDto[]     RecommendedProducts,
    object?                  HowTo,
    MediaRefDto?             FittingImage,
    string?                  Disclaimer,
    ApplicationRefDto[]      Related,
    SeoDto                   Seo);

public sealed record ApplicationRefDto(string Slug, string Name, int ProductCount, string Url);

// ── 文章（News / Insights）─────────────────────────────────────────────────

public sealed record ArticleListItemDto(
    string       Slug,
    string       Type,
    string       Title,
    string?      Excerpt,
    SlugName?    Category,
    DateTime?    PublishedAt,
    short?       ReadMinutes,
    string?      Author,
    MediaRefDto? Cover,
    bool         IsFeatured,
    string       Url);

public sealed record TocItemDto(string Id, string Text);

/// <summary>
/// 側欄 rail 的分類項目。
///
/// <para>
/// **一定要帶 <c>Kind</c>**：<c>ArticleCategory</c> 的唯一鍵是 <c>(Kind, Slug)</c>，
/// <c>sponsorship</c> 在 news 與 insight 各存在一筆。少了這個欄位，
/// 不帶 <c>?kind=</c> 呼叫時會拿到兩個 slug 相同、無法區分的項目。
/// </para>
/// </summary>
public sealed record ArticleCategoryDto(string Kind, string Slug, string Name, int Count);

/// <summary>News 的活動資訊面板；<c>type=insight</c> 時整個為 null。</summary>
public sealed record NewsEventDto(
    string?   DatesLabel,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string?   Venue,
    string?   Booth,
    string?   ContactEmail,
    string?   CtaLabel,
    string?   CtaUrl);

public sealed record ArticleRefDto(string Slug, string Title, MediaRefDto? Cover, string Url);

public sealed record ArticleDto(
    string          Slug,
    string          Type,
    SlugName?       Category,
    string          Title,
    string?         Standfirst,
    string?         Excerpt,
    DateTime?       PublishedAt,
    string?         Author,
    short?          ReadMinutes,
    MediaRefDto?    Cover,
    string?         Body,
    TocItemDto[]    Toc,
    SlugName[]      Tags,
    string?         Disclaimer,
    MediaRefDto[]   Gallery,
    NewsEventDto?   Event,
    ArticleRefDto?  Prev,
    ArticleRefDto?  Next,
    ArticleRefDto[] Related,
    SeoDto          Seo);

// ── FAQ ────────────────────────────────────────────────────────────────────

public sealed record FaqDto(Guid Id, string Question, string Answer, SlugName? Category);

// ── 下載 ───────────────────────────────────────────────────────────────────

/// <summary>
/// <c>FileLocale</c> 是**檔案語言**（清單顯示 `EN · PDF · 說明`），
/// 與 <c>?locale=</c> 的站台語系無關（docs/05 §3.8）。
/// </summary>
public sealed record DownloadDto(
    Guid    Id,
    string  Title,
    string? Description,
    string  Type,
    string  FileLocale,
    string  FileExt,
    long    SizeBytes,
    string  Url);

// ── 銷售據點 ───────────────────────────────────────────────────────────────

public sealed record SalesLocationDto(
    string  Name,
    string? Address,
    string? Note,
    string? Phone,
    string? WebsiteUrl,
    string  CountryCode);

public sealed record RegionGroupDto(string Region, SalesLocationDto[] Items);

public sealed record SalesLocationsDto(
    SalesLocationDto[] Domestic,
    RegionGroupDto[]   International);

// ── 導覽 / 設定 / Sitemap ──────────────────────────────────────────────────

public sealed record MenuNodeDto(string Url, string Label, MenuNodeDto[] Children);

/// <summary>
/// sitemap 的一列。<c>Path</c> **不含語系前綴** —— 前端逐語系組出 loc 與 hreflang。
/// <c>Locales</c> 只列**該語系確實有內容**的，避免向搜尋引擎宣告 404。
/// </summary>
public sealed record SitemapEntryDto(
    string   Path,
    DateTime LastModified,
    string   ChangeFreq,
    double   Priority,
    string[] Locales);
