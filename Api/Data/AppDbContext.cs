using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace EuniceMed.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // ── 產品分類 ────────────────────────────────────────────────────────
    public DbSet<Collection>            Collections            { get; set; }
    public DbSet<CollectionTranslation> CollectionTranslations { get; set; }

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
