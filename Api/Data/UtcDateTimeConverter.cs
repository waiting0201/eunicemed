using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace EuniceMed.Api.Data;

/// <summary>
/// 所有 DateTime 一律以 UTC 進出。
/// 寫入時把未標記 Kind 的值視為 UTC；讀出時標記為 UTC，
/// 讓序列化出去的 ISO-8601 字串一定帶 Z。
/// </summary>
public sealed class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
{
    public UtcDateTimeConverter()
        : base(
            v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
    {
    }
}
