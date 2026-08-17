using EuniceMed.Api.Common;
using EuniceMed.Api.Data;
using EuniceMed.Api.Models.Dtos;
using EuniceMed.Api.Models.Entities;
using EuniceMed.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EuniceMed.Api.Handlers;

/// <summary>
/// 媒體庫。docs/11-media-specs.md、docs/04-api.md §6。
///
/// <para>
/// **API 是縮圖的執行者**，後台只負責顯示提示與送出 <c>presetKey</c>。
/// 尺寸與階梯的唯一真相來源是 `Api/Media/media-presets.json`。
/// </para>
/// </summary>
public sealed class MediaHandler(
    AppDbContext          db,
    ImageService          images,
    IBlobStorageService   blobs,
    ILogger<MediaHandler> logger)
{
    private static MediaPresetCatalog Presets => MediaPresetCatalog.Instance.Value;

    /// <summary>GET /admin/media-presets —— 後台所有上傳提示文字的來源。</summary>
    public IActionResult GetPresets()
    {
        var items = Presets.All.Select(p => new PresetDto(
            p.Key, p.Label, p.Aspect, p.Width, p.Height, p.MaxBytes, p.Formats,
            new Dictionary<string, string> { ["en"] = p.Hint("en"), ["zh-TW"] = p.Hint("zh-TW") }));

        return new OkObjectResult(ApiResponse.Ok(new { presets = items }));
    }

    /// <summary>
    /// POST /admin/media —— multipart 代傳並依 preset 階梯縮圖。
    ///
    /// <para>
    /// 硬拒絕回 415 / 413 / 400；比例、解析度、檔案大小只回 <c>warnings</c> 不阻擋
    /// （docs/11 §4）。
    /// </para>
    /// </summary>
    public async Task<IActionResult> UploadAsync(HttpRequest req)
    {
        var form = await req.ReadFormAsync();

        var file = form.Files.GetFile("file")
            ?? throw AppException.BadRequest("缺少檔案欄位 'file'。");

        var presetKey = form["presetKey"].FirstOrDefault();
        if (!Presets.TryGet(presetKey, out var preset))
            throw AppException.BadRequest(
                $"未知的 presetKey '{presetKey}'。可用值見 GET /admin/media-presets。");

        if (preset.IsDocument)
            throw AppException.BadRequest(
                "PDF 請走 POST /admin/uploads/sas 直傳，不經此端點（避免大檔佔用 Function）。");

        var altText = form["altText"].FirstOrDefault();

        await blobs.EnsureContainersAsync(req.HttpContext.RequestAborted);

        using var stream = file.OpenReadStream();
        var rendered = images.Render(stream, file.FileName, preset);

        // 原檔另存私有容器，供日後 preset 調整時 reprocess
        stream.Position = 0;
        using var originalBuf = new MemoryStream();
        await file.CopyToAsync(originalBuf, req.HttpContext.RequestAborted);
        var originalUrl = await blobs.UploadOriginalAsync(
            $"{Path.GetFileNameWithoutExtension(rendered.Files[0].FileName)}{Path.GetExtension(file.FileName)}",
            originalBuf.ToArray(), file.ContentType, req.HttpContext.RequestAborted);

        var master = rendered.Files.First(f => f.IsMaster);
        var uploaded = new List<(RenderedImage File, string Url)>();

        foreach (var f in rendered.Files)
        {
            var url = await blobs.UploadMediaAsync(
                f.FileName, f.Bytes, ContentTypeFor(f.Format), req.HttpContext.RequestAborted);
            uploaded.Add((f, url));
        }

        var masterUrl = uploaded.First(u => u.File.IsMaster).Url;

        var media = new Media
        {
            BlobUrl         = masterUrl,
            FileName        = master.FileName,
            MimeType        = ContentTypeFor(master.Format),
            SizeBytes       = master.Bytes.Length,
            AltText         = altText,
            Width           = master.Width,
            Height          = master.Height,
            PresetKey       = preset.Key,
            OriginalWidth   = rendered.OriginalWidth,
            OriginalHeight  = rendered.OriginalHeight,
            OriginalBlobUrl = originalUrl,
            CreatedAt       = Clock.Now,
        };
        db.Media.Add(media);

        foreach (var (f, url) in uploaded)
        {
            db.Set<MediaVariant>().Add(new MediaVariant
            {
                MediaId   = media.Id,
                Format    = f.Format,
                Width     = f.Width,
                Height    = f.Height,
                SizeBytes = f.Bytes.Length,
                BlobUrl   = url,
            });
        }

        await db.SaveChangesAsync(req.HttpContext.RequestAborted);

        logger.LogInformation(
            "Media uploaded: {Id} preset={Preset} files={Count} warnings={Warnings}",
            media.Id, preset.Key, uploaded.Count, rendered.Warnings.Count);

        var response = new MediaUploadResponse(
            media.Id, preset.Key, masterUrl, media.Width, media.Height, media.SizeBytes,
            new OriginalInfo(rendered.OriginalWidth, rendered.OriginalHeight, originalBuf.Length),
            uploaded.Select(u => new MediaVariantDto(u.File.Format, u.File.Width, u.File.Height, u.Url)).ToArray(),
            rendered.Warnings.Select(w => new UploadWarningDto(w.Code, w.Expected, w.Actual, w.Message)).ToArray());

        return new ObjectResult(ApiResponse.Ok(response, "上傳完成。")) { StatusCode = 201 };
    }

    /// <summary>GET /admin/media?search=&amp;presetKey=</summary>
    public async Task<IActionResult> GetAllAsync(HttpRequest req)
    {
        var search    = ProductHandler.Nullable(req.Query["search"]);
        var presetKey = ProductHandler.Nullable(req.Query["presetKey"]);

        var q = db.Media.AsQueryable();
        if (presetKey is not null) q = q.Where(m => m.PresetKey == presetKey);
        if (search is not null)
            q = q.Where(m => m.FileName.Contains(search) || (m.AltText != null && m.AltText.Contains(search)));

        var rows = await q.OrderByDescending(m => m.CreatedAt).Take(200).ToListAsync();
        var ids  = rows.Select(m => m.Id).ToList();

        var variantCounts = await db.Set<MediaVariant>()
            .Where(v => ids.Contains(v.MediaId))
            .GroupBy(v => v.MediaId).Select(g => new { g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.N);

        var usageCounts = await db.Set<MediaUsage>()
            .Where(u => ids.Contains(u.MediaId))
            .GroupBy(u => u.MediaId).Select(g => new { g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.N);

        var items = rows.Select(m =>
        {
            Presets.TryGet(m.PresetKey, out var p);
            return new MediaListItemDto(
                m.Id, m.PresetKey, m.BlobUrl, m.FileName, m.AltText, m.Width, m.Height, m.SizeBytes,
                variantCounts.GetValueOrDefault(m.Id),
                usageCounts.GetValueOrDefault(m.Id),
                p?.Width is { } w && m.IsBelowPresetWidth(w),
                m.CreatedAt);
        });

        return new OkObjectResult(ApiResponse.Ok(items.ToArray()));
    }

    /// <summary>GET /admin/media/{id}/usages —— 引用反查。</summary>
    public async Task<IActionResult> GetUsagesAsync(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return new BadRequestObjectResult(ApiResponse.Fail("Invalid media ID format."));

        var usages = await db.Set<MediaUsage>()
            .Where(u => u.MediaId == guid)
            .Select(u => new MediaUsageDto(u.Entity, u.EntityId, u.Locale, u.FieldPath))
            .ToArrayAsync();

        return new OkObjectResult(ApiResponse.Ok(usages));
    }

    /// <summary>DELETE /admin/media/{id} —— 有引用時回 409。</summary>
    public async Task<IActionResult> DeleteAsync(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return new BadRequestObjectResult(ApiResponse.Fail("Invalid media ID format."));

        var media = await db.Media.FindAsync(guid) ?? throw AppException.NotFound("Media");

        var usages = await db.Set<MediaUsage>().CountAsync(u => u.MediaId == guid);
        if (usages > 0)
            throw AppException.Conflict(
                $"此媒體仍被 {usages} 處引用，無法刪除。可用 GET /admin/media/{id}/usages 查看。");

        // 先刪 Blob 再刪 DB：反過來的話 Blob 失敗會留下孤兒 DB 列，
        // 而孤兒 Blob 比孤兒 DB 列容易清理。
        var variants = await db.Set<MediaVariant>().Where(v => v.MediaId == guid).ToListAsync();
        foreach (var v in variants)
        {
            try { await blobs.DeleteAsync(v.BlobUrl); }
            catch (Exception ex) { logger.LogWarning(ex, "刪除 blob 失敗 {Url}，繼續。", v.BlobUrl); }
        }

        db.Media.Remove(media);   // MediaVariant 為 Cascade
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok($"媒體 '{id}' 已刪除。"));
    }

    /// <summary>POST /admin/uploads/sas —— PDF 直傳。</summary>
    public async Task<IActionResult> CreateSasAsync(HttpRequest req)
    {
        var body = await req.ReadFromJsonAsync<SasRequest>();
        if (body is null || string.IsNullOrWhiteSpace(body.FileName))
            return new BadRequestObjectResult(ApiResponse.Fail("fileName 為必填。"));

        var ext = Path.GetExtension(body.FileName).TrimStart('.').ToLowerInvariant();
        if (ext != "pdf")
            throw AppException.UnsupportedMediaType("此端點只接受 PDF。圖片請走 POST /admin/media。");

        await blobs.EnsureContainersAsync(req.HttpContext.RequestAborted);

        var name = $"{FileNames.Normalize(Path.GetFileNameWithoutExtension(body.FileName))}-{Guid.NewGuid():N}"[..40] + ".pdf";
        var validFor = TimeSpan.FromMinutes(15);
        var (uploadUrl, blobUrl) = await blobs.CreateUploadSasAsync(name, validFor);

        return new OkObjectResult(ApiResponse.Ok(
            new SasResponse(uploadUrl, blobUrl, DateTimeOffset.UtcNow.Add(validFor))));
    }

    private static string ContentTypeFor(string format) => format switch
    {
        "webp" => "image/webp",
        "png"  => "image/png",
        "svg"  => "image/svg+xml",
        _      => "image/jpeg",
    };
}
