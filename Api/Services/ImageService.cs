using System.Security.Cryptography;
using System.Text;
using EuniceMed.Api.Common;
using SkiaSharp;

namespace EuniceMed.Api.Services;

/// <summary>一個輸出檔。</summary>
public sealed record RenderedImage(
    string Format,
    int    Width,
    int    Height,
    byte[] Bytes,
    string FileName,
    bool   IsMaster);

/// <summary>不阻擋的提醒（docs/11 §4）。後台原樣顯示。</summary>
public sealed record UploadWarning(string Code, string? Expected, string? Actual, string Message);

public sealed record RenderResult(
    IReadOnlyList<RenderedImage> Files,
    int OriginalWidth,
    int OriginalHeight,
    IReadOnlyList<UploadWarning> Warnings);

/// <summary>
/// 上傳圖片的縮圖管線。docs/11-media-specs.md §1.2／§2a。
///
/// <para>
/// 用 **SkiaSharp**（MIT）而非 ImageSharp —— 後者的 Six Labors Split License
/// 對年營收 &gt; USD 1M 者需購商用授權（docs/01 §5）。
/// </para>
///
/// <para>
/// ⚠️ **記憶體**：解碼一張 8000×5000 的來源圖約需 160MB（4 bytes/px），
/// 再加上輸出緩衝。Function App 實例必須設 2048MB，512MB 會 OOM（docs/07 §10）。
/// </para>
/// </summary>
public sealed class ImageService
{
    // ── 硬上限（docs/11 §4）：違反即拒絕，不是警告 ──────────────────────
    private const long MaxBytes     = 20 * 1024 * 1024;
    private const int  MaxLongEdge  = 8000;
    private const long MaxPixels    = 40_000_000;   // decompression bomb 防線

    private const int WebpQuality = 78;
    private const int JpegQuality = 78;

    private static readonly HashSet<string> RasterFormats =
        new(StringComparer.OrdinalIgnoreCase) { "jpg", "jpeg", "png", "webp" };

    /// <summary>
    /// 依 preset 產生所有輸出檔。
    ///
    /// <para>
    /// 檔名慣例：master 為 <c>{slug}-{hash}.{ext}</c>，
    /// 其餘寬度為 <c>{slug}-{hash}-{width}.webp</c>。
    /// **這與前端 `apps/web/lib/image.ts` 的 `srcSetFor` 是隱含耦合** ——
    /// 改這裡就要改那裡，兩邊都有註解互指。
    /// </para>
    /// </summary>
    public RenderResult Render(Stream source, string originalFileName, MediaPreset preset)
    {
        var ext = Path.GetExtension(originalFileName).TrimStart('.').ToLowerInvariant();

        if (!preset.Formats.Contains(ext, StringComparer.OrdinalIgnoreCase))
            throw AppException.UnsupportedMediaType(
                $"欄位 '{preset.Key}' 只接受 {string.Join(" / ", preset.Formats)}，收到 .{ext}。");

        if (!RasterFormats.Contains(ext))
            throw AppException.UnsupportedMediaType($"不支援的影像格式 .{ext}。");

        using var ms = new MemoryStream();
        source.CopyTo(ms);
        var bytes = ms.ToArray();

        if (bytes.LongLength > MaxBytes)
            throw AppException.PayloadTooLarge(
                $"檔案 {bytes.LongLength / 1024 / 1024} MB，超過 {MaxBytes / 1024 / 1024} MB 上限。");

        // ⚠️ 一律從 byte[] 出發，不要把同一個 Stream 傳給 SKCodec 之後再用它 ——
        // SKCodec.Create(Stream) 會**接管並關閉**該 stream，後續讀 Length 會拋
        // ObjectDisposedException。
        using var data = SKData.CreateCopy(bytes);

        // 先讀 header 判尺寸，避免直接對 decompression bomb 解碼
        using var codec = SKCodec.Create(data)
            ?? throw AppException.BadRequest("檔案損毀或不是有效的影像。");

        var info = codec.Info;
        if (Math.Max(info.Width, info.Height) > MaxLongEdge)
            throw AppException.BadRequest(
                $"長邊 {Math.Max(info.Width, info.Height)}px 超過 {MaxLongEdge}px 上限。");

        if ((long)info.Width * info.Height > MaxPixels)
            throw AppException.BadRequest(
                $"總像素 {(long)info.Width * info.Height / 1_000_000} MP 超過 {MaxPixels / 1_000_000} MP 上限。");

        using var original = SKBitmap.Decode(data)
            ?? throw AppException.BadRequest("影像無法解碼。");

        var warnings = Inspect(original, bytes.LongLength, preset);

        var stem = FileNames.Normalize(Path.GetFileNameWithoutExtension(originalFileName));
        var hash = FileNames.ShortHash(bytes);
        var baseName = $"{stem}-{hash}";

        var files = new List<RenderedImage>();

        // 原格式：只出一張當退路，檔名不帶寬度後綴 —— 這是 master。
        var outExt = ext == "png" ? "png" : "jpg";
        foreach (var w in preset.Output.Original)
        {
            var target = Math.Min(w, original.Width);   // 只縮不放
            files.Add(Encode(original, target, outExt, $"{baseName}.{outExt}", IsMaster: true));
        }

        // WebP 階梯。
        //
        // ⚠️ 檔名一律用**實際輸出寬度**，且以實際寬度去重。
        // 因為「只縮不放」，來源圖比 preset 小的時候多個階會塌到同一個寬度
        // （例如來源 1000px、階梯 1200/800/400 → 1000/800/400）。
        // 初版用「規劃寬度」命名，於是 1200 那階產出的其實是 1000px 的檔，
        // 而檔名寫 1200 —— 前端照名字去要就 404。
        //
        // 消費端**不應該自己拼檔名**：API 會回完整的 variant 清單，照著用即可。
        var emitted = new HashSet<int>();
        foreach (var w in preset.Output.Webp)
        {
            var target = Math.Min(w, original.Width);
            if (!emitted.Add(target)) continue;

            files.Add(Encode(original, target, "webp", $"{baseName}-{target}.webp", IsMaster: false));
        }

        return new RenderResult(files, original.Width, original.Height, warnings);
    }

