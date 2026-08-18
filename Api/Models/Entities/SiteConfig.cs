using EuniceMed.Api.Common;

namespace EuniceMed.Api.Models.Entities;

public static class MenuNames
{
    public const string Header = "header";
    public const string Footer = "footer";

    public static readonly IReadOnlySet<string> All =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { Header, Footer };
}

/// <summary>
/// 導覽項目（自參照樹）。docs/05-database.md §3.9。
///
/// <para>
/// ⚠️ **Resources 次導覽列不進這張表**（Overview｜FAQ｜Insights｜Downloads｜News）——
/// 版面已鎖定，開放編輯的話一次改壞會讓五個頁面同時失去導覽。
/// </para>
/// </summary>
public class MenuItem : ITranslatable<MenuItemTranslation>
{
    public Guid Id { get; set; }

    public Guid?     ParentId { get; set; }
    public MenuItem? Parent   { get; set; }

    /// <summary>header | footer</summary>
    public string Menu { get; set; } = MenuNames.Header;

    /// <summary>站內為語系無關的相對路徑（`/products`），前端渲染時補上語系前綴。</summary>
    public string Url { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public ICollection<MenuItem>            Children     { get; set; } = [];
    public ICollection<MenuItemTranslation> Translations { get; set; } = [];
}

public class MenuItemTranslation : ILocalized
{
    public Guid      Id         { get; set; }
    public Guid      MenuItemId { get; set; }
    public MenuItem? MenuItem   { get; set; }
    public string    Locale     { get; set; } = string.Empty;
    public string    Label      { get; set; } = string.Empty;
}

/// <summary>
/// 舊網址轉址。docs/10-legacy-content.md 的轉址來源就存在這裡。
/// 實際執行在前端 middleware —— 這裡只是資料。
/// </summary>
public class Redirect
{
    public Guid   Id         { get; set; }
    public string FromPath   { get; set; } = string.Empty;
    public string ToPath     { get; set; } = string.Empty;
    public short  StatusCode { get; set; } = 301;
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 站台設定。**主鍵是 `Key` 而非 Guid**（docs/05 §3.11）——
/// 它是一組具名的鍵值，不是可增刪的內容實體。
///
/// <para>
/// 不需翻譯的值（URL、email、電話）放 <see cref="ValueJson"/>；
/// 需翻譯的（地址、營業時間文字）放 <see cref="SettingTranslation"/>。
/// </para>
/// </summary>
public class Setting
{
    public string   Key       { get; set; } = string.Empty;
    public string   ValueJson { get; set; } = "null";
    public DateTime UpdatedAt { get; set; }

    public ICollection<SettingTranslation> Translations { get; set; } = [];
}

public class SettingTranslation
{
    public string   Key       { get; set; } = string.Empty;
    public Setting? Setting   { get; set; }
    public string   Locale    { get; set; } = string.Empty;
    public string   ValueJson { get; set; } = "null";
    public DateTime UpdatedAt { get; set; }
}
