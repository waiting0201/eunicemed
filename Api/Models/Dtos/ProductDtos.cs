using EuniceMed.Api.Common;

namespace EuniceMed.Api.Models.Dtos;

public sealed record SlugName(string Slug, string Name);

public sealed record MediaRefDto(string Url, string? Alt);

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
    MediaRefDto[] Images,
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
