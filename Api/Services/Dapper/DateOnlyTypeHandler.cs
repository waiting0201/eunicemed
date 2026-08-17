using System.Data;
using Dapper;

namespace EuniceMed.Api.Services.Dapper;

/// <summary>
/// SQL <c>date</c> ↔ <see cref="DateOnly"/> 的 Dapper 對映。
///
/// <para>
/// EF Core 對 <c>DateOnly</c> 是原生支援（寫入路徑不用管），但 Dapper 不是 ——
/// 沒有這個 handler 時，任何把 <c>date</c> 欄位讀進 <c>DateOnly</c> 的查詢會在
/// **執行期**丟 <c>InvalidOperationException: ... one matching signature ...</c>。
/// 訊息只會說找不到相符的建構式，不會提到 DateOnly，很容易誤判成 DTO 欄位順序寫錯。
/// </para>
///
/// <para>
/// 註冊於 <c>Program.cs</c>，全域一次。<c>AddTypeHandler&lt;T&gt;</c> 對實值型別
/// 會一併註冊 <c>T?</c>，因此 <c>DateOnly?</c> 不需另外處理。
/// </para>
/// </summary>
public sealed class DateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly>
{
    public override DateOnly Parse(object value) => value switch
    {
        DateOnly d  => d,
        DateTime dt => DateOnly.FromDateTime(dt),
        string s    => DateOnly.Parse(s),
        _           => throw new DataException($"無法將 {value?.GetType().Name ?? "null"} 轉為 DateOnly。"),
    };

    public override void SetValue(IDbDataParameter parameter, DateOnly value)
    {
        parameter.DbType = DbType.Date;
        parameter.Value  = value.ToDateTime(TimeOnly.MinValue);
    }
}

public sealed class TimeOnlyTypeHandler : SqlMapper.TypeHandler<TimeOnly>
{
    public override TimeOnly Parse(object value) => value switch
    {
        TimeOnly t  => t,
        TimeSpan ts => TimeOnly.FromTimeSpan(ts),
        DateTime dt => TimeOnly.FromDateTime(dt),
        string s    => TimeOnly.Parse(s),
        _           => throw new DataException($"無法將 {value?.GetType().Name ?? "null"} 轉為 TimeOnly。"),
    };

    public override void SetValue(IDbDataParameter parameter, TimeOnly value)
    {
        parameter.DbType = DbType.Time;
        parameter.Value  = value.ToTimeSpan();
    }
}
