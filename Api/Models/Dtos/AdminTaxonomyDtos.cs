using System.Text.Json.Nodes;

namespace EuniceMed.Api.Models.Dtos;

// ── 後台分類 / 子分類 / 認證 / 部位 ────────────────────────────────────────
// 與 AdminCollectionDto 同一套慣例：回全部語系（key = locale），
// null 欄位＝這次不動它。

public sealed record CategoryTranslationInput(
    string    Name,
    string?   Description    = null,
    JsonNode? Stats          = null,
    JsonNode? SupportLevels  = null,
    string?   SeoTitle       = null,
    string?   SeoDescription = null);

public sealed record AdminCategoryDto(
    Guid                                         Id,
    string                                       Slug,
    int                                          SortOrder,
    Guid?                                        ImageMediaId,
    Guid?                                        HeroImageMediaId,
    int                                          SubCategoryCount,
    int                                          ProductCount,
    Dictionary<string, CategoryTranslationInput> Translations,
    string?                                      RowVersion,
    DateTime                                     CreatedAt,
    DateTime                                     UpdatedAt);

public sealed record UpsertCategoryRequest(
    string?                                       Slug             = null,
    int?                                          SortOrder        = null,
    Guid?                                         ImageMediaId     = null,
    Guid?                                         HeroImageMediaId = null,
    Dictionary<string, CategoryTranslationInput>? Translations     = null,
    string?                                       RowVersion       = null)
{
    public bool ClearImage     { get; init; }
    public bool ClearHeroImage { get; init; }
}

public sealed record SubCategoryTranslationInput(
    string    Name,
    string?   Description    = null,
    JsonNode? Stats          = null,
    string?   SeoTitle       = null,
    string?   SeoDescription = null);

public sealed record AdminSubCategoryDto(
    Guid                                            Id,
    Guid                                            CategoryId,
    string                                          CategorySlug,
    string                                          Slug,
    int                                             SortOrder,
    Guid?                                           ImageMediaId,
    Guid?                                           HeroImageMediaId,
    byte                                            Status,
    int                                             ProductCount,
    Dictionary<string, SubCategoryTranslationInput> Translations,
    string?                                         RowVersion,
    DateTime                                        CreatedAt,
    DateTime                                        UpdatedAt);

public sealed record UpsertSubCategoryRequest(
    Guid?                                            CategoryId       = null,
    string?                                          Slug             = null,
    int?                                             SortOrder        = null,
    Guid?                                            ImageMediaId     = null,
    Guid?                                            HeroImageMediaId = null,
    byte?                                            Status           = null,
    Dictionary<string, SubCategoryTranslationInput>? Translations     = null,
    string?                                          RowVersion       = null)
{
    public bool ClearImage     { get; init; }
    public bool ClearHeroImage { get; init; }
}

public sealed record CertificationTranslationInput(
    string? SubLabel    = null,
    string? Description = null);

public sealed record AdminCertificationDto(
    Guid                                              Id,
    string                                            Slug,
    string                                            Mark,
    Guid?                                             LogoMediaId,
    Guid?                                             DownloadId,
    int                                               SortOrder,
    byte                                              Status,
    int                                               ProductCount,
    Dictionary<string, CertificationTranslationInput> Translations,
    DateTime                                          CreatedAt,
    DateTime                                          UpdatedAt);

public sealed record UpsertCertificationRequest(
    string?                                            Slug         = null,
    string?                                            Mark         = null,
    Guid?                                              LogoMediaId  = null,
    Guid?                                              DownloadId   = null,
    int?                                               SortOrder    = null,
    byte?                                              Status       = null,
    Dictionary<string, CertificationTranslationInput>? Translations = null)
{
    public bool ClearLogo { get; init; }
}

/// <summary>
/// 部位（7 筆，固定）。**刻意只有 GET / PUT** —— 人體圖的座標與 <c>ShowOnBodyMap</c>
/// 都寫在前端版型與 Application 的座標裡，讓後台能新增或刪除部位只會做出對不上的資料。
/// 名稱不建 translation 表，用雙語欄位（docs/05 §3.2）。
/// </summary>
public sealed record AdminBodyPartDto(
    Guid   Id,
    string Slug,
    string NameEn,
    string NameZhTw,
    bool   ShowOnBodyMap,
    int    SortOrder,
    int    ProductCount);

public sealed record UpdateBodyPartRequest(
    string? NameEn        = null,
    string? NameZhTw      = null,
    bool?   ShowOnBodyMap = null,
    int?    SortOrder     = null);
