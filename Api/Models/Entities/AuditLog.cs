namespace EuniceMed.Api.Models.Entities;

/// <summary>
/// 稽核紀錄。docs/04-api.md §6：**所有寫入都要記**。
/// 由 <see cref="Data.Interceptors.AuditLogInterceptor"/> 自動寫入，Handler 不需手動呼叫。
/// 全案唯一使用 BIGINT IDENTITY 主鍵的資料表。
/// </summary>
public class AuditLog
{
    public long Id { get; set; }

    /// <summary>操作者；系統自動行為（seed、同步器）為 null。刻意不設 FK —— 使用者刪除後稽核仍需保留。</summary>
    public Guid? UserId { get; set; }

    /// <summary>create | update | delete | publish | login</summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>實體型別名稱，如 Product、PageSection</summary>
    public string Entity { get; set; } = string.Empty;

    /// <summary>字串而非 Guid —— 要能容納 Setting 的字串主鍵</summary>
    public string? EntityId { get; set; }

    /// <summary>異動差異 JSON：{ "欄位": { "from": ..., "to": ... } }</summary>
    public string? DataJson { get; set; }

    public DateTime CreatedAt { get; set; }
}

public static class AuditActions
{
    public const string Create  = "create";
    public const string Update  = "update";
    public const string Delete  = "delete";
    public const string Publish = "publish";
    public const string Login   = "login";
}
