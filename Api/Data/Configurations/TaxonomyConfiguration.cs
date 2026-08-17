using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EuniceMed.Api.Data.Configurations;

/// <summary>
/// 共用的設定慣例，避免 19 張翻譯表各寫一次而漏掉。
/// </summary>
internal static class ConfigConventions
{
    /// <summary>
    /// ⚠️ 每個 <c>Locale</c> 欄位都必須套用。少套一次，該表的
    /// <c>UX_*Tr</c> 索引就會因隱含轉換而失效 —— 沒有錯誤訊息，只會慢。
    /// 見 Common/LocaleQuery.cs 與 docs/12-local-dev.md §7。
    /// </summary>
    public static PropertyBuilder<string> LocaleColumn(this PropertyBuilder<string> p) =>
        p.IsRequired().HasColumnType("varchar(10)").IsUnicode(false).HasMaxLength(10);

    /// <summary>非 Unicode 的短碼欄位（PresetKey、Format、CountryCode…）</summary>
    public static PropertyBuilder<string> AsciiColumn(this PropertyBuilder<string> p, int len) =>
        p.HasColumnType($"varchar({len})").IsUnicode(false).HasMaxLength(len);
}

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Slug).IsRequired().HasMaxLength(120);
        b.Property(x => x.SortOrder).HasDefaultValue(0);
        b.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.RowVer).IsRowVersion();

        // 篩選唯一索引必須與 global query filter 的條件一致，否則索引用不上
        b.HasIndex(x => x.Slug).IsUnique()
         .HasFilter("[IsDeleted] = 0").HasDatabaseName("UX_Category_Slug");
        b.HasQueryFilter(x => !x.IsDeleted);

        b.HasMany(x => x.Translations).WithOne(t => t.Category!)
         .HasForeignKey(t => t.CategoryId).OnDelete(DeleteBehavior.Cascade);

        MediaFk(b, nameof(Category.ImageMediaId));
        MediaFk(b, nameof(Category.HeroImageMediaId));

        b.HasData(
            new Category { Id = CategoryIds.Stockings, Slug = "medical-compression-stockings", SortOrder = 1, CreatedAt = Seed.T, UpdatedAt = Seed.T },
            new Category { Id = CategoryIds.Orthopedic, Slug = "orthopedic-support",           SortOrder = 2, CreatedAt = Seed.T, UpdatedAt = Seed.T },
            new Category { Id = CategoryIds.Footcare,   Slug = "footcare-insoles",             SortOrder = 3, CreatedAt = Seed.T, UpdatedAt = Seed.T });
    }

    /// <summary>
    /// 所有指向 Media 的 FK 一律 Restrict。兩個理由：
    /// (1) SQL Server 不允許同一張表有多條 cascade 路徑到同一目標
    ///     （Application 有 3 個 Media FK、Category/SubCategory 各 2 個）；
    /// (2) 這正好就是規格要的行為 —— 有引用的媒體不可刪，DELETE 回 409。
    /// </summary>
    internal static void MediaFk<T>(EntityTypeBuilder<T> b, string fkPropertyName) where T : class =>
        b.HasOne<Media>().WithMany()
         .HasForeignKey(fkPropertyName)
         .OnDelete(DeleteBehavior.Restrict);
}

public class CategoryTranslationConfiguration : IEntityTypeConfiguration<CategoryTranslation>
{
    public void Configure(EntityTypeBuilder<CategoryTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.Name).IsRequired().HasMaxLength(200);
        b.Property(x => x.SeoTitle).HasMaxLength(200);
        b.Property(x => x.SeoDescription).HasMaxLength(400);
        b.HasIndex(x => new { x.CategoryId, x.Locale }).IsUnique().HasDatabaseName("UX_CategoryTr");

        // 主表有軟刪除、子表沒有。不加對應的 filter，EF 會發
        // PossibleIncorrectRequiredNavigationWithQueryFilterInteraction 警告，
        // 且 Include 的行為會不如預期。所有軟刪除實體的子表都要比照辦理。
        b.HasQueryFilter(x => !x.Category!.IsDeleted);

