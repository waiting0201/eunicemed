using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EuniceMed.Api.Data.Configurations;

public class CollectionConfiguration : IEntityTypeConfiguration<Collection>
{
    public void Configure(EntityTypeBuilder<Collection> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Slug)
               .IsRequired()
               .HasMaxLength(120);

        // Collection 沒有 IsDeleted，所以唯一索引不加篩選條件
        builder.HasIndex(c => c.Slug)
               .IsUnique()
               .HasDatabaseName("UX_Collection_Slug");

        builder.Property(c => c.Strength)
               .IsRequired();

        builder.Property(c => c.SortOrder)
               .HasDefaultValue(0);

        builder.Property(c => c.CreatedAt)
               .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.Property(c => c.UpdatedAt)
               .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasMany(c => c.Translations)
               .WithOne(t => t.Collection!)
               .HasForeignKey(t => t.CollectionId)
               .OnDelete(DeleteBehavior.Cascade);

        // Seed：三個系列為固定資料（docs/05-database.md §4）
        builder.HasData(
            new Collection { Id = CollectionIds.Care,    Slug = "care",    Strength = 1, SortOrder = 1, CreatedAt = SeedTime, UpdatedAt = SeedTime },
            new Collection { Id = CollectionIds.Protect, Slug = "protect", Strength = 2, SortOrder = 2, CreatedAt = SeedTime, UpdatedAt = SeedTime },
            new Collection { Id = CollectionIds.Advance, Slug = "advance", Strength = 3, SortOrder = 3, CreatedAt = SeedTime, UpdatedAt = SeedTime });
    }

    internal static readonly DateTime SeedTime = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
}

/// <summary>Seed 用的固定 GUID，供 translation seed 與測試引用。</summary>
public static class CollectionIds
{
    public static readonly Guid Care    = new("11111111-0000-0000-0000-000000000001");
    public static readonly Guid Protect = new("11111111-0000-0000-0000-000000000002");
    public static readonly Guid Advance = new("11111111-0000-0000-0000-000000000003");
}

public class CollectionTranslationConfiguration : IEntityTypeConfiguration<CollectionTranslation>
{
    public void Configure(EntityTypeBuilder<CollectionTranslation> builder)
    {
        builder.HasKey(t => t.Id);

        // ⚠️ Locale 必須是 varchar(10) 非 Unicode。
        // 若讓 EF 送 NVARCHAR 參數，SQL Server 會在欄位側加隱含轉換，
        // UX_CollectionTr 索引失效 → 每個公開請求變成掃描。見 Common/LocaleQuery.cs。
        builder.Property(t => t.Locale)
               .IsRequired()
               .HasColumnType("varchar(10)")
               .IsUnicode(false)
               .HasMaxLength(10);

        builder.Property(t => t.Name)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(t => t.Description);

        builder.HasIndex(t => new { t.CollectionId, t.Locale })
               .IsUnique()
               .HasDatabaseName("UX_CollectionTr");

        // Seed：品牌文案取自 docs/10-legacy-content.md 與 mockup4
        builder.HasData(
            new CollectionTranslation { Id = new("21111111-0000-0000-0000-000000000001"), CollectionId = CollectionIds.Care,    Locale = "en",    Name = "Care",    Description = "Everyday light relief for comfort through ordinary days." },
            new CollectionTranslation { Id = new("21111111-0000-0000-0000-000000000002"), CollectionId = CollectionIds.Care,    Locale = "zh-TW", Name = "日常照護", Description = "日常輕度緩解，為平常的每一天提供舒適支撐。" },
            new CollectionTranslation { Id = new("21111111-0000-0000-0000-000000000003"), CollectionId = CollectionIds.Protect, Locale = "en",    Name = "Protect", Description = "Strong support for high-load activity and demanding movement." },
            new CollectionTranslation { Id = new("21111111-0000-0000-0000-000000000004"), CollectionId = CollectionIds.Protect, Locale = "zh-TW", Name = "強力防護", Description = "高強度活動的強力支撐，因應大負荷的動作需求。" },
            new CollectionTranslation { Id = new("21111111-0000-0000-0000-000000000005"), CollectionId = CollectionIds.Advance, Locale = "en",    Name = "Advance", Description = "Rehabilitation-oriented, targeted protection for recovery." },
            new CollectionTranslation { Id = new("21111111-0000-0000-0000-000000000006"), CollectionId = CollectionIds.Advance, Locale = "zh-TW", Name = "進階復健", Description = "復健導向的針對性保護，協助恢復過程。" });
    }
}
