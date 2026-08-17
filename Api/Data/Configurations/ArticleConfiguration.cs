using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EuniceMed.Api.Data.Configurations;

public class ArticleCategoryConfiguration : IEntityTypeConfiguration<ArticleCategory>
{
    public void Configure(EntityTypeBuilder<ArticleCategory> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Slug).IsRequired().HasMaxLength(80);
        b.Property(x => x.Status).HasDefaultValue(ContentStatus.Published);
        b.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // 複合唯一：同一個 slug 可以同時存在於 news 與 insight 兩種 Kind。
        // seed 的 `sponsorship` 正是如此，這不是資料錯誤。
        b.HasIndex(x => new { x.Kind, x.Slug })
         .IsUnique().HasDatabaseName("UX_ArticleCategory");

        b.HasMany(x => x.Translations).WithOne(t => t.ArticleCategory!)
         .HasForeignKey(t => t.ArticleCategoryId).OnDelete(DeleteBehavior.Cascade);

        b.HasData(ArticleCategorySeed.Rows());
    }
}

public class ArticleCategoryTranslationConfiguration : IEntityTypeConfiguration<ArticleCategoryTranslation>
{
    public void Configure(EntityTypeBuilder<ArticleCategoryTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.Name).IsRequired().HasMaxLength(120);
        b.HasIndex(x => new { x.ArticleCategoryId, x.Locale })
         .IsUnique().HasDatabaseName("UX_ArticleCategoryTr");

        b.HasData(ArticleCategorySeed.TranslationRows());
    }
}

public class ArticleConfiguration : IEntityTypeConfiguration<Article>
{
    public void Configure(EntityTypeBuilder<Article> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Slug).IsRequired().HasMaxLength(180);
        b.Property(x => x.Type).HasDefaultValue(ArticleType.News);
        b.Property(x => x.Status).HasDefaultValue(ContentStatus.Draft);
        b.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.RowVer).IsRowVersion();

        b.HasQueryFilter(x => !x.IsDeleted);

        b.HasIndex(x => x.Slug).IsUnique()
         .HasFilter("[IsDeleted] = 0").HasDatabaseName("UX_Article_Slug");
        b.HasIndex(x => new { x.Type, x.Status, x.PublishedAt })
         .IsDescending(false, false, true).HasDatabaseName("IX_Article_Published");
        b.HasIndex(x => new { x.CategoryId, x.Status, x.PublishedAt })
         .IsDescending(false, false, true).HasDatabaseName("IX_Article_Category");

        b.HasOne(x => x.Category).WithMany()
         .HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Translations).WithOne(t => t.Article!)
         .HasForeignKey(t => t.ArticleId).OnDelete(DeleteBehavior.Cascade);

        b.HasMany(x => x.Images).WithOne(i => i.Article!)
         .HasForeignKey(i => i.ArticleId).OnDelete(DeleteBehavior.Cascade);

        CategoryConfiguration.MediaFk(b, nameof(Article.CoverMediaId));
    }
}

public class ArticleTranslationConfiguration : IEntityTypeConfiguration<ArticleTranslation>
{
    public void Configure(EntityTypeBuilder<ArticleTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.Title).IsRequired().HasMaxLength(300);
        b.Property(x => x.Standfirst).HasMaxLength(600);
        b.Property(x => x.Excerpt).HasMaxLength(600);
        b.Property(x => x.AuthorName).HasMaxLength(120);
        b.Property(x => x.SeoTitle).HasMaxLength(200);
        b.Property(x => x.SeoDescription).HasMaxLength(400);

        b.HasIndex(x => new { x.ArticleId, x.Locale }).IsUnique().HasDatabaseName("UX_ArticleTr");
        b.HasQueryFilter(x => !x.Article!.IsDeleted);
    }
}

/// <summary>
/// 共用主鍵的 1:1。<c>ValueGeneratedNever()</c> 是關鍵 ——
/// 少了它 EF 會為 ArticleId 產生新 GUID，FK 就對不上了。
/// </summary>
public class NewsEventConfiguration : IEntityTypeConfiguration<NewsEvent>
{
    public void Configure(EntityTypeBuilder<NewsEvent> b)
    {
        b.HasKey(x => x.ArticleId);
        b.Property(x => x.ArticleId).ValueGeneratedNever();
        b.Property(x => x.ContactEmail).HasMaxLength(320);
        b.Property(x => x.CtaUrl).HasMaxLength(400);
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        b.HasOne(x => x.Article).WithOne(a => a.Event!)
         .HasForeignKey<NewsEvent>(x => x.ArticleId).OnDelete(DeleteBehavior.Cascade);

        b.HasQueryFilter(x => !x.Article!.IsDeleted);
    }
}

