using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EuniceMed.Api.Data.Configurations;

public class MediaVariantConfiguration : IEntityTypeConfiguration<MediaVariant>
{
    public void Configure(EntityTypeBuilder<MediaVariant> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Format).IsRequired().AsciiColumn(10);
        b.Property(x => x.BlobUrl).IsRequired().HasMaxLength(500);

        // 這是全案唯一宣告 Cascade 的媒體關聯：variant 是 master 的附屬檔案，
        // master 沒了就沒有存在意義。其餘指向 Media 的 FK 一律 Restrict。
        b.HasOne(x => x.Media).WithMany()
         .HasForeignKey(x => x.MediaId).OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => new { x.MediaId, x.Format, x.Width })
         .IsUnique().HasDatabaseName("UX_MediaVariant");
    }
}

public class MediaUsageConfiguration : IEntityTypeConfiguration<MediaUsage>
{
    public void Configure(EntityTypeBuilder<MediaUsage> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).UseIdentityColumn();

        // Entity 是固定的一組 ASCII 型別名稱，用 varchar 省一半空間
        b.Property(x => x.Entity).IsRequired().AsciiColumn(40);
        b.Property(x => x.Locale!).AsciiColumn(10);
        b.Property(x => x.FieldPath).IsRequired().HasMaxLength(200);
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        b.HasOne(x => x.Media).WithMany()
         .HasForeignKey(x => x.MediaId).OnDelete(DeleteBehavior.Cascade);

        // 規格原本的四欄複合主鍵改為此唯一索引（見 MediaUsage 的說明）
        b.HasIndex(x => new { x.MediaId, x.Entity, x.EntityId, x.FieldPath })
         .IsUnique().HasDatabaseName("UX_MediaUsage");

        b.HasIndex(x => new { x.Entity, x.EntityId })
         .HasDatabaseName("IX_MediaUsage_Entity");
    }
}
