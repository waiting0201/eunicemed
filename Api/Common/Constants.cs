namespace EuniceMed.Api.Common;

/// <summary>後台角色。見 docs/03-cms.md §2。</summary>
public static class RoleNames
{
    public const string Admin  = "Admin";   // 全部權限，含使用者管理與設定
    public const string Editor = "Editor";  // 內容 CRUD + 發布
    public const string Author = "Author";  // 只能建立/編輯草稿，不可發布
    public const string Viewer = "Viewer";  // 唯讀（含表單收件匣）

    /// <summary>可執行發布動作的角色</summary>
    public static readonly IReadOnlySet<string> CanPublish =
        new HashSet<string>(StringComparer.Ordinal) { Admin, Editor };

    /// <summary>可寫入內容的角色</summary>
    public static readonly IReadOnlySet<string> CanWrite =
        new HashSet<string>(StringComparer.Ordinal) { Admin, Editor, Author };
}

/// <summary>
/// 支援的語系。docs/06-sitemap.md：路由一律帶語系前綴，預設 en。
/// DB 的 Locale 欄位是 VARCHAR(10)（非 Unicode）。
/// </summary>
public static class Locales
{
    public const string En   = "en";
    public const string ZhTw = "zh-TW";
    public const string Default = En;

    public static readonly IReadOnlySet<string> Supported =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { En, ZhTw };

    /// <summary>
    /// 正規化查詢字串帶進來的 locale。未支援的語系**不 fallback 成 en**，
    /// 直接原樣回傳讓查詢自然查無資料 —— 語言純度原則（docs/08-design.md §5.2）。
    /// 只有完全沒帶參數時才用預設值。
    /// </summary>
    public static string Normalize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return Default;

        var trimmed = raw.Trim();
        // 大小寫還原成標準寫法（zh-tw → zh-TW），未知語系原樣保留
        if (trimmed.Equals(En,   StringComparison.OrdinalIgnoreCase)) return En;
        if (trimmed.Equals(ZhTw, StringComparison.OrdinalIgnoreCase)) return ZhTw;
        return trimmed;
    }
}

/// <summary>內容狀態。docs/05-database.md §7。</summary>
public static class ContentStatus
{
    public const byte Draft     = 0;
    public const byte Published = 1;
    public const byte Archived  = 2;
}
