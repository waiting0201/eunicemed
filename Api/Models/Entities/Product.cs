using EuniceMed.Api.Common;

namespace EuniceMed.Api.Models.Entities;

/// <summary>產品。docs/05-database.md §3.2。</summary>
public class Product : ITranslatable<ProductTranslation>
{
    public Guid   Id   { get; set; }
    public string Slug { get; set; } = string.Empty;
    /// <summary>型號，如 CPO-1603</summary>
    public string? Sku { get; set; }

    public Guid      CategoryId { get; set; }
    public Category? Category   { get; set; }

    /// <summary>決定 URL 第三段 /products/{category}/{sub}/{slug}</summary>
    public Guid?        SubCategoryId { get; set; }
    public SubCategory? SubCategory   { get; set; }

    public Guid?       CollectionId { get; set; }
    public Collection? Collection   { get; set; }

    public byte Status { get; set; } = ContentStatus.Draft;

    /// <summary>首頁 hero products 自動撈取</summary>
    public bool IsFeatured        { get; set; }
    public int  FeaturedSortOrder { get; set; }

    /// <summary>產品頁 §02 使用情境照（preset `photo-4x3`）</summary>
    public Guid? UseCaseImageMediaId { get; set; }

    public int       SortOrder   { get; set; }
    public DateTime? PublishedAt { get; set; }

    public bool     IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Guid?    CreatedBy { get; set; }
    public Guid?    UpdatedBy { get; set; }
    public byte[]?  RowVer    { get; set; }

    public ICollection<ProductTranslation>   Translations   { get; set; } = [];
    public ICollection<ProductImage>         Images         { get; set; } = [];
    public ICollection<ProductBodyPart>      BodyParts      { get; set; } = [];
    public ICollection<ProductCertification> Certifications { get; set; } = [];
    public ICollection<ProductTag>           Tags           { get; set; } = [];
    public ICollection<ProductRelated>       Related        { get; set; } = [];
}

public class ProductTranslation : ILocalized
{
    public Guid     Id        { get; set; }
    public Guid     ProductId { get; set; }
    public Product? Product   { get; set; }
    public string   Locale    { get; set; } = string.Empty;

    public string  Name          { get; set; } = string.Empty;
    public string? Summary       { get; set; }
    /// <summary>已淨化的 HTML</summary>
    public string? Description   { get; set; }
    /// <summary>首頁精選卡的一句話文案</summary>
    public string? FeaturedBlurb { get; set; }

    // ── JSON 欄位（只在該產品表單內編輯，不跨頁重用、不被查詢）──────────
    /// <summary>`[{icon,title,body}]` ×2–6</summary>
    public string? FeaturesJson   { get; set; }
    /// <summary>`[{title,body}]` ×2–5</summary>
    public string? UseCasesJson   { get; set; }
    /// <summary>`[{label,value}]`</summary>
    public string? SpecsJson      { get; set; }
    /// <summary>`{measureLabel,sizes:[],rows:[{label?,values:[]}],footnote?}`</summary>
    public string? SizeChartJson  { get; set; }
    /// <summary>症狀 chips</summary>
    public string? ConditionsJson { get; set; }

    public string? SeoTitle       { get; set; }
    public string? SeoDescription { get; set; }
    public Guid?   OgImageMediaId { get; set; }
}

/// <summary>產品圖，一律 1:1（preset `square`）。主圖供全站各版位共用。</summary>
public class ProductImage
{
    public Guid     Id        { get; set; }
    public Guid     ProductId { get; set; }
    public Product? Product   { get; set; }

    public Guid MediaId { get; set; }

    /// <summary>單一主圖由應用層保證，DB 端無唯一約束</summary>
    public bool IsPrimary { get; set; }
    public int  SortOrder { get; set; }
}

/// <summary>
/// 相關產品：自我參照多對多，帶排序欄位。
/// 為空時由 API 自動以「同 SubCategory → 同 Category → 同 BodyPart」補足 4 筆。
/// **非對稱** —— A→B 不蘊含 B→A，這是編輯者刻意指定的方向。
/// </summary>
public class ProductRelated
{
    public Guid     ProductId { get; set; }
    public Product? Product   { get; set; }

    public Guid     RelatedProductId { get; set; }
    public Product? RelatedProduct   { get; set; }

    public int SortOrder { get; set; }
}

public class ProductBodyPart
{
    public Guid      ProductId  { get; set; }
    public Product?  Product    { get; set; }
    public Guid      BodyPartId { get; set; }
    public BodyPart? BodyPart   { get; set; }
}

public class ProductCertification
{
    public Guid           ProductId       { get; set; }
    public Product?       Product         { get; set; }
    public Guid           CertificationId { get; set; }
    public Certification? Certification   { get; set; }
}

public class ProductTag
{
    public Guid     ProductId { get; set; }
    public Product? Product   { get; set; }
    public Guid     TagId     { get; set; }
    public Tag?     Tag       { get; set; }
}
