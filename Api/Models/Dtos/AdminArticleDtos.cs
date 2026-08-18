using System.Text.Json.Nodes;

namespace EuniceMed.Api.Models.Dtos;

// ── 後台文章分類 ──────────────────────────────────────────────────────────
// slug **只在同一個 Kind 內唯一**（`UX_ArticleCategory (Kind, Slug)`）——
// seed 的 `sponsorship` 在 news 與 insight 各有一筆，那是刻意的。

public sealed record ArticleCategoryTranslationInput(
    string    Name,
    JsonNode? Promo = null);

public sealed record AdminArticleCategoryDto(
    Guid                                               Id,
    byte                                               Kind,
    string                                             Slug,
    int                                                SortOrder,
    byte                                               Status,
    int                                                ArticleCount,
    Dictionary<string, ArticleCategoryTranslationInput> Translations,
    DateTime                                           CreatedAt,
    DateTime                                           UpdatedAt);

public sealed record UpsertArticleCategoryRequest(
    byte?                                                Kind         = null,
    string?                                              Slug         = null,
    int?                                                 SortOrder    = null,
    byte?                                                Status       = null,
    Dictionary<string, ArticleCategoryTranslationInput?>? Translations = null);

// ── 後台文章（News / Insights 共用）───────────────────────────────────────

public sealed record ArticleTranslationInput(
    string  Title,
    string? Standfirst     = null,
    string? Body           = null,
    string? Excerpt        = null,
    string? AuthorName     = null,
    string? Disclaimer     = null,
    string? SeoTitle       = null,
    string? SeoDescription = null);

public sealed record AdminArticleDto(
    Guid                                       Id,
    string                                     Slug,
    byte                                       Type,
    Guid?                                      CategoryId,
    Guid?                                      CoverMediaId,
    short?                                     ReadMinutes,
    bool                                       IsFeatured,
    byte                                       Status,
    DateTime?                                  PublishedAt,
    Guid[]                                     TagIds,
    bool                                       HasEvent,
    int                                        GalleryCount,
    Dictionary<string, ArticleTranslationInput> Translations,
    string?                                    RowVersion,
    DateTime                                   CreatedAt,
    DateTime                                   UpdatedAt);

public sealed record AdminArticleListItemDto(
    Guid      Id,
    string    Slug,
    byte      Type,
    string?   CategorySlug,
    string?   TitleEn,
    string?   TitleZhTw,
    byte      Status,
    bool      IsFeatured,
    DateTime? PublishedAt,
    DateTime  UpdatedAt);

public sealed record UpsertArticleRequest(
    string?                                     Slug         = null,
    byte?                                       Type         = null,
    Guid?                                       CategoryId   = null,
    Guid?                                       CoverMediaId = null,
    short?                                      ReadMinutes  = null,
    bool?                                       IsFeatured   = null,
    Guid[]?                                     TagIds       = null,
    // 排程發布：填未來時間，配合 /publish 使用。公開端點對未來時間的文章一律查不到
    // （docs/13 Phase 6），所以這是「先排好、時間到自動上線」，不需要排程器。
    DateTime?                                   PublishedAt  = null,
    Dictionary<string, ArticleTranslationInput?>? Translations = null,
    string?                                     RowVersion   = null)
{
    public bool ClearCategory { get; init; }
    public bool ClearCover    { get; init; }
}

// ── News 活動面板（與 Article 共用主鍵的 1:1）──────────────────────────────

public sealed record NewsEventTranslationInput(
    string? DatesLabel = null,
    string? Venue      = null,
    string? Booth      = null,
    string? CtaLabel   = null);

public sealed record AdminNewsEventDto(
    Guid                                          ArticleId,
    DateOnly?                                     StartDate,
    DateOnly?                                     EndDate,
    string?                                       ContactEmail,
    string?                                       CtaUrl,
    Dictionary<string, NewsEventTranslationInput> Translations,
    DateTime                                      UpdatedAt);

public sealed record UpsertNewsEventRequest(
    DateOnly?                                      StartDate    = null,
    DateOnly?                                      EndDate      = null,
    string?                                        ContactEmail = null,
    string?                                        CtaUrl       = null,
    Dictionary<string, NewsEventTranslationInput>? Translations = null);

// ── 圖庫 ──────────────────────────────────────────────────────────────────

/// <summary>陣列順序即畫面順序；`sortOrder` 由伺服器依索引重編。</summary>
public sealed record ArticleImageInput(Guid MediaId, int SortOrder = 0);

public sealed record UpdateGalleryRequest(ArticleImageInput[] Images);
