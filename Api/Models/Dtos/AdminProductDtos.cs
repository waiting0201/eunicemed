using System.Text.Json.Nodes;

namespace EuniceMed.Api.Models.Dtos;

// ── 後台產品 ──────────────────────────────────────────────────────────────
// 形狀沿用 AdminCollectionDto 的慣例：一律回「全部語系」，key = locale，
// 編輯者要能同時看到 en / zh-TW 才對照得出漏翻的欄位。
//
// 差別在產品有 6 組關聯。**除了 related 以外全部內嵌在同一個 payload**：
// 後台的產品表單是一次存檔，關聯拆成獨立端點會讓「存檔」變成多次請求，
// 中途失敗就留下半套資料。related 之所以獨立，是因為它在後台是另一個畫面
// （挑其他產品、排順序），存檔時機本來就不同 —— 且空陣列在此有特殊語意
// （回到自動計算），混在主 payload 裡會與「這次沒帶這個欄位」分不出來。

/// <summary>產品圖引用。主圖由應用層保證唯一（DB 端無約束）。</summary>
public sealed record AdminProductImageInput(
    Guid MediaId,
    bool IsPrimary = false,
    int  SortOrder = 0);

public sealed record ProductTranslationInput(
    string    Name,
    string?   Summary        = null,
    string?   Description    = null,
    string?   FeaturedBlurb  = null,
    JsonNode? Features       = null,
    JsonNode? UseCases       = null,
    JsonNode? Specs          = null,
    JsonNode? SizeChart      = null,
    JsonNode? Conditions     = null,
    string?   SeoTitle       = null,
    string?   SeoDescription = null,
    Guid?     OgImageMediaId = null);

public sealed record AdminProductDto(
    Guid                                        Id,
    string                                      Slug,
    string?                                     Sku,
    Guid                                        CategoryId,
    Guid?                                       SubCategoryId,
    Guid?                                       CollectionId,
    byte                                        Status,
    bool                                        IsFeatured,
    int                                         FeaturedSortOrder,
    Guid?                                       UseCaseImageMediaId,
    Guid?                                       SizeChartDiagramMediaId,
    int                                         SortOrder,
    DateTime?                                   PublishedAt,
    AdminProductImageInput[]                    Images,
    Guid[]                                      BodyPartIds,
    Guid[]                                      CertificationIds,
    Guid[]                                      TagIds,
    Dictionary<string, ProductTranslationInput> Translations,
    // RowVersion：base64 的 ROWVERSION。PUT 時原樣送回即可取得 409 併發保護。
    string?                                     RowVersion,
    DateTime                                    CreatedAt,
    DateTime                                    UpdatedAt);

/// <summary>後台列表列。刻意不帶關聯與 JSON 欄位 —— 那些只有編輯單筆時才需要。</summary>
public sealed record AdminProductListItemDto(
    Guid      Id,
    string    Slug,
    string?   Sku,
    string?   NameEn,
    string?   NameZhTw,
    string?   CategorySlug,
    string?   SubCategorySlug,
    string?   CollectionSlug,
    byte      Status,
    bool      IsFeatured,
    int       SortOrder,
    string?   PrimaryImageUrl,
    DateTime? PublishedAt,
    DateTime  UpdatedAt);

/// <summary>
/// 新增／更新產品。
///
/// <para>
/// **null 與空陣列在此是兩件事**：欄位為 null＝這次不動它，空陣列＝清空。
/// 少了這個區分，只想改名稱的請求會把所有關聯洗掉（後台表單分頁載入時很容易發生）。
/// </para>
/// </summary>
public sealed record UpsertProductRequest(
    string?                                      Slug                = null,
    string?                                      Sku                 = null,
    Guid?                                        CategoryId          = null,
    Guid?                                        SubCategoryId       = null,
    Guid?                                        CollectionId        = null,
    bool?                                        IsFeatured          = null,
    int?                                         FeaturedSortOrder   = null,
    Guid?                                        UseCaseImageMediaId = null,
    Guid?                                        SizeChartDiagramMediaId = null,
    int?                                         SortOrder           = null,
    AdminProductImageInput[]?                    Images              = null,
    Guid[]?                                      BodyPartIds         = null,
    Guid[]?                                      CertificationIds    = null,
    Guid[]?                                      TagIds              = null,
    // 值為 null = **刪除該語系的翻譯**（見 AdminProductHandler.ApplyTranslations）。
    // 未帶到的語系維持原狀 —— 兩者是不同的意思。
    Dictionary<string, ProductTranslationInput?>? Translations       = null,
    string?                                      RowVersion          = null)
{
    /// <summary>
    /// 可為 null 的 FK（子分類／系列／使用情境圖）要能「清空」，但 <c>null</c> 已被
    /// 用來表示「不動它」。因此以明確的旗標表達清空意圖。
    /// </summary>
    public bool ClearSubCategory       { get; init; }
    public bool ClearCollection        { get; init; }
    public bool ClearUseCaseImage      { get; init; }
    public bool ClearSizeChartDiagram  { get; init; }
}

/// <summary>PUT /admin/products/{id}/related —— 順序即畫面順序。空陣列 = 回到自動計算。</summary>
public sealed record UpdateRelatedRequest(Guid[] RelatedProductIds);

public sealed record AdminRelatedItemDto(
    Guid    Id,
    string  Slug,
    string? NameEn,
    string? Sku,
    int     SortOrder);
