using EuniceMed.Api.Common;

namespace EuniceMed.Api.Models.Entities;

/// <summary>
/// 產品系列（依支撐強度）：Care / Protect / Advance。
/// 三筆固定資料，由 seed 建立。docs/05-database.md §3.1。
/// </summary>
public class Collection : ITranslatable<CollectionTranslation>
{
    public Guid Id { get; set; }

    /// <summary>care | protect | advance</summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>1 = Care、2 = Protect、3 = Advance</summary>
    public byte Strength { get; set; }

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<CollectionTranslation> Translations { get; set; } = [];
}

public class CollectionTranslation : ILocalized
{
    public Guid Id { get; set; }

    public Guid CollectionId { get; set; }
    public Collection? Collection { get; set; }

    /// <summary>en | zh-TW（DB 為 varchar(10)，非 Unicode）</summary>
    public string Locale { get; set; } = string.Empty;

    public string  Name        { get; set; } = string.Empty;
    public string? Description { get; set; }
}
