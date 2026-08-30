using System.Text.Json.Nodes;
using EuniceMed.Api.Common;
using EuniceMed.Api.Data;
using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace EuniceMed.Api.Services;

/// <summary>
/// 重建 <see cref="MediaUsage"/> 列。docs/05-database.md §3.10。
///
/// <para>
/// **刻意不做成 SaveChangesInterceptor**：
/// 這裡要走 schema、是非同步的，而且應該在呼叫點看得見。
/// 兩種機制對應兩件本質不同的事。
/// </para>
/// </summary>
public sealed class MediaUsageWriter(AppDbContext db)
{
    /// <summary>
    /// 重建某個區段的引用列。
    ///
    /// <para>
    /// 一個區段的每個語系各有一份 <c>DataJson</c>，可能引用不同的圖，
    /// 所以要逐語系走一遍並各自記 <c>Locale</c>。
    /// </para>
    /// </summary>
    public async Task RebuildForSectionAsync(
        PageSection section, PageSchemaRegistry registry, CancellationToken ct = default)
    {
        var pageKey = section.Page?.Key
            ?? await db.Set<Page>().Where(p => p.Id == section.PageId)
                       .Select(p => p.Key).FirstAsync(ct);

        if (!registry.TryGet(pageKey, section.SectionKey, out var schema)) return;

        var translations = section.Translations.Count > 0
            ? section.Translations
            : await db.Set<PageSectionTranslation>()
                      .Where(t => t.PageSectionId == section.Id).ToListAsync(ct);

        var wanted = new List<MediaUsage>();
        var now = Clock.Now;

        foreach (var tr in translations)
        {
            var data = JsonNode.Parse(tr.DataJson);
            foreach (var m in SectionWalker.FindMedia(schema.Raw, data))
            {
                wanted.Add(new MediaUsage
                {
                    MediaId   = m.MediaId,
                    Entity    = nameof(PageSection),
                    EntityId  = section.Id,
                    Locale    = tr.Locale,
                    FieldPath = m.FieldPath,
                    UpdatedAt = now,
                });
            }
        }

        await ReplaceAsync(nameof(PageSection), section.Id, wanted, ct);
    }

    /// <summary>FK 欄位型的媒體引用（Product、Category 等）用這個。</summary>
    public Task RebuildAsync(
        string entity, Guid entityId, IEnumerable<(string FieldPath, Guid MediaId)> refs,
        CancellationToken ct = default)
    {
        var now = Clock.Now;
        var wanted = refs.Select(r => new MediaUsage
        {
            MediaId   = r.MediaId,
            Entity    = entity,
            EntityId  = entityId,
            FieldPath = r.FieldPath,
            UpdatedAt = now,
        }).ToList();

        return ReplaceAsync(entity, entityId, wanted, ct);
    }

    /// <summary>整批換掉某實體的引用列：先刪後插，同一個交易內完成。</summary>
    private async Task ReplaceAsync(
        string entity, Guid entityId, List<MediaUsage> wanted, CancellationToken ct)
    {
        // 同一路徑重複引用同一張圖是資料問題，不是兩筆引用 —— 先去重，
        // 否則會撞 UX_MediaUsage。
        var deduped = wanted
            .GroupBy(u => (u.MediaId, u.Entity, u.EntityId, u.FieldPath))
            .Select(g => g.First())
            .ToList();

        var strategy = db.Database.CreateExecutionStrategy();

        // EnableRetryOnFailure 會讓自起的 transaction 拋例外，必須包在
        // execution strategy 裡（docs/05 §6）。
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);

            await db.Set<MediaUsage>()
                .Where(u => u.Entity == entity && u.EntityId == entityId)
                .ExecuteDeleteAsync(ct);

            if (deduped.Count > 0)
            {
                db.Set<MediaUsage>().AddRange(deduped);
                await db.SaveChangesAsync(ct);
            }

            await tx.CommitAsync(ct);
        });
    }
}
