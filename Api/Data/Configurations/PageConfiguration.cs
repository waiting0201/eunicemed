using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EuniceMed.Api.Data.Configurations;

public class PageConfiguration : IEntityTypeConfiguration<Page>
{
    /// <summary>18 個頁面 key（docs/05 §4）。順序即後台側欄的排列。</summary>
    public static readonly (string Key, byte Kind)[] Keys =
    [
        // 單例頁（13）
        ("home", PageKind.Singleton), ("about", PageKind.Singleton),
        ("products", PageKind.Singleton), ("applications", PageKind.Singleton),
        ("partnership", PageKind.Singleton), ("resources", PageKind.Singleton),
        ("faq", PageKind.Singleton), ("insights", PageKind.Singleton),
        ("news", PageKind.Singleton), ("downloads", PageKind.Singleton),
        ("where-to-buy", PageKind.Singleton), ("contact", PageKind.Singleton),
        ("privacy", PageKind.Singleton),
        // 模板頁共用文案（5）—— 只放「所有該類型頁面共用」的標題與 CTA
        ("product-category", PageKind.Template), ("product-detail", PageKind.Template),
        ("application-detail", PageKind.Template), ("article-detail", PageKind.Template),
        ("news-detail", PageKind.Template),
    ];

    public void Configure(EntityTypeBuilder<Page> b)
    {
        b.HasKey(x => x.Id);

        // Key 是 T-SQL 保留字，EF 會加引號，但手寫 SQL 時要記得
        b.Property(x => x.Key).IsRequired().HasMaxLength(80);
        b.HasIndex(x => x.Key).IsUnique().HasDatabaseName("UX_Page_Key");

        b.Property(x => x.Kind).HasDefaultValue(PageKind.Singleton);
        b.Property(x => x.Status).HasDefaultValue(ContentStatus.Published);
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        b.HasMany(x => x.Sections).WithOne(s => s.Page!)
         .HasForeignKey(s => s.PageId).OnDelete(DeleteBehavior.Cascade);

        b.HasData(Keys.Select((k, i) => new Page
        {
            Id        = PageIds.For(i + 1),
            Key       = k.Key,
            Kind      = k.Kind,
            Status    = ContentStatus.Published,
            UpdatedAt = Seed.T,
        }));
    }
}

public static class PageIds
{
    public static Guid For(int i) => new($"b1111111-0000-0000-0000-{i:D12}");
}

public class PageSectionConfiguration : IEntityTypeConfiguration<PageSection>
{
    public void Configure(EntityTypeBuilder<PageSection> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.SectionKey).IsRequired().HasMaxLength(60);
        b.Property(x => x.SchemaVersion).HasDefaultValue((short)1);
        b.Property(x => x.IsEnabled).HasDefaultValue(true);
        b.Property(x => x.SortOrder).HasDefaultValue(0);
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.RowVer).IsRowVersion();

        b.HasIndex(x => new { x.PageId, x.SectionKey })
         .IsUnique().HasDatabaseName("UX_PageSection");

        b.HasMany(x => x.Translations).WithOne(t => t.PageSection!)
         .HasForeignKey(t => t.PageSectionId).OnDelete(DeleteBehavior.Cascade);

        // 區段列由 seed 同步器建立（見 Data/Seed/PageSectionSynchronizer.cs），
        // 不用 HasData —— 來源是 PageSchemas/ 目錄，會隨版本增減。
    }
}

public class PageSectionTranslationConfiguration : IEntityTypeConfiguration<PageSectionTranslation>
{
    public void Configure(EntityTypeBuilder<PageSectionTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.DataJson).IsRequired();

        b.HasIndex(x => new { x.PageSectionId, x.Locale })
         .IsUnique().HasDatabaseName("UX_PageSectionTr");
    }
}
