using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EuniceMed.Api.Data.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.HasKey(a => a.Id);

        // 全案唯一的非 GUID 主鍵。稽核是純附加寫入，用 IDENTITY 比 GUID 省空間且天然有序。
        builder.Property(a => a.Id)
               .UseIdentityColumn();

        builder.Property(a => a.Action)
               .IsRequired()
               .HasMaxLength(60);

        builder.Property(a => a.Entity)
               .IsRequired()
               .HasMaxLength(80);

        // 字串而非 Guid —— Setting 的主鍵是字串
        builder.Property(a => a.EntityId)
               .HasMaxLength(80);

        builder.Property(a => a.CreatedAt)
               .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasIndex(a => new { a.Entity, a.EntityId, a.CreatedAt })
               .HasDatabaseName("IX_Audit_Entity")
               .IsDescending(false, false, true);
    }
}
