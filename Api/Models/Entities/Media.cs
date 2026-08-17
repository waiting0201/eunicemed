namespace EuniceMed.Api.Models.Entities;

/// <summary>
/// 媒體資產。docs/05-database.md §3.8。
///
/// <para>
/// **Phase 4 只建立資料表**，讓 Product / Category 等的 FK 成立。
/// 上傳與縮圖管線（SkiaSharp、<c>MediaVariant</c>、<c>MediaUsage</c>）屬 Phase 3，
/// 目前被「變體階梯是 2 張還是一組寬度」這題擋著（見 CLAUDE.md §7 🔴）。
/// </para>
/// </summary>
public class Media
{
    public Guid Id { get; set; }

    /// <summary>正規化後的 master 網址（已依 preset 寬縮圖）</summary>
    public string BlobUrl  { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long   SizeBytes { get; set; }

    public string? AltText { get; set; }
    public int?    Width   { get; set; }
    public int?    Height  { get; set; }

    /// <summary>square | page-band | hero-slide | … 見 Media/media-presets.json</summary>
    public string PresetKey { get; set; } = string.Empty;

    public int?    OriginalWidth   { get; set; }
    public int?    OriginalHeight  { get; set; }
    /// <summary>原檔存於私有的 media-originals 容器，供 reprocess 使用</summary>
    public string? OriginalBlobUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 「解析度不足」**刻意不存欄位** —— preset 寬度會調整，存下來的旗標會過時。
    /// 一律以 <c>Width &lt; preset.Width</c> 即時計算（docs/05 §3.8）。
    /// </summary>
    public bool IsBelowPresetWidth(int presetWidth) => Width is { } w && w < presetWidth;
}
