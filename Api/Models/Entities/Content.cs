using EuniceMed.Api.Common;

namespace EuniceMed.Api.Models.Entities;

// ── FAQ ────────────────────────────────────────────────────────────────────

public class FaqCategory : ITranslatable<FaqCategoryTranslation>
{
    public Guid   Id        { get; set; }
    /// <summary>use | sizing | order</summary>
    public string Slug      { get; set; } = string.Empty;
    public int    SortOrder { get; set; }
    public byte   Status    { get; set; } = ContentStatus.Published;

    public ICollection<FaqCategoryTranslation> Translations { get; set; } = [];
    public ICollection<Faq>                    Faqs         { get; set; } = [];
}

public class FaqCategoryTranslation : ILocalized
{
    public Guid         Id            { get; set; }
    public Guid         FaqCategoryId { get; set; }
    public FaqCategory? FaqCategory   { get; set; }
    public string       Locale        { get; set; } = string.Empty;
    public string       Name          { get; set; } = string.Empty;
}

/// <summary>FAQ 項目。**沒有 slug** —— 它是折疊面板的一列，不是一個頁面。</summary>
public class Faq : ITranslatable<FaqTranslation>
{
    public Guid         Id            { get; set; }
    public Guid         FaqCategoryId { get; set; }
    public FaqCategory? FaqCategory   { get; set; }

    public byte     Status    { get; set; } = ContentStatus.Published;
    public int      SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<FaqTranslation> Translations { get; set; } = [];
}

public class FaqTranslation : ILocalized
{
    public Guid   Id       { get; set; }
    public Guid   FaqId    { get; set; }
    public Faq?   Faq      { get; set; }
    public string Locale   { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    /// <summary>已淨化的 HTML</summary>
    public string Answer   { get; set; } = string.Empty;
}

// ── 下載 ───────────────────────────────────────────────────────────────────

public static class DownloadType
{
    public const byte Catalog     = 1;
    public const byte Manual      = 2;
    public const byte Certificate = 3;
}

public class Download : ITranslatable<DownloadTranslation>
{
    public Guid Id      { get; set; }
    public Guid MediaId { get; set; }

    public byte Type { get; set; } = DownloadType.Catalog;

    /// <summary>
    /// **檔案本身的語言**（清單顯示為 `EN · PDF · 說明`）。
    /// 與 <see cref="DownloadTranslation.Locale"/>（介面語系）是兩件事，
    /// 欄位刻意命名為 FileLocale 以免混淆（docs/05 §3.8）。
    /// </summary>
    public string FileLocale { get; set; } = "en";

    public byte     Status    { get; set; } = ContentStatus.Published;
    public int      SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<DownloadTranslation> Translations { get; set; } = [];
}

public class DownloadTranslation : ILocalized
{
    public Guid      Id         { get; set; }
    public Guid      DownloadId { get; set; }
    public Download? Download   { get; set; }
    /// <summary>**站台介面語系**，非檔案語言。</summary>
    public string    Locale     { get; set; } = string.Empty;

    public string  Title       { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class ProductDownload
{
    public Guid      ProductId  { get; set; }
    public Product?  Product    { get; set; }
    public Guid      DownloadId { get; set; }
    public Download? Download   { get; set; }
}

// ── 銷售據點 ───────────────────────────────────────────────────────────────

public static class SalesLocationType
{
    public const byte Domestic      = 1;   // 台灣通路卡
    public const byte International = 2;   // 國際經銷列
}

public class SalesLocation : ITranslatable<SalesLocationTranslation>
{
    public Guid   Id           { get; set; }
    public byte   LocationType { get; set; } = SalesLocationType.Domestic;
    /// <summary>ISO 3166-1 alpha-2，供分組</summary>
    public string CountryCode  { get; set; } = "TW";
    public string? WebsiteUrl  { get; set; }
    public string? Phone       { get; set; }

    public byte     Status    { get; set; } = ContentStatus.Published;
    public int      SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<SalesLocationTranslation> Translations { get; set; } = [];
}

public class SalesLocationTranslation : ILocalized
{
    public Guid           Id              { get; set; }
    public Guid           SalesLocationId { get; set; }
    public SalesLocation? SalesLocation   { get; set; }
    public string         Locale          { get; set; } = string.Empty;

    public string  Name        { get; set; } = string.Empty;
    public string? Address     { get; set; }
    /// <summary>國際經銷的地區標籤，目前為自由字串（CLAUDE.md §7 待確認）</summary>
    public string? RegionLabel { get; set; }
    public string? Note        { get; set; }
}

// ── 應用方案 ───────────────────────────────────────────────────────────────

public static class ApplicationType
{
    public const byte BodyPart    = 1;
    public const byte SpecialCare = 2;
}

public class Application : ITranslatable<ApplicationTranslation>
{
    public Guid   Id   { get; set; }
    public string Slug { get; set; } = string.Empty;

    /// <summary>1 = 依部位、2 = 特殊照護</summary>
    public byte Type { get; set; } = ApplicationType.BodyPart;

    public Guid?     BodyPartId { get; set; }
    public BodyPart? BodyPart   { get; set; }

    public Guid? ImageMediaId        { get; set; }
    public Guid? CardImageMediaId    { get; set; }
    public Guid? FittingImageMediaId { get; set; }

    /// <summary>人體圖上是否顯示。7 筆中只有 4 筆為 true。</summary>
    public bool ShowOnBodyMap { get; set; }

    /// <summary>SVG 座標 `{hotspot:{cx,cy},chip:{cx,cy}}`，取自 mockup4 的 viewBox。</summary>
    public string? MapPositionJson { get; set; }

    public byte     Status    { get; set; } = ContentStatus.Draft;
    public int      SortOrder { get; set; }
    public bool     IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public byte[]?  RowVer    { get; set; }

    public ICollection<ApplicationTranslation> Translations { get; set; } = [];
}

public class ApplicationTranslation : ILocalized
{
    public Guid         Id            { get; set; }
    public Guid         ApplicationId { get; set; }
    public Application? Application   { get; set; }
    public string       Locale        { get; set; } = string.Empty;

    public string  Name        { get; set; } = string.Empty;
    public string? Lead        { get; set; }
    public string? Body        { get; set; }
    public string? MapCopy     { get; set; }
    public string? MapCtaLabel { get; set; }

    /// <summary>`[{value,label}]`；value 可為 "auto" 由 API 代入產品數</summary>
    public string? StatsJson         { get; set; }
    /// <summary>`[{title,body}]` ×2–6</summary>
    public string? ConcernsJson      { get; set; }
    /// <summary>`[{collectionSlug,body,bestFor,linkUrl}]` ×3</summary>
    public string? SupportLevelsJson { get; set; }
    /// <summary>`[{title,body}]` ×2–5</summary>
    public string? HowToJson         { get; set; }

    /// <summary>留空時前端套用模板預設的醫療免責文字</summary>
    public string? Disclaimer     { get; set; }
    public string? SeoTitle       { get; set; }
    public string? SeoDescription { get; set; }
}

public class ProductApplication
{
    public Guid         ProductId     { get; set; }
    public Product?     Product       { get; set; }
    public Guid         ApplicationId { get; set; }
    public Application? Application   { get; set; }
    public int          SortOrder     { get; set; }
}
