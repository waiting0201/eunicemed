using System.Data;
using Dapper;
using EuniceMed.Api.Models.Dtos;

namespace EuniceMed.Api.Services.Dapper;

/// <summary>
/// 一次撈完一頁所有圖片的變體，避免每張圖一次查詢（N+1）。
///
/// <para>
/// 公開端點的 <see cref="MediaRefDto"/> **一定要帶 variants**：本站無 CDN，
/// 響應式尺寸是上傳當下產生的實體檔案，而縮放是「只縮不放」——
/// 來源比 preset 窄時就沒有那個寬度的檔案。消費端自己拼檔名必然 404。
/// </para>
/// </summary>
internal static class MediaVariantLoader
{
    public static async Task<Dictionary<Guid, ImageVariantDto[]>> LoadAsync(
        IDbConnection db, IEnumerable<Guid?> mediaIds)
    {
        var ids = mediaIds.Where(i => i.HasValue).Select(i => i!.Value).Distinct().ToArray();
        if (ids.Length == 0) return [];

        var rows = await db.QueryAsync<(Guid MediaId, string Format, int Width, string BlobUrl)>(
            """
            SELECT MediaId, Format, Width, BlobUrl FROM MediaVariants
            WHERE MediaId IN @ids
            ORDER BY Width DESC
            """, new { ids });

        return rows.GroupBy(r => r.MediaId)
                   .ToDictionary(g => g.Key,
                                 g => g.Select(r => new ImageVariantDto(r.Format, r.Width, r.BlobUrl)).ToArray());
    }

    public static MediaRefDto? Ref(
        string? url, string? alt, Guid? mediaId, Dictionary<Guid, ImageVariantDto[]> variants) =>
        url is null ? null : new MediaRefDto(url, alt, mediaId is { } id ? variants.GetValueOrDefault(id) : null);
}
