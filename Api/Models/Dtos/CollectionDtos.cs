namespace EuniceMed.Api.Models.Dtos;

public sealed record CollectionDto(
    string  Slug,
    string  Name,
    string? Description,
    byte    Strength,
    int     SortOrder);

// ── 後台 ─────────────────────────────────────────────────────────────────
// 後台一律回「全部語系」，key = locale。這與公開端點只回單一語系的形狀不同，
// 是刻意的：編輯者要同時看到 en / zh-TW 才能對照翻譯。

public sealed record CollectionTranslationInput(
    string  Name,
    string? Description = null);

public sealed record AdminCollectionDto(
    Guid                                            Id,
    string                                          Slug,
    byte                                            Strength,
    int                                             SortOrder,
    Dictionary<string, CollectionTranslationInput>  Translations,
    DateTime                                        CreatedAt,
    DateTime                                        UpdatedAt);

public sealed record UpsertCollectionRequest(
    string?                                          Slug         = null,
    // nullable：0 是合法的排序值，用「!= 0」分辨有沒有帶會把它吃掉
    byte?                                            Strength     = null,
    int?                                             SortOrder    = null,
    Dictionary<string, CollectionTranslationInput?>? Translations = null);
