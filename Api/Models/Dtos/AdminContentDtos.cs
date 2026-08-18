using System.Text.Json.Nodes;

namespace EuniceMed.Api.Models.Dtos;

// ── FAQ 分類 ──────────────────────────────────────────────────────────────

public sealed record FaqCategoryTranslationInput(string Name);

public sealed record AdminFaqCategoryDto(
    Guid                                          Id,
    string                                        Slug,
    int                                           SortOrder,
    byte                                          Status,
    int                                           FaqCount,
    Dictionary<string, FaqCategoryTranslationInput> Translations);

public sealed record UpsertFaqCategoryRequest(
    string?                                          Slug         = null,
    int?                                             SortOrder    = null,
    byte?                                            Status       = null,
    Dictionary<string, FaqCategoryTranslationInput>? Translations = null);

// ── FAQ ───────────────────────────────────────────────────────────────────
// 沒有 slug —— 它是折疊面板的一列，不是一個頁面（docs/05 §3.7）。

public sealed record FaqTranslationInput(string Question, string Answer);

public sealed record AdminFaqDto(
    Guid                                  Id,
    Guid                                  FaqCategoryId,
    string?                               CategorySlug,
    byte                                  Status,
    int                                   SortOrder,
    Dictionary<string, FaqTranslationInput> Translations,
    DateTime                              CreatedAt,
    DateTime                              UpdatedAt);

public sealed record UpsertFaqRequest(
    Guid?                                    FaqCategoryId = null,
    byte?                                    Status        = null,
    int?                                     SortOrder     = null,
    Dictionary<string, FaqTranslationInput>? Translations  = null);

// ── 下載 ──────────────────────────────────────────────────────────────────

public sealed record DownloadTranslationInput(
    string  Title,
    string? Description = null);

public sealed record AdminDownloadDto(
    Guid                                       Id,
    Guid                                       MediaId,
    string?                                    FileUrl,
    byte                                       Type,
    // FileLocale 是**檔案本身的語言**，與翻譯的 Locale（介面語系）是兩件事
    string                                     FileLocale,
    byte                                       Status,
    int                                        SortOrder,
    Guid[]                                     ProductIds,
    Dictionary<string, DownloadTranslationInput> Translations,
    DateTime                                   CreatedAt);

public sealed record UpsertDownloadRequest(
    Guid?                                         MediaId      = null,
    byte?                                         Type         = null,
    string?                                       FileLocale   = null,
    byte?                                         Status       = null,
    int?                                          SortOrder    = null,
    Guid[]?                                       ProductIds   = null,
    Dictionary<string, DownloadTranslationInput>? Translations = null);

// ── 銷售據點 ──────────────────────────────────────────────────────────────

public sealed record SalesLocationTranslationInput(
    string  Name,
    string? Address     = null,
    string? RegionLabel = null,
    string? Note        = null);

public sealed record AdminSalesLocationDto(
    Guid                                            Id,
    byte                                            LocationType,
    string                                          CountryCode,
    string?                                         WebsiteUrl,
    string?                                         Phone,
    byte                                            Status,
    int                                             SortOrder,
    Dictionary<string, SalesLocationTranslationInput> Translations,
    DateTime                                        CreatedAt,
    DateTime                                        UpdatedAt);

public sealed record UpsertSalesLocationRequest(
    byte?                                              LocationType = null,
    string?                                            CountryCode  = null,
    string?                                            WebsiteUrl   = null,
    string?                                            Phone        = null,
    byte?                                              Status       = null,
    int?                                               SortOrder    = null,
    Dictionary<string, SalesLocationTranslationInput>? Translations = null)
{
    public bool ClearWebsiteUrl { get; init; }
    public bool ClearPhone      { get; init; }
}

// ── 應用方案 ──────────────────────────────────────────────────────────────

public sealed record ApplicationTranslationInput(
    string    Name,
    string?   Lead           = null,
    string?   Body           = null,
    string?   MapCopy        = null,
    string?   MapCtaLabel    = null,
    JsonNode? Stats          = null,
    JsonNode? Concerns       = null,
    JsonNode? SupportLevels  = null,
    JsonNode? HowTo          = null,
    string?   Disclaimer     = null,
    string?   SeoTitle       = null,
    string?   SeoDescription = null);

public sealed record AdminApplicationDto(
    Guid                                           Id,
    string                                         Slug,
    byte                                           Type,
    Guid?                                          BodyPartId,
    Guid?                                          ImageMediaId,
    Guid?                                          CardImageMediaId,
    Guid?                                          FittingImageMediaId,
    bool                                           ShowOnBodyMap,
    JsonNode?                                      MapPosition,
    byte                                           Status,
    int                                            SortOrder,
    Guid[]                                         ProductIds,
    Dictionary<string, ApplicationTranslationInput> Translations,
    string?                                        RowVersion,
    DateTime                                       CreatedAt,
    DateTime                                       UpdatedAt);

public sealed record AdminApplicationListItemDto(
    Guid     Id,
    string   Slug,
    byte     Type,
    string?  BodyPartSlug,
    string?  NameEn,
    string?  NameZhTw,
    bool     ShowOnBodyMap,
    byte     Status,
    int      SortOrder,
    int      ProductCount,
    DateTime UpdatedAt);

public sealed record UpsertApplicationRequest(
    string?                                         Slug                = null,
    byte?                                           Type                = null,
    Guid?                                           BodyPartId          = null,
    Guid?                                           ImageMediaId        = null,
    Guid?                                           CardImageMediaId    = null,
    Guid?                                           FittingImageMediaId = null,
    bool?                                           ShowOnBodyMap       = null,
    JsonNode?                                       MapPosition         = null,
    int?                                            SortOrder           = null,
    Guid[]?                                         ProductIds          = null,
    Dictionary<string, ApplicationTranslationInput>? Translations       = null,
    string?                                         RowVersion          = null)
{
    public bool ClearBodyPart     { get; init; }
    public bool ClearImage        { get; init; }
    public bool ClearCardImage    { get; init; }
    public bool ClearFittingImage { get; init; }
    public bool ClearMapPosition  { get; init; }
}