        // 文案取自 CLAUDE.md §1 的分類表
        b.HasData(
            new CategoryTranslation { Id = new("91111111-0000-0001-0000-000000000001"), CategoryId = CategoryIds.Stockings,  Locale = "en",    Name = "Medical Compression Stockings", Description = "Improve circulation, ease symptoms and slow the progression of varicose veins." },
            new CategoryTranslation { Id = new("91111111-0000-0002-0000-000000000001"), CategoryId = CategoryIds.Stockings,  Locale = "zh-TW", Name = "醫療彈性襪",     Description = "改善循環、緩解並延緩靜脈曲張。" },
            new CategoryTranslation { Id = new("91111111-0000-0001-0000-000000000002"), CategoryId = CategoryIds.Orthopedic, Locale = "en",    Name = "Orthopedic Support",            Description = "Stability, alignment and protection for knee, ankle, elbow, wrist and back." },
            new CategoryTranslation { Id = new("91111111-0000-0002-0000-000000000002"), CategoryId = CategoryIds.Orthopedic, Locale = "zh-TW", Name = "矯型護具",       Description = "膝、踝、肘、腕、背的穩定、對位與保護。" },
            new CategoryTranslation { Id = new("91111111-0000-0001-0000-000000000003"), CategoryId = CategoryIds.Footcare,   Locale = "en",    Name = "Footcare & Insoles",            Description = "Medical-grade silicone for heel pain, plantar fasciitis and bone spurs." },
            new CategoryTranslation { Id = new("91111111-0000-0002-0000-000000000003"), CategoryId = CategoryIds.Footcare,   Locale = "zh-TW", Name = "足部護理與鞋墊", Description = "醫療級矽膠，處理足跟痛、足底筋膜炎、骨刺等。" });
    }
}

public class SubCategoryConfiguration : IEntityTypeConfiguration<SubCategory>
{
    public void Configure(EntityTypeBuilder<SubCategory> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Slug).IsRequired().HasMaxLength(120);
        b.Property(x => x.SortOrder).HasDefaultValue(0);
        b.Property(x => x.Status).HasDefaultValue(ContentStatus.Published);
        b.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.RowVer).IsRowVersion();

        // slug 為全站唯一，不是每個分類內唯一
        b.HasIndex(x => x.Slug).IsUnique()
         .HasFilter("[IsDeleted] = 0").HasDatabaseName("UX_SubCategory_Slug");
        b.HasIndex(x => new { x.CategoryId, x.SortOrder }).HasDatabaseName("IX_SubCategory_Category");
        b.HasQueryFilter(x => !x.IsDeleted);

        b.HasOne(x => x.Category).WithMany(c => c.SubCategories)
         .HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Translations).WithOne(t => t.SubCategory!)
         .HasForeignKey(t => t.SubCategoryId).OnDelete(DeleteBehavior.Cascade);

        CategoryConfiguration.MediaFk(b, nameof(SubCategory.ImageMediaId));
        CategoryConfiguration.MediaFk(b, nameof(SubCategory.HeroImageMediaId));

        b.HasData(SubCategorySeed.Rows());
    }
}

public class SubCategoryTranslationConfiguration : IEntityTypeConfiguration<SubCategoryTranslation>
{
    public void Configure(EntityTypeBuilder<SubCategoryTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.Name).IsRequired().HasMaxLength(200);
        b.Property(x => x.SeoTitle).HasMaxLength(200);
        b.Property(x => x.SeoDescription).HasMaxLength(400);
        b.HasIndex(x => new { x.SubCategoryId, x.Locale }).IsUnique().HasDatabaseName("UX_SubCategoryTr");
        b.HasQueryFilter(x => !x.SubCategory!.IsDeleted);

        b.HasData(SubCategorySeed.TranslationRows());
    }
}

public class CertificationConfiguration : IEntityTypeConfiguration<Certification>
{
    public void Configure(EntityTypeBuilder<Certification> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Slug).IsRequired().HasMaxLength(80);
        b.Property(x => x.Mark).IsRequired().HasMaxLength(80);
        b.Property(x => x.Status).HasDefaultValue(ContentStatus.Published);
        b.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.HasIndex(x => x.Slug).IsUnique().HasDatabaseName("UX_Certification_Slug");

