using EuniceMed.Api.Common;

namespace EuniceMed.Api.Models.Dtos;

public sealed record SlugName(string Slug, string Name);

/// <summary>
/// 公開端點的媒體引用。
///
/// <para>
/// **一定要帶 <c>Variants</c>**：本站無 CDN、前端不走 next/image 即時優化，
/// 響應式尺寸全在上傳當下就產生成實體檔案。消費端**不應該自己拼檔名** ——
/// 「只縮不放」會讓來源較小的圖塌到與規劃不同的寬度，猜名字必然對不上。
/// </para>
/// </summary>
public sealed record MediaRefDto(
    string             Url,
    string?            Alt,
    ImageVariantDto[]? Variants = null);

public sealed record ImageVariantDto(string Format, int Width, string Url);

/// <summary>
/// 產品圖庫的一張。比 <see cref="MediaRefDto"/> 多一個 <c>isPrimary</c> ——
/// docs/04 §4 的 ProductDto 範例有這個欄位，前端的圖庫要知道哪張是預設顯示的。
/// 陣列本身已依「主圖優先 → SortOrder」排好。
/// </summary>
public sealed record ProductImageDto(
    string             Url,
    string?            Alt,
    bool               IsPrimary,
    ImageVariantDto[]? Variants = null);

/// <summary>列表卡／精選卡。</summary>
public sealed record ProductListItemDto(
    string       Slug,
    string       Name,
    string?      Sku,
    SlugName?    Category,
    SlugName?    SubCategory,
    SlugName?    Collection,
    string[]     BodyParts,
    MediaRefDto? Image,
    string?      FeaturedBlurb,
    string       Url);

/// <summary>產品詳情。欄位對應 docs/09-page-blocks.md §4.3 的 7 個區塊。</summary>
public sealed record ProductDto(
    Guid          Id,
    string        Slug,
    string?       Sku,
    string        Name,
    SlugName?     Category,
    SlugName?     SubCategory,
    SlugName?     Collection,
    string[]      BodyParts,
    object?       Conditions,
    string?       Summary,
    string?       Description,
    ProductImageDto[] Images,
    object?       Features,
    MediaRefDto?  UseCaseImage,
    object?       UseCases,
    object?       Specs,
    object?       SizeChart,
    CertificationDto[]  Certifications,
    ProductRelatedDto[] RelatedProducts,
    SeoDto        Seo,
    DateTime?     PublishedAt);

public sealed record ProductRelatedDto(string Slug, string Name, MediaRefDto? Image, string Url);

public sealed record SeoDto(string? Title, string? Description, string? OgImage);

public sealed record CertificationDto(
    string       Slug,
    string       Mark,
    string?      SubLabel,
    string?      Description,
    MediaRefDto? Logo);

/// <summary>分類／子分類落地頁。兩者形狀相同。</summary>
public sealed record CategoryDto(
    string          Slug,
    string          Name,
    string?         Description,
    MediaRefDto?    HeroImage,
    object?         Stats,
    object?         SupportLevels,
    SubCategoryRefDto[] SubCategories,
    SeoDto          Seo);

public sealed record SubCategoryRefDto(string Slug, string Name, int Count);

/// <summary>
/// 帶分面的列表回應。
/// 注意 facet 項目用 <c>label</c>（不是 <c>name</c>），與 docs/04 §4 一致。
/// </summary>
public sealed record FacetedResult<T>(
    IEnumerable<T>                     Items,
    int                                TotalCount,
    int                                Page,
    int                                PageSize,
    int                                TotalPages,
    Dictionary<string, FacetCount[]>?  Facets);
