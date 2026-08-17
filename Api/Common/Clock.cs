namespace EuniceMed.Api.Common;

/// <summary>
/// 統一時間工具。
///
/// 與 Jabez 不同：本專案的 <c>CreatedAt</c>/<c>UpdatedAt</c> 一律存 **UTC**
/// （docs/05-database.md §1：datetime2、UTC、DEFAULT SYSUTCDATETIME()），
/// 因為這是對外多語系網站，讀者不在單一時區。
/// 需要呈現營業時間（週一至週五 09:00–18:00 UTC+8）時才用 <see cref="Taipei"/>。
/// </summary>
public static class Clock
{
    private static readonly TimeZoneInfo TaipeiTz =
        TimeZoneInfo.FindSystemTimeZoneById("Asia/Taipei");

    /// <summary>目前 UTC 時間 — 所有寫入 DB 的時間戳一律用這個</summary>
    public static DateTime Now => DateTime.UtcNow;

    /// <summary>目前 UTC 日期</summary>
    public static DateTime Today => DateTime.UtcNow.Date;

    /// <summary>轉為台北時區（僅供顯示營業時間 / 匯出報表用）</summary>
    public static DateTime Taipei(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(
            utc.Kind == DateTimeKind.Utc ? utc : DateTime.SpecifyKind(utc, DateTimeKind.Utc),
            TaipeiTz);
}
