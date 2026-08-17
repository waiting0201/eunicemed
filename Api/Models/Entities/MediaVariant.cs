namespace EuniceMed.Api.Models.Entities;

/// <summary>
/// 一張 <see cref="Media"/> 的其中一個輸出檔。docs/11-media-specs.md §2a。
///
/// <para>
/// 每列是**實體存在於 Blob 的檔案**，不是「可產生的尺寸」。本站無 CDN、
/// 不使用 next/image 即時優化，沒在上傳當下產生的寬度就不存在。
/// </para>
/// </summary>
public class MediaVariant
{
    public Guid Id { get; set; }

    public Guid   MediaId { get; set; }
    public Media? Media   { get; set; }

    /// <summary>webp | jpg | png | svg</summary>
    public string Format { get; set; } = string.Empty;

    public int  Width     { get; set; }
    public int  Height    { get; set; }
    public long SizeBytes { get; set; }

    public string BlobUrl { get; set; } = string.Empty;
}

/// <summary>
/// 媒體引用的反查索引。docs/05-database.md §3.10。
///
/// <para>
/// 存在的理由：<c>PageSectionTranslation.DataJson</c> 裡的 mediaId 是 JSON 字串，
/// 沒有 FK 可以追。每個實體存檔時自行重建自己的列，媒體庫再靠這張表回答
/// 「這張圖被誰用了 / 能不能刪」。
/// </para>
/// </summary>
public class MediaUsage
{
    /// <summary>
    /// 規格的 DDL 用 <c>(MediaId, Entity, EntityId, FieldPath)</c> 四欄複合主鍵，
    /// 但那是 592 bytes 的叢集鍵 —— 每個非叢集索引都要揹著它。
    /// 改用 IDENTITY 當叢集主鍵，該組合改為非叢集唯一索引（CLAUDE.md §7 🟡）。
    /// </summary>
    public long Id { get; set; }

    public Guid   MediaId { get; set; }
    public Media? Media   { get; set; }

    /// <summary>實體型別名稱：PageSection | Product | Article | Category …</summary>
    public string Entity { get; set; } = string.Empty;

    /// <summary>刻意不設 FK —— 這是多型引用，指向的表不固定。</summary>
    public Guid EntityId { get; set; }

    /// <summary>哪個語系的內容引用了它；非語系相關的欄位為 null。</summary>
    public string? Locale { get; set; }

    /// <summary>欄位路徑，如 <c>milestones[2].image</c>、<c>images[0]</c>。</summary>
    public string FieldPath { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; }
}
