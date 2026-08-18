using System.Diagnostics.CodeAnalysis;
using EuniceMed.Api.Common;
using EuniceMed.Api.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace EuniceMed.Api.Handlers;

/// <summary>
/// 後台 CRUD 的共用零件。
///
/// <para>
/// 抽出來的判準是「每支 handler 都會原封不動複製一次，且複製錯了會靜默壞掉」——
/// 語系白名單、rowVersion 比對、FK 存在性檢查都屬於這類。
/// **不抽**每支各自不同的欄位套用與翻譯 upsert：那些看起來像，其實每個實體的欄位不同，
/// 硬要泛型化只會換成一堆反射與 lambda，讀起來比重複更糟。
/// </para>
/// </summary>
internal static class AdminWrite
{
    public static Guid ParseId(string id, string what) =>
        Guid.TryParse(id, out var guid) ? guid : throw AppException.BadRequest($"Invalid {what} ID format.");

    /// <summary>語系白名單。未支援的語系一律 400，不做 fallback（語言純度原則）。</summary>
    public static string ValidLocale(string raw)
    {
        var locale = Locales.Normalize(raw);
        return Locales.Supported.Contains(locale)
            ? locale
            : throw AppException.BadRequest($"不支援的語系：{raw}");
    }

    public static async Task<T> ReadAsync<T>(HttpRequest req) =>
        await req.ReadFromJsonAsync<T>() ?? throw AppException.BadRequest("Invalid request body.");

    /// <summary>
    /// 帶了 rowVersion 就啟用併發偵測，不帶就是「最後寫入者贏」。
    /// 必須覆寫 <c>OriginalValue</c> 而非 current —— 後者是 DB 產生的，設了沒有作用。
    /// </summary>
    public static void ApplyRowVersion(PropertyEntry property, string? rowVersion)
    {
        if (string.IsNullOrWhiteSpace(rowVersion)) return;

        try { property.OriginalValue = Convert.FromBase64String(rowVersion); }
        catch (FormatException) { throw AppException.BadRequest("rowVersion 必須是 base64 字串。"); }
    }

    public static string? Base64(byte[]? rowVer) => rowVer is null ? null : Convert.ToBase64String(rowVer);

    /// <summary>後台的 status 查詢參數：draft / published / archived，或直接給數字。</summary>
    public static byte ParseStatus(string raw) =>
        raw.ToLowerInvariant() switch
        {
            "draft"     or "0" => ContentStatus.Draft,
            "published" or "1" => ContentStatus.Published,
            "archived"  or "2" => ContentStatus.Archived,
            _ => throw AppException.BadRequest($"未知的 status：{raw}（draft / published / archived）。"),
        };

    /// <summary>
    /// FK 存在性檢查。**一定要在存檔前做** —— 讓它撞 FK 的話使用者拿到的是 500，
    /// 訊息裡只有約束名稱，後台完全無從得知是哪個欄位填錯。
    /// </summary>
    public static async Task EnsureAllExistAsync(IQueryable<Guid> source, Guid[] ids, string field)
    {
        if (ids.Length == 0) return;

        var found = await source.Where(id => ids.Contains(id)).CountAsync();
        if (found != ids.Length)
            throw AppException.BadRequest($"有 {ids.Length - found} 筆 {field} 不存在。");
    }

    public static Task EnsureMediaExistsAsync(AppDbContext db, params Guid?[] mediaIds) =>
        EnsureMediaExistsAsync(db, (IEnumerable<Guid?>)mediaIds);

    public static async Task EnsureMediaExistsAsync(AppDbContext db, IEnumerable<Guid?> mediaIds)
    {
        var ids = mediaIds.Where(i => i.HasValue).Select(i => i!.Value).Distinct().ToArray();
        if (ids.Length == 0) return;

        var found = await db.Media.Where(m => ids.Contains(m.Id)).CountAsync();
        if (found != ids.Length)
            throw AppException.BadRequest($"有 {ids.Length - found} 筆 mediaId 不存在。");
    }

    /// <summary>
    /// 翻譯字典的共用正規化：驗語系、把 <c>null</c> 原樣讓過（＝刪除該語系），
    /// 其餘檢查必填欄位。
    /// </summary>
    /// <remarks>
    /// <c>null</c> 與「未帶到」在本專案是兩件事：整個 <c>translations</c> 未帶到＝不動翻譯，
    /// 某個 key 的值是 <c>null</c>＝刪掉那個語系。見 docs/13 的踩坑。
    /// </remarks>
    public static IEnumerable<(string Locale, T? Value)> NormalizeTranslations<T>(
        Dictionary<string, T?> input, Func<T, string?> required, string fieldName)
        where T : class
    {
        foreach (var (rawLocale, value) in input)
        {
            var locale = ValidLocale(rawLocale);

            if (value is null)
            {
                yield return (locale, null);
                continue;
            }

            if (string.IsNullOrWhiteSpace(required(value)))
                throw AppException.BadRequest($"語系 {locale} 的 {fieldName} 為必填。");

            yield return (locale, value);
        }
    }

    /// <summary>
    /// <c>null</c> = 刪除該語系。回傳 true 表示這一輪已處理完，呼叫端該 continue。
    /// </summary>
    public static bool DropTranslation<T, TValue>(
        ICollection<T> translations,
        Func<T, string> localeOf,
        string locale,
        [NotNullWhen(false)] TValue? value) where TValue : class
    {
        if (value is not null) return false;

        if (translations.FirstOrDefault(t => localeOf(t) == locale) is { } row)
            translations.Remove(row);

        return true;
    }

    /// <summary>
    /// 刪到一個語系都不剩的話，這筆內容在前台每個語系都查不到，
    /// 而後台列表只顯示名稱 —— 它會變成一列空白，難以辨認也難以救回。
    /// </summary>
    public static void EnsureAnyTranslation<T>(ICollection<T> translations)
    {
        if (translations.Count == 0)
            throw AppException.BadRequest("至少要保留一個語系的翻譯。");
    }

    /// <summary>把「欄位路徑 → 可為 null 的 mediaId」壓成 MediaUsageWriter 收的形狀。</summary>
    public static IEnumerable<(string FieldPath, Guid MediaId)> MediaRefs(
        params (string FieldPath, Guid? MediaId)[] refs) =>
        refs.Where(r => r.MediaId.HasValue).Select(r => (r.FieldPath, r.MediaId!.Value));
}
