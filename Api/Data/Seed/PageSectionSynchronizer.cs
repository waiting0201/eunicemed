using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Entities;
using EuniceMed.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace EuniceMed.Api.Data.Seed;

/// <summary>
/// 依 <c>PageSchemas/</c> 目錄同步 <see cref="PageSection"/> 列。docs/05-database.md §5。
///
/// <para>
/// 這就是「區段不可新增／刪除」的實作 —— 區段集合由 schema registry 決定，
/// 所以 API 不提供 POST / DELETE sections。
/// </para>
///
/// <para>
/// **移除的區段標記為停用，永不硬刪** —— 版面改回來時內容還在。
/// 完全冪等：跑第二次應回報零變更。
/// </para>
/// </summary>
public sealed record SyncReport(string[] Added, string[] Disabled, string[] Reenabled, int Unchanged);

public static class PageSectionSynchronizer
{
    public static async Task<SyncReport> RunAsync(
        AppDbContext db, PageSchemaRegistry registry, CancellationToken ct = default)
    {
        var pages = await db.Set<Page>().Include(p => p.Sections).ToListAsync(ct);
        var added = new List<string>();
        var disabled = new List<string>();
        var reenabled = new List<string>();
        var unchanged = 0;
        var now = Clock.Now;

        foreach (var page in pages)
        {
            var wanted = registry.SectionsByPage.GetValueOrDefault(page.Key, []);
            var existing = page.Sections.ToDictionary(s => s.SectionKey, StringComparer.Ordinal);

            for (var i = 0; i < wanted.Length; i++)
            {
                var key = wanted[i];

                if (existing.TryGetValue(key, out var section))
                {
                    // 曾被移除又加回來的區段：重新啟用，內容原封不動
                    if (!section.IsEnabled && section.SortOrder < 0)
                    {
                        section.IsEnabled = true;
                        section.SortOrder = i;
                        section.UpdatedAt = now;
                        reenabled.Add($"{page.Key}.{key}");
                    }
                    else unchanged++;
                    continue;
                }

                db.Add(new PageSection
                {
                    PageId     = page.Id,
                    SectionKey = key,
                    SortOrder  = i,
                    IsEnabled  = true,
                    UpdatedAt  = now,
                });
                added.Add($"{page.Key}.{key}");
            }

            // schema 檔消失的區段：停用而非刪除，並以 SortOrder = -1 標記來源已不存在
            foreach (var (key, section) in existing)
            {
                if (wanted.Contains(key, StringComparer.Ordinal)) continue;
                if (!section.IsEnabled && section.SortOrder < 0) continue;

                section.IsEnabled = false;
                section.SortOrder = -1;
                section.UpdatedAt = now;
                disabled.Add($"{page.Key}.{key}");
            }
        }

        await db.SaveChangesAsync(ct);
        return new SyncReport([.. added], [.. disabled], [.. reenabled], unchanged);
    }
}