        b.HasMany(x => x.Translations).WithOne(t => t.Certification!)
         .HasForeignKey(t => t.CertificationId).OnDelete(DeleteBehavior.Cascade);

        CategoryConfiguration.MediaFk(b, nameof(Certification.LogoMediaId));
        // DownloadId 的 FK 待 Phase 6 建立 Download 表後再補

        b.HasData(
            new Certification { Id = CertIds.Iso,      Slug = "iso-13485",    Mark = "ISO 13485",    SortOrder = 1, CreatedAt = Seed.T, UpdatedAt = Seed.T },
            new Certification { Id = CertIds.Ce,       Slug = "ce",           Mark = "CE",           SortOrder = 2, CreatedAt = Seed.T, UpdatedAt = Seed.T },
            new Certification { Id = CertIds.OekoTex,  Slug = "oeko-tex-100", Mark = "OEKO-TEX 100", SortOrder = 3, CreatedAt = Seed.T, UpdatedAt = Seed.T },
            new Certification { Id = CertIds.Patented, Slug = "patented",     Mark = "Patented",     SortOrder = 4, CreatedAt = Seed.T, UpdatedAt = Seed.T },
            new Certification { Id = CertIds.Mit,      Slug = "mit",          Mark = "MIT",          SortOrder = 5, CreatedAt = Seed.T, UpdatedAt = Seed.T });
    }
}

public class CertificationTranslationConfiguration : IEntityTypeConfiguration<CertificationTranslation>
{
    public void Configure(EntityTypeBuilder<CertificationTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.SubLabel).HasMaxLength(120);
        b.Property(x => x.Description).HasMaxLength(400);
        b.HasIndex(x => new { x.CertificationId, x.Locale }).IsUnique().HasDatabaseName("UX_CertificationTr");

        // ⚠️ 以下為佔位文案，**待品牌方提供正式說明**。
        // Mark 本身（ISO 13485 等）是品牌符號不翻譯，只有 SubLabel / Description 需要中英各一。
        b.HasData(
            Tr(CertIds.Iso,      1, "en",    "Quality management",      "Medical device quality management system certification."),
            Tr(CertIds.Iso,      2, "zh-TW", "品質管理系統",             "醫療器材品質管理系統認證。"),
            Tr(CertIds.Ce,       1, "en",    "European conformity",     "Conforms to EU health, safety and environmental requirements."),
            Tr(CertIds.Ce,       2, "zh-TW", "歐盟符合性",               "符合歐盟健康、安全與環境要求。"),
            Tr(CertIds.OekoTex,  1, "en",    "Tested for harmful substances", "Textiles tested free from harmful substances."),
            Tr(CertIds.OekoTex,  2, "zh-TW", "有害物質檢驗",             "紡織品經檢驗不含有害物質。"),
            Tr(CertIds.Patented, 1, "en",    "Patented design",         "Protected by registered design patents."),
            Tr(CertIds.Patented, 2, "zh-TW", "專利設計",                 "受註冊設計專利保護。"),
            Tr(CertIds.Mit,      1, "en",    "Made in Taiwan",          "Designed and manufactured in Taiwan."),
            Tr(CertIds.Mit,      2, "zh-TW", "台灣製造",                 "台灣設計與製造。"));
    }

    private static CertificationTranslation Tr(Guid certId, int localeNo, string locale, string subLabel, string description) =>
        new()
        {
            Id              = new($"a1111111-0000-{localeNo:D4}-0000-{certId.ToString("N")[^12..]}"),
            CertificationId = certId,
            Locale          = locale,
            SubLabel        = subLabel,
            Description     = description,
        };
}

public class BodyPartConfiguration : IEntityTypeConfiguration<BodyPart>
{
    public void Configure(EntityTypeBuilder<BodyPart> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Slug).IsRequired().HasMaxLength(60);
        b.Property(x => x.NameEn).IsRequired().HasMaxLength(80);
        b.Property(x => x.NameZhTw).IsRequired().HasMaxLength(80);
        b.HasIndex(x => x.Slug).IsUnique().HasDatabaseName("UX_BodyPart_Slug");

