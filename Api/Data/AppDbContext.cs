using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace EuniceMed.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // ── 產品分類 ────────────────────────────────────────────────────────
    public DbSet<Collection>            Collections            { get; set; }
    public DbSet<CollectionTranslation> CollectionTranslations { get; set; }

    public DbSet<Category>                Categories                { get; set; }
    public DbSet<CategoryTranslation>     CategoryTranslations      { get; set; }
    public DbSet<SubCategory>             SubCategories             { get; set; }
    public DbSet<SubCategoryTranslation>  SubCategoryTranslations   { get; set; }
    public DbSet<Certification>           Certifications            { get; set; }
    public DbSet<CertificationTranslation> CertificationTranslations { get; set; }
    public DbSet<BodyPart>                BodyParts                 { get; set; }
    public DbSet<Tag>                     Tags                      { get; set; }

    // ── 產品 ────────────────────────────────────────────────────────────
    public DbSet<Product>              Products             { get; set; }
    public DbSet<ProductTranslation>   ProductTranslations  { get; set; }
    public DbSet<ProductImage>         ProductImages        { get; set; }
    public DbSet<ProductRelated>       ProductRelated       { get; set; }
    public DbSet<ProductBodyPart>      ProductBodyParts     { get; set; }
    public DbSet<ProductCertification> ProductCertifications { get; set; }
    public DbSet<ProductTag>           ProductTags          { get; set; }

    // ── 媒體 ────────────────────────────────────────────────────────────
    public DbSet<Media>        Media         { get; set; }
    public DbSet<MediaVariant> MediaVariants { get; set; }
    public DbSet<MediaUsage>   MediaUsages   { get; set; }

    // ── 頁面區段 ────────────────────────────────────────────────────────
    public DbSet<Page>                   Pages                    { get; set; }
    public DbSet<PageSection>            PageSections             { get; set; }
    public DbSet<PageSectionTranslation> PageSectionTranslations  { get; set; }

    // ── 使用者與稽核 ────────────────────────────────────────────────────
    public DbSet<User>         Users         { get; set; }
    public DbSet<Role>         Roles         { get; set; }
    public DbSet<UserRole>     UserRoles     { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<AuditLog>     AuditLogs     { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 自動套用 Configurations/ 下所有 IEntityTypeConfiguration<T>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        // datetime2 不帶時區資訊。統一在讀出時標記為 UTC，
        // 否則第一次部署就會出現本地時間 / UTC 混用的錯誤。
        builder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
    }
}
