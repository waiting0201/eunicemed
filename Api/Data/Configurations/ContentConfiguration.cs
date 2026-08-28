using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EuniceMed.Api.Data.Configurations;

// ── FAQ ────────────────────────────────────────────────────────────────────

public class FaqCategoryConfiguration : IEntityTypeConfiguration<FaqCategory>
{
    public void Configure(EntityTypeBuilder<FaqCategory> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Slug).IsRequired().HasMaxLength(80);
        b.Property(x => x.Status).HasDefaultValue(ContentStatus.Published);
        b.HasIndex(x => x.Slug).IsUnique().HasDatabaseName("UX_FaqCategory_Slug");

        b.HasMany(x => x.Translations).WithOne(t => t.FaqCategory!)
         .HasForeignKey(t => t.FaqCategoryId).OnDelete(DeleteBehavior.Cascade);

        b.HasData(
            new FaqCategory { Id = FaqCatIds.Use,    Slug = "use",    SortOrder = 1 },
            new FaqCategory { Id = FaqCatIds.Sizing, Slug = "sizing", SortOrder = 2 },
            new FaqCategory { Id = FaqCatIds.Order,  Slug = "order",  SortOrder = 3 });
    }
}

public static class FaqCatIds
{
    public static readonly Guid Use    = new("d1111111-0000-0000-0000-000000000001");
    public static readonly Guid Sizing = new("d1111111-0000-0000-0000-000000000002");
    public static readonly Guid Order  = new("d1111111-0000-0000-0000-000000000003");
}

public class FaqCategoryTranslationConfiguration : IEntityTypeConfiguration<FaqCategoryTranslation>
{
    public void Configure(EntityTypeBuilder<FaqCategoryTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.Name).IsRequired().HasMaxLength(160);
        b.HasIndex(x => new { x.FaqCategoryId, x.Locale }).IsUnique().HasDatabaseName("UX_FaqCategoryTr");

        b.HasData(
            Tr(FaqCatIds.Use, 1, Locales.En, "Product use"), Tr(FaqCatIds.Use, 2, Locales.ZhTw, "產品使用"),
            Tr(FaqCatIds.Sizing, 1, Locales.En, "Sizing"),   Tr(FaqCatIds.Sizing, 2, Locales.ZhTw, "尺寸選擇"),
            Tr(FaqCatIds.Order, 1, Locales.En, "Ordering & partnership"), Tr(FaqCatIds.Order, 2, Locales.ZhTw, "訂購與合作"));
    }

    private static FaqCategoryTranslation Tr(Guid catId, int loc, string locale, string name) => new()
    {
        Id = new($"d2222222-0000-{loc:D4}-0000-{catId.ToString("N")[^12..]}"),
        FaqCategoryId = catId, Locale = locale, Name = name,
    };
}

public class FaqConfiguration : IEntityTypeConfiguration<Faq>
{
    public void Configure(EntityTypeBuilder<Faq> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Status).HasDefaultValue(ContentStatus.Published);
        b.Property(x => x.SortOrder).HasDefaultValue(0);
        b.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        b.HasIndex(x => new { x.FaqCategoryId, x.Status, x.SortOrder }).HasDatabaseName("IX_Faq_Category");

        b.HasOne(x => x.FaqCategory).WithMany(c => c.Faqs)
         .HasForeignKey(x => x.FaqCategoryId).OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Translations).WithOne(t => t.Faq!)
         .HasForeignKey(t => t.FaqId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class FaqTranslationConfiguration : IEntityTypeConfiguration<FaqTranslation>
{
    public void Configure(EntityTypeBuilder<FaqTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.Question).IsRequired().HasMaxLength(500);
        b.Property(x => x.Answer).IsRequired();
        b.HasIndex(x => new { x.FaqId, x.Locale }).IsUnique().HasDatabaseName("UX_FaqTr");
    }
}

// ── 下載 ───────────────────────────────────────────────────────────────────

public class DownloadConfiguration : IEntityTypeConfiguration<Download>
{
    public void Configure(EntityTypeBuilder<Download> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Status).HasDefaultValue(ContentStatus.Published);
        b.Property(x => x.SortOrder).HasDefaultValue(0);
        b.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // 檔案語言：固定 ASCII 語言代碼，與介面語系欄位同樣用 varchar
        b.Property(x => x.FileLocale).IsRequired().AsciiColumn(10);

        b.HasOne<Media>().WithMany().HasForeignKey(x => x.MediaId).OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Translations).WithOne(t => t.Download!)
         .HasForeignKey(t => t.DownloadId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class DownloadTranslationConfiguration : IEntityTypeConfiguration<DownloadTranslation>
{
    public void Configure(EntityTypeBuilder<DownloadTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.Title).IsRequired().HasMaxLength(300);
        b.Property(x => x.Description).HasMaxLength(300);
        b.HasIndex(x => new { x.DownloadId, x.Locale }).IsUnique().HasDatabaseName("UX_DownloadTr");
    }
}

