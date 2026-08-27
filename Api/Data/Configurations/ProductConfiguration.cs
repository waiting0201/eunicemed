using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EuniceMed.Api.Data.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Slug).IsRequired().HasMaxLength(160);
        b.Property(x => x.Sku).HasMaxLength(60);
        b.Property(x => x.Status).HasDefaultValue(ContentStatus.Draft);
        b.Property(x => x.SortOrder).HasDefaultValue(0);
        b.Property(x => x.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        b.Property(x => x.RowVer).IsRowVersion();

        b.HasQueryFilter(x => !x.IsDeleted);

        // ── 索引（docs/05 §6：全為熱路徑）─────────────────────────────────
        b.HasIndex(x => x.Slug).IsUnique()
         .HasFilter("[IsDeleted] = 0").HasDatabaseName("UX_Product_Slug");
        b.HasIndex(x => new { x.CategoryId, x.Status }).HasDatabaseName("IX_Product_Category");
        b.HasIndex(x => new { x.SubCategoryId, x.Status }).HasDatabaseName("IX_Product_SubCategory");
        b.HasIndex(x => new { x.CollectionId, x.Status }).HasDatabaseName("IX_Product_Collection");
        b.HasIndex(x => x.Sku).HasFilter("[IsDeleted] = 0").HasDatabaseName("IX_Product_Sku");
        b.HasIndex(x => new { x.IsFeatured, x.FeaturedSortOrder })
         .HasFilter("[Status] = 1 AND [IsDeleted] = 0").HasDatabaseName("IX_Product_Featured");

        // ── 關聯 ──────────────────────────────────────────────────────────
        b.HasOne(x => x.Category).WithMany(c => c.Products)
         .HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.SubCategory).WithMany(s => s.Products)
         .HasForeignKey(x => x.SubCategoryId).OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.Collection).WithMany()
         .HasForeignKey(x => x.CollectionId).OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Translations).WithOne(t => t.Product!)
         .HasForeignKey(t => t.ProductId).OnDelete(DeleteBehavior.Cascade);

        b.HasMany(x => x.Images).WithOne(i => i.Product!)
         .HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.Cascade);

        CategoryConfiguration.MediaFk(b, nameof(Product.UseCaseImageMediaId));
        CategoryConfiguration.MediaFk(b, nameof(Product.SizeChartDiagramMediaId));
    }
}

public class ProductTranslationConfiguration : IEntityTypeConfiguration<ProductTranslation>
{
    public void Configure(EntityTypeBuilder<ProductTranslation> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Locale).LocaleColumn();
        b.Property(x => x.Name).IsRequired().HasMaxLength(250);
        b.Property(x => x.Summary).HasMaxLength(600);
        b.Property(x => x.FeaturedBlurb).HasMaxLength(300);
        b.Property(x => x.SeoTitle).HasMaxLength(200);
        b.Property(x => x.SeoDescription).HasMaxLength(400);

        b.HasIndex(x => new { x.ProductId, x.Locale }).IsUnique().HasDatabaseName("UX_ProductTr");
        b.HasIndex(x => x.Locale).HasDatabaseName("IX_ProductTr_Locale");
        b.HasQueryFilter(x => !x.Product!.IsDeleted);

        CategoryConfiguration.MediaFk(b, nameof(ProductTranslation.OgImageMediaId));
    }
}

public class ProductImageConfiguration : IEntityTypeConfiguration<ProductImage>
{
    public void Configure(EntityTypeBuilder<ProductImage> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.SortOrder).HasDefaultValue(0);
        b.HasQueryFilter(x => !x.Product!.IsDeleted);

        b.HasOne<Media>().WithMany().HasForeignKey(x => x.MediaId)
         .OnDelete(DeleteBehavior.Restrict);
    }
}

/// <summary>
/// 自我參照多對多 + 排序欄位。三個要點：
/// <list type="number">
/// <item>必須是顯式 join entity（帶 <c>SortOrder</c> payload），不能用 skip navigation。</item>
/// <item>兩個 FK 都指向 <c>Product</c>，SQL Server 會拒絕多重 cascade 路徑，
///       因此**兩邊都必須 Restrict**。</item>
/// <item>連帶後果：刪產品前要先自行清掉兩側的 <c>ProductRelated</c> 列，
///       否則 FK 會擋下刪除（見 ProductHandler 的刪除流程）。</item>
/// </list>
/// </summary>
public class ProductRelatedConfiguration : IEntityTypeConfiguration<ProductRelated>
{
    public void Configure(EntityTypeBuilder<ProductRelated> b)
    {
        b.HasKey(x => new { x.ProductId, x.RelatedProductId });
        b.Property(x => x.SortOrder).HasDefaultValue(0);

        b.HasOne(x => x.Product).WithMany(p => p.Related)
         .HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.RelatedProduct).WithMany()
         .HasForeignKey(x => x.RelatedProductId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class ProductBodyPartConfiguration : IEntityTypeConfiguration<ProductBodyPart>
{
    public void Configure(EntityTypeBuilder<ProductBodyPart> b)
    {
        b.HasKey(x => new { x.ProductId, x.BodyPartId });
        b.HasOne(x => x.Product).WithMany(p => p.BodyParts)
         .HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.BodyPart).WithMany(bp => bp.ProductBodyParts)
         .HasForeignKey(x => x.BodyPartId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class ProductCertificationConfiguration : IEntityTypeConfiguration<ProductCertification>
{
    public void Configure(EntityTypeBuilder<ProductCertification> b)
    {
        b.HasKey(x => new { x.ProductId, x.CertificationId });
        b.HasOne(x => x.Product).WithMany(p => p.Certifications)
         .HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Certification).WithMany()
         .HasForeignKey(x => x.CertificationId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class ProductTagConfiguration : IEntityTypeConfiguration<ProductTag>
{
    public void Configure(EntityTypeBuilder<ProductTag> b)
    {
        b.HasKey(x => new { x.ProductId, x.TagId });
        b.HasOne(x => x.Product).WithMany(p => p.Tags)
         .HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Tag).WithMany(t => t.ProductTags)
         .HasForeignKey(x => x.TagId).OnDelete(DeleteBehavior.Restrict);
    }
}
