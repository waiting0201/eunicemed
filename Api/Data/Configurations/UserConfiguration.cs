using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EuniceMed.Api.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("User");   // docs/05 §1：保留字，需明確指定並由 EF 加引號
        builder.HasKey(u => u.Id);

        // 登入識別，不驗 email 格式（見 Models/Entities/User.cs 的註解）。
        // 320 是 email 的上限，純帳號名用不到那麼長，但放寬不花成本。
        builder.Property(u => u.Email)
               .IsRequired()
               .HasMaxLength(320);

        builder.HasIndex(u => u.Email)
               .IsUnique()
               .HasDatabaseName("UX_User_Email");

        builder.Property(u => u.DisplayName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(u => u.PasswordHash)
               .IsRequired();

        builder.Property(u => u.IsActive)
               .HasDefaultValue(true);

        builder.Property(u => u.CreatedAt)
               .HasDefaultValueSql("SYSUTCDATETIME()");

        // ── 規格外新增的三欄 ──────────────────────────────────────────────
        // docs/05-database.md §3.12 的 [User] DDL 沒有這三欄，但 docs/03 §7 與
        // docs/07 §7.4 都明文要求「登入失敗鎖定」，docs/05 §4 要求預設管理者
        // 「強制首次登入變更密碼」。沒有欄位就做不到，因此在此補上。
        // 記錄於 CLAUDE.md §7 🟡。
        builder.Property(u => u.FailedLoginCount)
               .HasDefaultValue(0);

        builder.Property(u => u.MustChangePassword)
               .HasDefaultValue(false);
    }
}

public class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Name)
               .IsRequired()
               .HasMaxLength(60);

        builder.HasIndex(r => r.Name)
               .IsUnique()
               .HasDatabaseName("UX_Role_Name");

        // 四個角色為固定資料（docs/03-cms.md §2）
        builder.HasData(
            new Role { Id = RoleIds.Admin,  Name = RoleNames.Admin  },
            new Role { Id = RoleIds.Editor, Name = RoleNames.Editor },
            new Role { Id = RoleIds.Author, Name = RoleNames.Author },
            new Role { Id = RoleIds.Viewer, Name = RoleNames.Viewer });
    }
}

public static class RoleIds
{
    public static readonly Guid Admin  = new("31111111-0000-0000-0000-000000000001");
    public static readonly Guid Editor = new("31111111-0000-0000-0000-000000000002");
    public static readonly Guid Author = new("31111111-0000-0000-0000-000000000003");
    public static readonly Guid Viewer = new("31111111-0000-0000-0000-000000000004");
}

public class UserRoleConfiguration : IEntityTypeConfiguration<UserRole>
{
    public void Configure(EntityTypeBuilder<UserRole> builder)
    {
        builder.HasKey(ur => new { ur.UserId, ur.RoleId });

        builder.HasOne(ur => ur.User)
               .WithMany(u => u.UserRoles)
               .HasForeignKey(ur => ur.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ur => ur.Role)
               .WithMany(r => r.UserRoles)
               .HasForeignKey(ur => ur.RoleId)
               .OnDelete(DeleteBehavior.Restrict);   // 角色是固定資料，不該因刪使用者而動
    }
}

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.HasKey(t => t.Id);

        builder.Property(t => t.TokenHash)
               .IsRequired()
               .HasMaxLength(64);          // Base64 of SHA-256 = 44 chars；給定長度才建得了索引

        builder.Property(t => t.CreatedAt)
               .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasOne(t => t.User)
               .WithMany(u => u.RefreshTokens)
               .HasForeignKey(t => t.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        // 規格外新增：docs/05 §3.12 的 RefreshToken 沒有任何索引，
        // 但「以 token 換新 token」是熱路徑，沒索引等於每次 refresh 都掃全表。
        builder.HasIndex(t => t.TokenHash)
               .HasDatabaseName("IX_RefreshToken_TokenHash");

        builder.HasIndex(t => new { t.UserId, t.ExpiresAt })
               .HasDatabaseName("IX_RefreshToken_User");
    }
}