public class ProductDownloadConfiguration : IEntityTypeConfiguration<ProductDownload>
{
    public void Configure(EntityTypeBuilder<ProductDownload> b)
    {
        b.HasKey(x => new { x.ProductId, x.DownloadId });
        b.HasOne(x => x.Product).WithMany()
         .HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Download).WithMany()
         .HasForeignKey(x => x.DownloadId).OnDelete(DeleteBehavior.Restrict);
        b.HasQueryFilter(x => !x.Product!.IsDeleted);
    }
}

// ── 銷售據點 ───────────────────────────────────────────────────────────────

public class SalesLocationConfiguration : IEntityTypeConfiguration<SalesLocation>
{
    public void Configure(EntityTypeBuilder<SalesLocation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.LocationType).HasDefaultValue(SalesLocationType.Domestic);
        b.Property(x => x.CountryCode).IsRequired().AsciiColumn(2);
        b.Property(x => x.WebsiteUrl).HasMaxLength(400);
        b.Property(x => x.Phone).HasMaxLength(50);
        b.Property(x => x.Status).HasDefaultValue(ContentStatus.Published);
        b.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        b.HasIndex(x => new { x.LocationType, x.Status, x.SortOrder }).HasDatabaseName("IX_SalesLocation_Type");

        b.HasMany(x => x.Translations).WithOne(t => t.SalesLocation!)
         .HasForeignKey(t => t.SalesLocationId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class SalesLocationTranslationConfiguration : IEntityTypeConfiguration<SalesLocationTranslation>
{
    public void Configure(EntityTypeBuilder<SalesLocationTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.Name).IsRequired().HasMaxLength(200);
        b.Property(x => x.Address).HasMaxLength(400);
        b.Property(x => x.RegionLabel).HasMaxLength(120);
        b.Property(x => x.Note).HasMaxLength(200);
        b.HasIndex(x => new { x.SalesLocationId, x.Locale }).IsUnique().HasDatabaseName("UX_SalesLocationTr");
    }
}

// ── 表單來信 ───────────────────────────────────────────────────────────────

public class ContactSubmissionConfiguration : IEntityTypeConfiguration<ContactSubmission>
{
    public void Configure(EntityTypeBuilder<ContactSubmission> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Type).HasDefaultValue(ContactType.General);
        b.Property(x => x.Name).IsRequired().HasMaxLength(200);
        b.Property(x => x.Email).IsRequired().HasMaxLength(320);
        b.Property(x => x.Phone).HasMaxLength(50);
        b.Property(x => x.Company).HasMaxLength(200);
        b.Property(x => x.Country).HasMaxLength(80);
        b.Property(x => x.PartnershipType).HasMaxLength(40);
        b.Property(x => x.ProductSku).HasMaxLength(60);
        b.Property(x => x.Subject).HasMaxLength(300);
        b.Property(x => x.Message).IsRequired();
        // Locale 可為 null，套不上 AsciiColumn（它要的是 PropertyBuilder<string>）。
        // 仍要 varchar 而非 nvarchar —— 語系碼是 ASCII，且 Dapper 端以 AnsiString 傳送
        b.Property(x => x.Locale).HasColumnType("varchar(10)").IsUnicode(false).HasMaxLength(10);
        b.Property(x => x.IpAddress).HasMaxLength(60);
        b.Property(x => x.Status).HasDefaultValue(ContactStatus.Received);
        b.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // 產品下架不該讓來信跟著消失，所以是 SetNull 而不是串聯刪除 ——
        // ProductSku 的快照就是為了這一刻留的
        b.HasOne(x => x.Product).WithMany()
         .HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.SetNull);

        // 收件匣的預設排序（類型 → 狀態 → 新到舊）
        b.HasIndex(x => new { x.Type, x.Status, x.CreatedAt }).HasDatabaseName("IX_Contact_Status");

        // DB 端的速率限制靠這條數同一個 IP 的近期筆數（docs/04 §9）。
        // 行程內的 token bucket 在 Flex Consumption 上是每個實例各一份，擋不住跨實例的洗版
        b.HasIndex(x => new { x.IpAddress, x.CreatedAt }).HasDatabaseName("IX_Contact_Ip");
    }
}

// ── 應用方案 ───────────────────────────────────────────────────────────────

public class ApplicationConfiguration : IEntityTypeConfiguration<Application>
{
    public void Configure(EntityTypeBuilder<Application> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Slug).IsRequired().HasMaxLength(120);
        b.Property(x => x.Type).HasDefaultValue(ApplicationType.BodyPart);
        b.Property(x => x.Status).HasDefaultValue(ContentStatus.Draft);
        b.Property(x => x.SortOrder).HasDefaultValue(0);
        b.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.RowVer).IsRowVersion();

        b.HasQueryFilter(x => !x.IsDeleted);

        b.HasIndex(x => x.Slug).IsUnique()
         .HasFilter("[IsDeleted] = 0").HasDatabaseName("UX_Application_Slug");
        b.HasIndex(x => new { x.ShowOnBodyMap, x.SortOrder })
         .HasFilter("[Status] = 1").HasDatabaseName("IX_Application_BodyMap");

        b.HasOne(x => x.BodyPart).WithMany()
         .HasForeignKey(x => x.BodyPartId).OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Translations).WithOne(t => t.Application!)
         .HasForeignKey(t => t.ApplicationId).OnDelete(DeleteBehavior.Cascade);

        // 三個指向 Media 的 FK —— SQL Server 不允許多重 cascade 路徑，全部 Restrict
        CategoryConfiguration.MediaFk(b, nameof(Application.ImageMediaId));
        CategoryConfiguration.MediaFk(b, nameof(Application.CardImageMediaId));
        CategoryConfiguration.MediaFk(b, nameof(Application.FittingImageMediaId));

        b.HasData(ApplicationSeed.Rows());
    }
}

