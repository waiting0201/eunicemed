using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EuniceMed.Api.Data.Configurations;

public class MenuItemConfiguration : IEntityTypeConfiguration<MenuItem>
{
    public void Configure(EntityTypeBuilder<MenuItem> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Menu).HasColumnType("varchar(20)").IsRequired();
        b.Property(x => x.Url).IsRequired().HasMaxLength(400);
        b.Property(x => x.SortOrder).HasDefaultValue(0);

        b.HasIndex(x => new { x.Menu, x.SortOrder }).HasDatabaseName("IX_MenuItem_Menu");

        // 自參照樹。**必須 Restrict** —— 兩層以上的 cascade 在 SQL Server 會被拒絕，
        // 連帶後果是刪父節點前要自己處理子節點（Handler 內擋掉）。
        b.HasOne(x => x.Parent).WithMany(x => x.Children)
         .HasForeignKey(x => x.ParentId).OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Translations).WithOne(t => t.MenuItem!)
         .HasForeignKey(t => t.MenuItemId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class MenuItemTranslationConfiguration : IEntityTypeConfiguration<MenuItemTranslation>
{
    public void Configure(EntityTypeBuilder<MenuItemTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.Label).IsRequired().HasMaxLength(200);

        b.HasIndex(x => new { x.MenuItemId, x.Locale }).IsUnique().HasDatabaseName("UX_MenuItemTr");
    }
}

public class RedirectConfiguration : IEntityTypeConfiguration<Redirect>
{
    public void Configure(EntityTypeBuilder<Redirect> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.FromPath).IsRequired().HasMaxLength(400);
        b.Property(x => x.ToPath).IsRequired().HasMaxLength(400);
        b.Property(x => x.StatusCode).HasDefaultValue((short)301);
        b.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // 來源路徑唯一：同一個舊網址不能有兩條規則，否則轉去哪裡取決於查詢順序
        b.HasIndex(x => x.FromPath).IsUnique().HasDatabaseName("UX_Redirect_From");
    }
}

public class SettingConfiguration : IEntityTypeConfiguration<Setting>
{
    public void Configure(EntityTypeBuilder<Setting> b)
    {
        // 主鍵是 Key —— 它是一組具名鍵值，不是可增刪的內容實體（docs/05 §3.11）
        b.HasKey(x => x.Key);
        b.Property(x => x.Key).HasMaxLength(120);
        b.Property(x => x.ValueJson).IsRequired();
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        b.HasMany(x => x.Translations).WithOne(t => t.Setting!)
         .HasForeignKey(t => t.Key).OnDelete(DeleteBehavior.Cascade);
    }
}

public class SettingTranslationConfiguration : IEntityTypeConfiguration<SettingTranslation>
{
    public void Configure(EntityTypeBuilder<SettingTranslation> b)
    {
        b.HasKey(x => new { x.Key, x.Locale });
        b.Property(x => x.Key).HasMaxLength(120);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.ValueJson).IsRequired();
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
    }
}