        // 7 筆；僅 back / knee / ankle / foot 顯示於人體圖（docs/05 §4）
        b.HasData(
            new BodyPart { Id = BodyPartIds.Knee,  Slug = "knee",  NameEn = "Knee",  NameZhTw = "膝",   ShowOnBodyMap = true,  SortOrder = 1 },
            new BodyPart { Id = BodyPartIds.Ankle, Slug = "ankle", NameEn = "Ankle", NameZhTw = "踝",   ShowOnBodyMap = true,  SortOrder = 2 },
            new BodyPart { Id = BodyPartIds.Elbow, Slug = "elbow", NameEn = "Elbow", NameZhTw = "肘",   ShowOnBodyMap = false, SortOrder = 3 },
            new BodyPart { Id = BodyPartIds.Wrist, Slug = "wrist", NameEn = "Wrist", NameZhTw = "腕",   ShowOnBodyMap = false, SortOrder = 4 },
            new BodyPart { Id = BodyPartIds.Back,  Slug = "back",  NameEn = "Back",  NameZhTw = "背",   ShowOnBodyMap = true,  SortOrder = 5 },
            new BodyPart { Id = BodyPartIds.Foot,  Slug = "foot",  NameEn = "Foot",  NameZhTw = "足",   ShowOnBodyMap = true,  SortOrder = 6 },
            new BodyPart { Id = BodyPartIds.Leg,   Slug = "leg",   NameEn = "Leg",   NameZhTw = "腿",   ShowOnBodyMap = false, SortOrder = 7 });
    }
}

public class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Slug).IsRequired().HasMaxLength(80);
        b.Property(x => x.NameEn).IsRequired().HasMaxLength(120);
        b.Property(x => x.NameZhTw).HasMaxLength(120);
        b.HasIndex(x => x.Slug).IsUnique().HasDatabaseName("UX_Tag_Slug");
    }
}

public class MediaConfiguration : IEntityTypeConfiguration<Media>
{
    public void Configure(EntityTypeBuilder<Media> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.BlobUrl).IsRequired().HasMaxLength(500);
        b.Property(x => x.FileName).IsRequired().HasMaxLength(260);
        b.Property(x => x.MimeType).IsRequired().HasMaxLength(120);
        b.Property(x => x.AltText).HasMaxLength(300);
        b.Property(x => x.PresetKey).IsRequired().AsciiColumn(30);
        b.Property(x => x.OriginalBlobUrl).HasMaxLength(500);
        b.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        b.HasIndex(x => new { x.PresetKey, x.CreatedAt })
         .IsDescending(false, true).HasDatabaseName("IX_Media_Preset");
    }
}

// ── Seed 用的固定識別碼 ────────────────────────────────────────────────────

internal static class Seed
{
    public static readonly DateTime T = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
}

public static class CategoryIds
{
    public static readonly Guid Stockings  = new("41111111-0000-0000-0000-000000000001");
    public static readonly Guid Orthopedic = new("41111111-0000-0000-0000-000000000002");
    public static readonly Guid Footcare   = new("41111111-0000-0000-0000-000000000003");
}

public static class CertIds
{
    public static readonly Guid Iso      = new("51111111-0000-0000-0000-000000000001");
    public static readonly Guid Ce       = new("51111111-0000-0000-0000-000000000002");
    public static readonly Guid OekoTex  = new("51111111-0000-0000-0000-000000000003");
    public static readonly Guid Patented = new("51111111-0000-0000-0000-000000000004");
    public static readonly Guid Mit      = new("51111111-0000-0000-0000-000000000005");
}

public static class BodyPartIds
{
    public static readonly Guid Knee  = new("61111111-0000-0000-0000-000000000001");
    public static readonly Guid Ankle = new("61111111-0000-0000-0000-000000000002");
    public static readonly Guid Elbow = new("61111111-0000-0000-0000-000000000003");
    public static readonly Guid Wrist = new("61111111-0000-0000-0000-000000000004");
    public static readonly Guid Back  = new("61111111-0000-0000-0000-000000000005");
    public static readonly Guid Foot  = new("61111111-0000-0000-0000-000000000006");
    public static readonly Guid Leg   = new("61111111-0000-0000-0000-000000000007");
}