public class ApplicationTranslationConfiguration : IEntityTypeConfiguration<ApplicationTranslation>
{
    public void Configure(EntityTypeBuilder<ApplicationTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.Name).IsRequired().HasMaxLength(200);
        b.Property(x => x.Lead).HasMaxLength(800);
        b.Property(x => x.MapCopy).HasMaxLength(600);
        b.Property(x => x.MapCtaLabel).HasMaxLength(120);
        b.Property(x => x.SeoTitle).HasMaxLength(200);
        b.Property(x => x.SeoDescription).HasMaxLength(400);

        b.HasIndex(x => new { x.ApplicationId, x.Locale }).IsUnique().HasDatabaseName("UX_ApplicationTr");
        b.HasQueryFilter(x => !x.Application!.IsDeleted);

        b.HasData(ApplicationSeed.TranslationRows());
    }
}

public class ProductApplicationConfiguration : IEntityTypeConfiguration<ProductApplication>
{
    public void Configure(EntityTypeBuilder<ProductApplication> b)
    {
        b.HasKey(x => new { x.ProductId, x.ApplicationId });
        b.Property(x => x.SortOrder).HasDefaultValue(0);
        b.HasOne(x => x.Product).WithMany()
         .HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Application).WithMany()
         .HasForeignKey(x => x.ApplicationId).OnDelete(DeleteBehavior.Restrict);
        b.HasQueryFilter(x => !x.Product!.IsDeleted && !x.Application!.IsDeleted);
    }
}

/// <summary>
/// 7 筆應用方案（docs/05 §4）。人體圖座標取自 mockup4/Applications.dc.html 的 SVG viewBox。
/// </summary>
internal static class ApplicationSeed
{
    private sealed record Row(
        string Slug, byte Type, Guid? BodyPartId, bool OnMap, int Order,
        string En, string ZhTw, string? Map);

    private static readonly Row[] All =
    [
        new("back",  ApplicationType.BodyPart, BodyPartIds.Back,  true, 1, "Back & Waist", "背部與腰部", """{"hotspot":{"cx":130,"cy":195},"chip":{"cx":130,"cy":204}}"""),
        new("knee",  ApplicationType.BodyPart, BodyPartIds.Knee,  true, 2, "Knee",         "膝部",       """{"hotspot":{"cx":152,"cy":395},"chip":{"cx":154,"cy":334}}"""),
        new("ankle", ApplicationType.BodyPart, BodyPartIds.Ankle, true, 3, "Ankle",        "踝部",       """{"hotspot":{"cx":108,"cy":505},"chip":{"cx":107,"cy":470}}"""),
        new("foot",  ApplicationType.BodyPart, BodyPartIds.Foot,  true, 4, "Foot",         "足部",       """{"hotspot":{"cx":165,"cy":538},"chip":{"cx":168,"cy":504}}"""),

        new("elderly-care",           ApplicationType.SpecialCare, null, false, 5, "Elderly care",           "銀髮照護",   null),
        new("bunion-relief",          ApplicationType.SpecialCare, null, false, 6, "Bunion relief",          "拇趾外翻",   null),
        new("post-operative-recovery",ApplicationType.SpecialCare, null, false, 7, "Post-operative recovery","術後復健",   null),
    ];

    private static Guid Id(int i)            => new($"e1111111-0000-0000-0000-{i:D12}");
    private static Guid TrId(int i, int loc) => new($"e2222222-0000-{loc:D4}-0000-{i:D12}");

    public static Application[] Rows() =>
        All.Select((r, i) => new Application
        {
            Id = Id(i + 1), Slug = r.Slug, Type = r.Type, BodyPartId = r.BodyPartId,
            ShowOnBodyMap = r.OnMap, MapPositionJson = r.Map, SortOrder = r.Order,
            Status = ContentStatus.Published, CreatedAt = Seed.T, UpdatedAt = Seed.T,
        }).ToArray();

    public static ApplicationTranslation[] TranslationRows() =>
        All.SelectMany((r, i) => new[]
        {
            new ApplicationTranslation { Id = TrId(i + 1, 1), ApplicationId = Id(i + 1), Locale = Locales.En,   Name = r.En },
            new ApplicationTranslation { Id = TrId(i + 1, 2), ApplicationId = Id(i + 1), Locale = Locales.ZhTw, Name = r.ZhTw },
        }).ToArray();
}