    /// <summary>比例／解析度／檔案大小的提醒 —— 全部**不阻擋**（docs/11 §1.2）。</summary>
    private static List<UploadWarning> Inspect(SKBitmap img, long bytes, MediaPreset preset)
    {
        var warnings = new List<UploadWarning>();

        if (preset.AspectRatio is { } want)
        {
            var actual = (double)img.Width / img.Height;
            if (Math.Abs(actual - want) / want > 0.05)   // 偏離 5% 以上才提醒
                warnings.Add(new UploadWarning(
                    "aspect_mismatch", preset.Aspect, $"{img.Width}:{img.Height}",
                    $"此欄位建議 {preset.Aspect}，您的圖為 {img.Width}×{img.Height}，兩側會被裁切。"));
        }

        if (preset.Width is { } w && img.Width < w * 0.8)
            warnings.Add(new UploadWarning(
                "low_resolution", $"{w}px", $"{img.Width}px",
                $"建議寬度 {w}px，您的圖只有 {img.Width}px，放大顯示時會糊。"));

        if (bytes > preset.MaxBytes)
            warnings.Add(new UploadWarning(
                "oversized", $"{preset.MaxBytes / 1024} KB", $"{bytes / 1024} KB",
                $"建議 ≤{preset.MaxBytes / 1024} KB，您的檔案 {bytes / 1024} KB，載入會偏慢。"));

        return warnings;
    }

    /// <summary>
    /// 等比縮至指定寬度並編碼。
    ///
    /// <para>
    /// 重新編碼本身就會**丟掉 EXIF 與內嵌色彩描述檔** —— SkiaSharp 不會把 metadata
    /// 帶到輸出。這正是規格要的「移除 EXIF、轉 sRGB」，不需要額外處理。
    /// </para>
    /// </summary>
    private static RenderedImage Encode(SKBitmap src, int targetWidth, string format, string fileName, bool IsMaster)
    {
        var width  = Math.Min(targetWidth, src.Width);            // 只縮不放
        var height = (int)Math.Round(src.Height * (width / (double)src.Width));

        using var resized = width == src.Width
            ? src.Copy()
            : src.Resize(new SKImageInfo(width, height), new SKSamplingOptions(SKCubicResampler.Mitchell));

        if (resized is null)
            throw AppException.BadRequest("影像縮放失敗。");

        using var image = SKImage.FromBitmap(resized);

        var (skFormat, quality) = format switch
        {
            "webp" => (SKEncodedImageFormat.Webp, WebpQuality),
            "png"  => (SKEncodedImageFormat.Png, 100),          // PNG 無損，保留透明度
            _      => (SKEncodedImageFormat.Jpeg, JpegQuality),
        };

        using var data = image.Encode(skFormat, quality)
            ?? throw AppException.BadRequest($"無法編碼為 {format}。");

        return new RenderedImage(format, width, height, data.ToArray(), fileName, IsMaster);
    }
}

/// <summary>檔名正規化與內容雜湊。</summary>
public static class FileNames
{
    /// <summary>小寫、去空白、只留 a-z0-9 與連字號。中文檔名會被清空，退回 "image"。</summary>
    public static string Normalize(string name) => Slugify.Make(name, fallback: "image");

    /// <summary>
    /// 內容雜湊的前 8 碼。用於檔名去重，也讓同一路徑的檔案可以設
    /// <c>Cache-Control: immutable</c> —— 內容變了檔名就變（docs/07 §1.1）。
    /// </summary>
    public static string ShortHash(byte[] content) =>
        Convert.ToHexString(SHA256.HashData(content))[..8].ToLowerInvariant();
}
