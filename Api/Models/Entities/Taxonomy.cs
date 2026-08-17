using EuniceMed.Api.Common;

namespace EuniceMed.Api.Models.Entities;

/// <summary>三大產品分類。docs/05-database.md §3.1。</summary>
public class Category : ITranslatable<CategoryTranslation>
{
    public Guid   Id        { get; set; }
    public string Slug      { get; set; } = string.Empty;
    public int    SortOrder { get; set; }

    /// <summary>總覽頁分類卡用圖（preset `square`）</summary>
    public Guid? ImageMediaId { get; set; }
    /// <summary>分類頁 hero（preset `wide-16x10`）</summary>
    public Guid? HeroImageMediaId { get; set; }

    public bool     IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public byte[]?  RowVer    { get; set; }

    public ICollection<CategoryTranslation> Translations  { get; set; } = [];
    public ICollection<SubCategory>         SubCategories { get; set; } = [];
    public ICollection<Product>             Products      { get; set; } = [];
}

public class CategoryTranslation : ILocalized
{
    public Guid      Id         { get; set; }
    public Guid      CategoryId { get; set; }
    public Category? Category   { get; set; }
    public string    Locale     { get; set; } = string.Empty;

    public string  Name        { get; set; } = string.Empty;
    /// <summary>分類頁 hero lead</summary>
    public string? Description { get; set; }

    /// <summary>`[{value,label}]` ×3；value 可為 "auto" 由 API 代入產品數</summary>
    public string? StatsJson         { get; set; }
    /// <summary>`{title,lead,items:[{collectionSlug,body}]}`</summary>
    public string? SupportLevelsJson { get; set; }

    public string? SeoTitle       { get; set; }
    public string? SeoDescription { get; set; }
}

/// <summary>子分類（17 筆）。**有獨立 URL 落地頁**，slug 全站唯一。</summary>
public class SubCategory : ITranslatable<SubCategoryTranslation>
{
    public Guid      Id         { get; set; }
    public Guid      CategoryId { get; set; }
    public Category? Category   { get; set; }

    /// <summary>全站唯一，非僅分類內唯一（URL 為 /products/{category}/{sub}）</summary>
    public string Slug      { get; set; } = string.Empty;
    public int    SortOrder { get; set; }

    public Guid? ImageMediaId     { get; set; }
    public Guid? HeroImageMediaId { get; set; }

    public byte     Status    { get; set; } = ContentStatus.Published;
    public bool     IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public byte[]?  RowVer    { get; set; }

    public ICollection<SubCategoryTranslation> Translations { get; set; } = [];
    public ICollection<Product>                Products     { get; set; } = [];
}

public class SubCategoryTranslation : ILocalized
{
    public Guid         Id            { get; set; }
    public Guid         SubCategoryId { get; set; }
    public SubCategory? SubCategory   { get; set; }
    public string       Locale        { get; set; } = string.Empty;

    public string  Name        { get; set; } = string.Empty;
    /// <summary>落地頁敘述文案 —— SEO 必填，內容不足者不應發布（避免薄內容頁）</summary>
    public string? Description { get; set; }

    public string? StatsJson      { get; set; }
    public string? SeoTitle       { get; set; }
    public string? SeoDescription { get; set; }
}

/// <summary>認證。About 認證帶與產品頁標章列共用同一份。docs/05 §3.3。</summary>
public class Certification : ITranslatable<CertificationTranslation>
{
    public Guid   Id   { get; set; }
    public string Slug { get; set; } = string.Empty;

    /// <summary>品牌標章文字，不翻譯（如 ISO 13485）</summary>
    public string Mark { get; set; } = string.Empty;

    public Guid? LogoMediaId { get; set; }
    /// <summary>對應的可下載認證文件（Download 於 Phase 6 建立，此處先留欄位不設 FK）</summary>
    public Guid? DownloadId { get; set; }

    public int      SortOrder { get; set; }
    public byte     Status    { get; set; } = ContentStatus.Published;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<CertificationTranslation> Translations { get; set; } = [];
}

public class CertificationTranslation : ILocalized
{
    public Guid           Id              { get; set; }
    public Guid           CertificationId { get; set; }
    public Certification? Certification   { get; set; }
    public string         Locale          { get; set; } = string.Empty;

    public string? SubLabel    { get; set; }
    public string? Description { get; set; }
}

/// <summary>
/// 適用部位（7 筆）。**刻意不建 translation 表** —— 名稱固定且短，
/// 用雙語欄位比多一張表划算（docs/05 §3.2）。
/// </summary>
public class BodyPart
{
    public Guid   Id       { get; set; }
    public string Slug     { get; set; } = string.Empty;
    public string NameEn   { get; set; } = string.Empty;
    public string NameZhTw { get; set; } = string.Empty;

    /// <summary>僅 4 筆為 true（back / knee / ankle / foot），供人體圖使用</summary>
    public bool ShowOnBodyMap { get; set; }
    public int  SortOrder     { get; set; }

    public ICollection<ProductBodyPart> ProductBodyParts { get; set; } = [];

    public string Name(string locale) => locale == Locales.ZhTw ? NameZhTw : NameEn;
}

/// <summary>標籤。同樣採雙語欄位，不建 translation 表。</summary>
public class Tag
{
    public Guid    Id       { get; set; }
    public string  Slug     { get; set; } = string.Empty;
    public string  NameEn   { get; set; } = string.Empty;
    public string? NameZhTw { get; set; }

    public ICollection<ProductTag> ProductTags { get; set; } = [];
}