public class NewsEventTranslationConfiguration : IEntityTypeConfiguration<NewsEventTranslation>
{
    public void Configure(EntityTypeBuilder<NewsEventTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.DatesLabel).HasMaxLength(160);
        b.Property(x => x.Venue).HasMaxLength(300);
        b.Property(x => x.Booth).HasMaxLength(120);
        b.Property(x => x.CtaLabel).HasMaxLength(120);

        b.HasIndex(x => new { x.ArticleId, x.Locale }).IsUnique().HasDatabaseName("UX_NewsEventTr");

        // ⚠️ FK 指向 **NewsEvent(ArticleId)** 而非 Article(Id)。
        // 不明確設定的話，EF 的慣例會依屬性名稱把它接到 Article。
        b.HasOne(x => x.NewsEvent).WithMany(e => e.Translations)
         .HasForeignKey(x => x.ArticleId).OnDelete(DeleteBehavior.Cascade);

        b.HasQueryFilter(x => !x.NewsEvent!.Article!.IsDeleted);
    }
}

public class ArticleImageConfiguration : IEntityTypeConfiguration<ArticleImage>
{
    public void Configure(EntityTypeBuilder<ArticleImage> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.SortOrder).HasDefaultValue(0);
        b.HasQueryFilter(x => !x.Article!.IsDeleted);
        b.HasOne<Media>().WithMany().HasForeignKey(x => x.MediaId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class ArticleTagConfiguration : IEntityTypeConfiguration<ArticleTag>
{
    public void Configure(EntityTypeBuilder<ArticleTag> b)
    {
        b.HasKey(x => new { x.ArticleId, x.TagId });
        b.HasOne(x => x.Article).WithMany(a => a.Tags)
         .HasForeignKey(x => x.ArticleId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Tag).WithMany()
         .HasForeignKey(x => x.TagId).OnDelete(DeleteBehavior.Restrict);
        b.HasQueryFilter(x => !x.Article!.IsDeleted);
    }
}

/// <summary>6 筆文章分類（docs/05 §4）。`sponsorship` 在兩種 Kind 各出現一次。</summary>
internal static class ArticleCategorySeed
{
    private sealed record Row(byte Kind, string Slug, string En, string ZhTw, int Order);

    private static readonly Row[] All =
    [
        new(ArticleType.News,    "exhibitions",  "Exhibitions",  "展覽活動", 1),
        new(ArticleType.News,    "sponsorship",  "Sponsorship",  "贊助合作", 2),
        new(ArticleType.News,    "company",      "Company",      "公司動態", 3),
        new(ArticleType.Insight, "medical",      "Medical",      "醫療專欄", 1),
        new(ArticleType.Insight, "esg",          "ESG",          "永續發展", 2),
        new(ArticleType.Insight, "sponsorship",  "Sponsorship",  "贊助合作", 3),
    ];

    private static Guid Id(int i)            => new($"c1111111-0000-0000-0000-{i:D12}");
    private static Guid TrId(int i, int loc) => new($"c2222222-0000-{loc:D4}-0000-{i:D12}");

    public static ArticleCategory[] Rows() =>
        All.Select((r, i) => new ArticleCategory
        {
            Id = Id(i + 1), Kind = r.Kind, Slug = r.Slug, SortOrder = r.Order,
            Status = ContentStatus.Published, CreatedAt = Seed.T, UpdatedAt = Seed.T,
        }).ToArray();

    public static ArticleCategoryTranslation[] TranslationRows() =>
        All.SelectMany((r, i) => new[]
        {
            new ArticleCategoryTranslation { Id = TrId(i + 1, 1), ArticleCategoryId = Id(i + 1), Locale = Locales.En,   Name = r.En },
            new ArticleCategoryTranslation { Id = TrId(i + 1, 2), ArticleCategoryId = Id(i + 1), Locale = Locales.ZhTw, Name = r.ZhTw },
        }).ToArray();
}
