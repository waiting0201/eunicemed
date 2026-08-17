using System.Text.Json;
using EuniceMed.Api.Models.Entities;
using EuniceMed.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace EuniceMed.Api.Data.Interceptors;

/// <summary>
/// 自動把所有寫入記進 <see cref="AuditLog"/>（docs/04-api.md §6 規則）。
///
/// <para>
/// 用 interceptor 而不是在 Handler 裡手動呼叫，理由是它需要
/// <c>EntityEntry.OriginalValues</c> 來算 diff —— 那只有在這一層拿得到。
/// （對照：<c>MediaUsage</c> 的重建刻意**不**用 interceptor，因為它要 async 走 schema，
/// 且應該在呼叫點看得見。兩種機制對應兩件本質不同的事。）
/// </para>
///
/// <para>
/// 前提：GUID 主鍵由 EF 的 <c>SequentialGuidValueGenerator</c> 在 client 端於
/// SaveChanges **之前**產生，所以 insert 也拿得到 EntityId，不需要存兩次。
/// </para>
/// </summary>
public sealed class AuditLogInterceptor(CurrentUser currentUser) : SaveChangesInterceptor
{
    /// <summary>這些表本身就是稽核／附加資料，記了會無限遞迴或製造雜訊。</summary>
    private static readonly HashSet<string> Excluded =
        new(StringComparer.Ordinal) { nameof(AuditLog), nameof(RefreshToken) };

    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = false };

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null)
            Write(eventData.Context);

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void Write(DbContext db)
    {
        var userId = CurrentUserId();
        var now    = DateTime.UtcNow;

        // 先具體化 —— 迴圈內會 Add 新的 AuditLog，直接列舉 ChangeTracker 會炸
        var entries = db.ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .Where(e => !Excluded.Contains(e.Metadata.ClrType.Name))
            .ToList();

        foreach (var entry in entries)
        {
            var action = entry.State switch
            {
                EntityState.Added    => AuditActions.Create,
                EntityState.Modified => AuditActions.Update,
                EntityState.Deleted  => AuditActions.Delete,
                _                    => null,
            };
            if (action is null) continue;

            var diff = BuildDiff(entry);

            // 沒有實際欄位變動的 Modified（例如只碰了導覽屬性）不值得留紀錄
            if (action == AuditActions.Update && diff.Count == 0) continue;

            db.Add(new AuditLog
            {
                UserId    = userId,
                Action    = action,
                Entity    = entry.Metadata.ClrType.Name,
                EntityId  = PrimaryKey(entry),
                DataJson  = diff.Count == 0 ? null : JsonSerializer.Serialize(diff, JsonOptions),
                CreatedAt = now,
            });
        }
    }

    private static Dictionary<string, object?> BuildDiff(EntityEntry entry)
    {
        var diff = new Dictionary<string, object?>();

        foreach (var prop in entry.Properties)
        {
            if (prop.Metadata.IsPrimaryKey()) continue;

            // 密碼雜湊與 token 絕不進稽核紀錄
            var name = prop.Metadata.Name;
            if (name is nameof(User.PasswordHash) or nameof(RefreshToken.TokenHash)) continue;

            switch (entry.State)
            {
                case EntityState.Added when prop.CurrentValue is not null:
                    diff[name] = prop.CurrentValue;
                    break;

                case EntityState.Modified when prop.IsModified
                                            && !Equals(prop.OriginalValue, prop.CurrentValue):
                    diff[name] = new { from = prop.OriginalValue, to = prop.CurrentValue };
                    break;

                case EntityState.Deleted when prop.OriginalValue is not null:
                    diff[name] = prop.OriginalValue;
                    break;
            }
        }

        return diff;
    }

    private static string? PrimaryKey(EntityEntry entry)
    {
        var key = entry.Metadata.FindPrimaryKey();
        if (key is null) return null;

        var parts = key.Properties
            .Select(p => entry.Property(p.Name).CurrentValue?.ToString())
            .Where(v => v is not null);

        var joined = string.Join('|', parts);
        return string.IsNullOrEmpty(joined) ? null : joined[..Math.Min(joined.Length, 80)];
    }

    private Guid? CurrentUserId() => currentUser.Id;
}
