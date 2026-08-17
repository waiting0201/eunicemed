using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

// 命名空間刻意用 Services 而非 Media：後者會遮蔽 Media 實體型別，
// 於是 `DbSet<Media>` 會被解析成命名空間而編譯失敗。
// 資料檔仍放在 Api/Media/media-presets.json（EmbeddedResource）。
namespace EuniceMed.Api.Services;

/// <summary>
/// preset 定義。**唯一真相來源是 `Api/Media/media-presets.json`**（EmbeddedResource），
/// 人類可讀版本見 docs/11-media-specs.md §2／§2a。程式一律讀這裡，不要在別處寫死尺寸。
/// </summary>
public sealed record MediaPreset(
    string Key,
    Dictionary<string, string> Label,
    string? Aspect,
    int? Width,
    int? Height,
    long MaxBytes,
    string[] Formats,
    Dictionary<string, string> Note,
    PresetOutput Output)
{
    /// <summary>比例（寬/高）。沒有比例限制的 preset（document）回 null。</summary>
    public double? AspectRatio => Width is > 0 && Height is > 0 ? (double)Width / Height : null;

    public bool IsDocument => Key == "document";

    /// <summary>後台上傳格顯示的提示句。**不在各畫面寫死**（docs/03 §5）。</summary>
    public string Hint(string locale)
    {
        if (IsDocument)
            return locale == "zh-TW"
                ? $"PDF · 上限 {MaxBytes / 1024 / 1024} MB"
                : $"PDF · max {MaxBytes / 1024 / 1024} MB";

        var formats = string.Join('/', Formats.Select(f => f.ToUpperInvariant()));
        var kb = MaxBytes / 1024;

        return locale == "zh-TW"
            ? $"建議尺寸 {Width}×{Height}（{Aspect}）· {formats} · 建議 ≤{kb} KB · 上傳後自動縮至 {Width}px 寬"
            : $"Recommended {Width}×{Height} ({Aspect}) · {formats} · ≤{kb} KB · resized to {Width}px wide on upload";
    }
}

/// <summary>上傳當下要產生的實體檔案寬度（不是建議值）。</summary>
public sealed record PresetOutput(
    [property: JsonPropertyName("webp")] int[] Webp,
    [property: JsonPropertyName("original")] int[] Original);

public sealed class MediaPresetCatalog
{
    private readonly Dictionary<string, MediaPreset> _byKey;

    public IReadOnlyList<MediaPreset> All { get; }

    private MediaPresetCatalog(IReadOnlyList<MediaPreset> presets)
    {
        All = presets;
        _byKey = presets.ToDictionary(p => p.Key, StringComparer.Ordinal);
    }

    public bool TryGet(string? key, out MediaPreset preset)
    {
        preset = default!;
        return key is not null && _byKey.TryGetValue(key, out preset!);
    }

    /// <summary>
    /// 由內嵌資源載入。
    ///
    /// <para>
    /// 用 <see cref="Lazy{T}"/> 而非啟動時載入：Flex Consumption 的 app init 有 30 秒
    /// 硬上限，啟動路徑上能省則省（docs/07 §5.1）。這份 JSON 不大，但同樣的原則
    /// 之後也要套用在 60 個 PageSchema 上，這裡先立下規矩。
    /// </para>
    /// </summary>
    public static readonly Lazy<MediaPresetCatalog> Instance = new(Load, isThreadSafe: true);

    private static MediaPresetCatalog Load()
    {
        var asm = Assembly.GetExecutingAssembly();
        var name = asm.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("media-presets.json", StringComparison.Ordinal))
            ?? throw new InvalidOperationException(
                "找不到內嵌資源 media-presets.json —— 檢查 Api.csproj 的 EmbeddedResource 設定。");

        using var stream = asm.GetManifestResourceStream(name)!;

        var doc = JsonSerializer.Deserialize<PresetFile>(stream, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        }) ?? throw new InvalidOperationException("media-presets.json 無法解析。");

        return new MediaPresetCatalog(doc.Presets);
    }

    private sealed record PresetFile(MediaPreset[] Presets);
}
