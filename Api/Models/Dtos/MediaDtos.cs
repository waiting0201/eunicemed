namespace EuniceMed.Api.Models.Dtos;

public sealed record PresetDto(
    string                     Key,
    Dictionary<string, string> Label,
    string?                    Aspect,
    int?                       Width,
    int?                       Height,
    long                       MaxBytes,
    string[]                   Formats,
    Dictionary<string, string> Hint);

public sealed record MediaVariantDto(string Format, int Width, int Height, string Url);

public sealed record MediaUploadResponse(
    Guid                Id,
    string              PresetKey,
    string              Url,
    int?                Width,
    int?                Height,
    long                SizeBytes,
    OriginalInfo        Original,
    MediaVariantDto[]   Variants,
    UploadWarningDto[]  Warnings);

public sealed record OriginalInfo(int Width, int Height, long SizeBytes);

public sealed record UploadWarningDto(string Code, string? Expected, string? Actual, string Message);

public sealed record MediaListItemDto(
    Guid      Id,
    string    PresetKey,
    string    Url,
    string    FileName,
    string?   AltText,
    int?      Width,
    int?      Height,
    long      SizeBytes,
    int       VariantCount,
    int       UsageCount,
    /// <summary>即時計算，不存欄位 —— preset 寬度會調整，存下來的旗標會過時。</summary>
    bool      BelowPresetWidth,
    DateTime  CreatedAt);

public sealed record MediaUsageDto(string Entity, Guid EntityId, string? Locale, string FieldPath);

public sealed record SasRequest(string FileName, string ContentType);

public sealed record SasResponse(string UploadUrl, string BlobUrl, DateTimeOffset ExpiresAt);

/// <summary>
/// 直傳完成後把檔案登記成一筆 Media。
/// <c>blobUrl</c> 必須是同一輪 SAS 回傳的那個網址。
/// </summary>
public sealed record RegisterUploadRequest(string BlobUrl, string? DisplayName = null);
