using EuniceMed.Api.Common;

namespace EuniceMed.Api.Models.Entities;

/// <summary>18 個頁面。docs/05-database.md §3.7。</summary>
public class Page
{
    public Guid Id { get; set; }

    /// <summary>home | about | products | … 共 18 個</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>1 = 單例頁（13）、2 = 模板頁共用文案（5）</summary>
    public byte Kind { get; set; } = PageKind.Singleton;

    public byte     Status    { get; set; } = ContentStatus.Published;
    public DateTime UpdatedAt { get; set; }

    public ICollection<PageSection> Sections { get; set; } = [];
}

public static class PageKind
{
    public const byte Singleton = 1;
    public const byte Template  = 2;
}

/// <summary>
/// 頁面區段。
///
/// <para>
/// **版面是鎖定的**：區段不可新增、刪除、拖曳排序（docs/09 §0.1）。
/// 這些列由 seed 同步器依 <c>PageSchemas/</c> 目錄建立，API 刻意不提供 POST / DELETE。
/// </para>
///
/// <para>
/// 舊設計用 <c>BlockType</c> + <c>SortOrder</c> 定位區段，但 BlockType 是**型別**不是**身分** ——
/// 同一頁兩個 <c>iconText</c> 只能靠 SortOrder 區分，拖曳一次就對不上了。
/// 改用 <c>(PageId, SectionKey)</c> 作為穩定身分。
/// </para>
/// </summary>
public class PageSection
{
    public Guid  Id     { get; set; }
    public Guid  PageId { get; set; }
    public Page? Page   { get; set; }

    /// <summary>穩定身分。同頁內唯一且永久 —— 改名等同刪除舊區段。</summary>
    public string SectionKey { get; set; } = string.Empty;

    public short SchemaVersion { get; set; } = 1;

    /// <summary>編輯者唯一能改的結構性欄位：關掉整段不渲染。</summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>**唯讀**：只影響後台側欄的排列，視覺順序由前端模板決定。</summary>
    public int SortOrder { get; set; }

    public DateTime UpdatedAt { get; set; }
    public Guid?    UpdatedBy { get; set; }
    public byte[]?  RowVer    { get; set; }

    public ICollection<PageSectionTranslation> Translations { get; set; } = [];
}

/// <summary>
/// 區段內容，**一個語系一份完整 payload**。
///
/// <para>
/// 為什麼不把非翻譯欄位（圖片、連結、數字）抽到母表：repeatable 陣列會因此變成
/// 兩個需要靠索引配對的 JSON 陣列，任何一次新增或刪除都會讓兩邊錯位。
/// 代價（同一張圖要選兩次）由後台的「同步至其他語系」勾選解決，不是 schema 的事。
/// </para>
/// </summary>
public class PageSectionTranslation : ILocalized
{
    public Guid Id { get; set; }

    public Guid         PageSectionId { get; set; }
    public PageSection? PageSection   { get; set; }

    public string Locale { get; set; } = string.Empty;

    /// <summary>該區段的完整內容，依 SectionKey 對應的 JSON Schema 驗證。</summary>
    public string DataJson { get; set; } = "{}";
}
