using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace EuniceMed.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class TaxonomyAndProducts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BodyParts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    NameZhTw = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    ShowOnBodyMap = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BodyParts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Media",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BlobUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    MimeType = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    AltText = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Width = table.Column<int>(type: "int", nullable: true),
                    Height = table.Column<int>(type: "int", nullable: true),
                    PresetKey = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false),
                    OriginalWidth = table.Column<int>(type: "int", nullable: true),
                    OriginalHeight = table.Column<int>(type: "int", nullable: true),
                    OriginalBlobUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Media", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    NameZhTw = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ImageMediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    HeroImageMediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVer = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Categories_Media_HeroImageMediaId",
                        column: x => x.HeroImageMediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Categories_Media_ImageMediaId",
                        column: x => x.ImageMediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Certifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Mark = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    LogoMediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DownloadId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)1),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Certifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Certifications_Media_LogoMediaId",
                        column: x => x.LogoMediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CategoryTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StatsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SupportLevelsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SeoTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SeoDescription = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CategoryTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CategoryTranslations_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SubCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ImageMediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    HeroImageMediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)1),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVer = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SubCategories_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SubCategories_Media_HeroImageMediaId",
                        column: x => x.HeroImageMediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SubCategories_Media_ImageMediaId",
                        column: x => x.ImageMediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CertificationTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CertificationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    SubLabel = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CertificationTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CertificationTranslations_Certifications_CertificationId",
                        column: x => x.CertificationId,
                        principalTable: "Certifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Sku = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    CategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CollectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)0),
                    IsFeatured = table.Column<bool>(type: "bit", nullable: false),
                    FeaturedSortOrder = table.Column<int>(type: "int", nullable: false),
                    UseCaseImageMediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RowVer = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Products_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Products_Collections_CollectionId",
                        column: x => x.CollectionId,
                        principalTable: "Collections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Products_Media_UseCaseImageMediaId",
                        column: x => x.UseCaseImageMediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Products_SubCategories_SubCategoryId",
                        column: x => x.SubCategoryId,
                        principalTable: "SubCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SubCategoryTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StatsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SeoTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SeoDescription = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubCategoryTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SubCategoryTranslations_SubCategories_SubCategoryId",
                        column: x => x.SubCategoryId,
                        principalTable: "SubCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductBodyParts",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BodyPartId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductBodyParts", x => new { x.ProductId, x.BodyPartId });
                    table.ForeignKey(
                        name: "FK_ProductBodyParts_BodyParts_BodyPartId",
                        column: x => x.BodyPartId,
                        principalTable: "BodyParts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductBodyParts_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductCertifications",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CertificationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductCertifications", x => new { x.ProductId, x.CertificationId });
                    table.ForeignKey(
                        name: "FK_ProductCertifications_Certifications_CertificationId",
                        column: x => x.CertificationId,
                        principalTable: "Certifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductCertifications_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductImages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductImages_Media_MediaId",
                        column: x => x.MediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductImages_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductRelated",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RelatedProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductRelated", x => new { x.ProductId, x.RelatedProductId });
                    table.ForeignKey(
                        name: "FK_ProductRelated_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductRelated_Products_RelatedProductId",
                        column: x => x.RelatedProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductTags",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TagId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductTags", x => new { x.ProductId, x.TagId });
                    table.ForeignKey(
                        name: "FK_ProductTags_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductTags_Tags_TagId",
                        column: x => x.TagId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(600)", maxLength: 600, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FeaturedBlurb = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    FeaturesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UseCasesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SpecsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SizeChartJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConditionsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SeoTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SeoDescription = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    OgImageMediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductTranslations_Media_OgImageMediaId",
                        column: x => x.OgImageMediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductTranslations_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "BodyParts",
                columns: new[] { "Id", "NameEn", "NameZhTw", "ShowOnBodyMap", "Slug", "SortOrder" },
                values: new object[,]
                {
                    { new Guid("61111111-0000-0000-0000-000000000001"), "Knee", "膝", true, "knee", 1 },
                    { new Guid("61111111-0000-0000-0000-000000000002"), "Ankle", "踝", true, "ankle", 2 },
                    { new Guid("61111111-0000-0000-0000-000000000003"), "Elbow", "肘", false, "elbow", 3 },
                    { new Guid("61111111-0000-0000-0000-000000000004"), "Wrist", "腕", false, "wrist", 4 },
                    { new Guid("61111111-0000-0000-0000-000000000005"), "Back", "背", true, "back", 5 },
                    { new Guid("61111111-0000-0000-0000-000000000006"), "Foot", "足", true, "foot", 6 },
                    { new Guid("61111111-0000-0000-0000-000000000007"), "Leg", "腿", false, "leg", 7 }
                });

            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "CreatedAt", "HeroImageMediaId", "ImageMediaId", "IsDeleted", "Slug", "SortOrder", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("41111111-0000-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "medical-compression-stockings", 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("41111111-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "orthopedic-support", 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("41111111-0000-0000-0000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "footcare-insoles", 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "Certifications",
                columns: new[] { "Id", "CreatedAt", "DownloadId", "LogoMediaId", "Mark", "Slug", "SortOrder", "Status", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("51111111-0000-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "ISO 13485", "iso-13485", 1, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("51111111-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "CE", "ce", 2, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("51111111-0000-0000-0000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "OEKO-TEX 100", "oeko-tex-100", 3, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("51111111-0000-0000-0000-000000000004"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "Patented", "patented", 4, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("51111111-0000-0000-0000-000000000005"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "MIT", "mit", 5, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "SubCategories",
                columns: new[] { "Id", "CategoryId", "CreatedAt", "HeroImageMediaId", "ImageMediaId", "IsDeleted", "Slug", "SortOrder", "Status", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("71111111-0000-0000-0000-000000000001"), new Guid("41111111-0000-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "stockings-for-venous-therapy", 1, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000002"), new Guid("41111111-0000-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "stockings-for-edema-therapy", 2, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000003"), new Guid("41111111-0000-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "stockings-for-antiembolism", 3, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000004"), new Guid("41111111-0000-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "stockings-for-everyday", 4, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000005"), new Guid("41111111-0000-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "travel-stockings", 5, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000006"), new Guid("41111111-0000-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "diabetic-socks", 6, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000007"), new Guid("41111111-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "knee-support", 1, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000008"), new Guid("41111111-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "back-support", 2, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000009"), new Guid("41111111-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "ankle-support", 3, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000010"), new Guid("41111111-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "wrist-support", 4, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000011"), new Guid("41111111-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "elbow-support", 5, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000012"), new Guid("41111111-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "shoulder-support", 6, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000013"), new Guid("41111111-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "neck-support", 7, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000014"), new Guid("41111111-0000-0000-0000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "silicone", 1, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000015"), new Guid("41111111-0000-0000-0000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "gel", 2, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000016"), new Guid("41111111-0000-0000-0000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "moisturizing", 3, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("71111111-0000-0000-0000-000000000017"), new Guid("41111111-0000-0000-0000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "high-heel-sandals", 4, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "SubCategoryTranslations",
                columns: new[] { "Id", "Description", "Locale", "Name", "SeoDescription", "SeoTitle", "StatsJson", "SubCategoryId" },
                values: new object[,]
                {
                    { new Guid("81111111-0000-0001-0000-000000000001"), null, "en", "Venous Therapy Stockings", null, null, null, new Guid("71111111-0000-0000-0000-000000000001") },
                    { new Guid("81111111-0000-0001-0000-000000000002"), null, "en", "Edema Therapy Stockings", null, null, null, new Guid("71111111-0000-0000-0000-000000000002") },
                    { new Guid("81111111-0000-0001-0000-000000000003"), null, "en", "Antiembolism Stockings", null, null, null, new Guid("71111111-0000-0000-0000-000000000003") },
                    { new Guid("81111111-0000-0001-0000-000000000004"), null, "en", "Everyday Stockings", null, null, null, new Guid("71111111-0000-0000-0000-000000000004") },
                    { new Guid("81111111-0000-0001-0000-000000000005"), null, "en", "Travel Stockings", null, null, null, new Guid("71111111-0000-0000-0000-000000000005") },
                    { new Guid("81111111-0000-0001-0000-000000000006"), null, "en", "Diabetic Socks", null, null, null, new Guid("71111111-0000-0000-0000-000000000006") },
                    { new Guid("81111111-0000-0001-0000-000000000007"), null, "en", "Knee Support", null, null, null, new Guid("71111111-0000-0000-0000-000000000007") },
                    { new Guid("81111111-0000-0001-0000-000000000008"), null, "en", "Back Support", null, null, null, new Guid("71111111-0000-0000-0000-000000000008") },
                    { new Guid("81111111-0000-0001-0000-000000000009"), null, "en", "Ankle Support", null, null, null, new Guid("71111111-0000-0000-0000-000000000009") },
                    { new Guid("81111111-0000-0001-0000-000000000010"), null, "en", "Wrist Support", null, null, null, new Guid("71111111-0000-0000-0000-000000000010") },
                    { new Guid("81111111-0000-0001-0000-000000000011"), null, "en", "Elbow Support", null, null, null, new Guid("71111111-0000-0000-0000-000000000011") },
                    { new Guid("81111111-0000-0001-0000-000000000012"), null, "en", "Shoulder Support", null, null, null, new Guid("71111111-0000-0000-0000-000000000012") },
                    { new Guid("81111111-0000-0001-0000-000000000013"), null, "en", "Neck Support", null, null, null, new Guid("71111111-0000-0000-0000-000000000013") },
                    { new Guid("81111111-0000-0001-0000-000000000014"), null, "en", "Silicone", null, null, null, new Guid("71111111-0000-0000-0000-000000000014") },
                    { new Guid("81111111-0000-0001-0000-000000000015"), null, "en", "Gel", null, null, null, new Guid("71111111-0000-0000-0000-000000000015") },
                    { new Guid("81111111-0000-0001-0000-000000000016"), null, "en", "Moisturizing", null, null, null, new Guid("71111111-0000-0000-0000-000000000016") },
                    { new Guid("81111111-0000-0001-0000-000000000017"), null, "en", "High Heel Sandals", null, null, null, new Guid("71111111-0000-0000-0000-000000000017") },
                    { new Guid("81111111-0000-0002-0000-000000000001"), null, "zh-TW", "靜脈治療彈性襪", null, null, null, new Guid("71111111-0000-0000-0000-000000000001") },
                    { new Guid("81111111-0000-0002-0000-000000000002"), null, "zh-TW", "水腫治療彈性襪", null, null, null, new Guid("71111111-0000-0000-0000-000000000002") },
                    { new Guid("81111111-0000-0002-0000-000000000003"), null, "zh-TW", "抗栓塞彈性襪", null, null, null, new Guid("71111111-0000-0000-0000-000000000003") },
                    { new Guid("81111111-0000-0002-0000-000000000004"), null, "zh-TW", "日常彈性襪", null, null, null, new Guid("71111111-0000-0000-0000-000000000004") },
                    { new Guid("81111111-0000-0002-0000-000000000005"), null, "zh-TW", "旅行彈性襪", null, null, null, new Guid("71111111-0000-0000-0000-000000000005") },
                    { new Guid("81111111-0000-0002-0000-000000000006"), null, "zh-TW", "糖尿病襪", null, null, null, new Guid("71111111-0000-0000-0000-000000000006") },
                    { new Guid("81111111-0000-0002-0000-000000000007"), null, "zh-TW", "膝部護具", null, null, null, new Guid("71111111-0000-0000-0000-000000000007") },
                    { new Guid("81111111-0000-0002-0000-000000000008"), null, "zh-TW", "背部護具", null, null, null, new Guid("71111111-0000-0000-0000-000000000008") },
                    { new Guid("81111111-0000-0002-0000-000000000009"), null, "zh-TW", "踝部護具", null, null, null, new Guid("71111111-0000-0000-0000-000000000009") },
                    { new Guid("81111111-0000-0002-0000-000000000010"), null, "zh-TW", "腕部護具", null, null, null, new Guid("71111111-0000-0000-0000-000000000010") },
                    { new Guid("81111111-0000-0002-0000-000000000011"), null, "zh-TW", "肘部護具", null, null, null, new Guid("71111111-0000-0000-0000-000000000011") },
                    { new Guid("81111111-0000-0002-0000-000000000012"), null, "zh-TW", "肩部護具", null, null, null, new Guid("71111111-0000-0000-0000-000000000012") },
                    { new Guid("81111111-0000-0002-0000-000000000013"), null, "zh-TW", "頸部護具", null, null, null, new Guid("71111111-0000-0000-0000-000000000013") },
                    { new Guid("81111111-0000-0002-0000-000000000014"), null, "zh-TW", "矽膠系列", null, null, null, new Guid("71111111-0000-0000-0000-000000000014") },
                    { new Guid("81111111-0000-0002-0000-000000000015"), null, "zh-TW", "凝膠系列", null, null, null, new Guid("71111111-0000-0000-0000-000000000015") },
                    { new Guid("81111111-0000-0002-0000-000000000016"), null, "zh-TW", "保濕系列", null, null, null, new Guid("71111111-0000-0000-0000-000000000016") },
                    { new Guid("81111111-0000-0002-0000-000000000017"), null, "zh-TW", "高跟鞋墊", null, null, null, new Guid("71111111-0000-0000-0000-000000000017") }
                });

            migrationBuilder.CreateIndex(
                name: "UX_BodyPart_Slug",
                table: "BodyParts",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_HeroImageMediaId",
                table: "Categories",
                column: "HeroImageMediaId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_ImageMediaId",
                table: "Categories",
                column: "ImageMediaId");

            migrationBuilder.CreateIndex(
                name: "UX_Category_Slug",
                table: "Categories",
                column: "Slug",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "UX_CategoryTr",
                table: "CategoryTranslations",
                columns: new[] { "CategoryId", "Locale" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Certifications_LogoMediaId",
                table: "Certifications",
                column: "LogoMediaId");

            migrationBuilder.CreateIndex(
                name: "UX_Certification_Slug",
                table: "Certifications",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_CertificationTr",
                table: "CertificationTranslations",
                columns: new[] { "CertificationId", "Locale" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Media_Preset",
                table: "Media",
                columns: new[] { "PresetKey", "CreatedAt" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_ProductBodyParts_BodyPartId",
                table: "ProductBodyParts",
                column: "BodyPartId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCertifications_CertificationId",
                table: "ProductCertifications",
                column: "CertificationId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductImages_MediaId",
                table: "ProductImages",
                column: "MediaId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductImages_ProductId",
                table: "ProductImages",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductRelated_RelatedProductId",
                table: "ProductRelated",
                column: "RelatedProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Product_Category",
                table: "Products",
                columns: new[] { "CategoryId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Product_Collection",
                table: "Products",
                columns: new[] { "CollectionId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Product_Featured",
                table: "Products",
                columns: new[] { "IsFeatured", "FeaturedSortOrder" },
                filter: "[Status] = 1 AND [IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Product_Sku",
                table: "Products",
                column: "Sku",
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Product_SubCategory",
                table: "Products",
                columns: new[] { "SubCategoryId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Products_UseCaseImageMediaId",
                table: "Products",
                column: "UseCaseImageMediaId");

            migrationBuilder.CreateIndex(
                name: "UX_Product_Slug",
                table: "Products",
                column: "Slug",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_ProductTags_TagId",
                table: "ProductTags",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductTr_Locale",
                table: "ProductTranslations",
                column: "Locale");

            migrationBuilder.CreateIndex(
                name: "IX_ProductTranslations_OgImageMediaId",
                table: "ProductTranslations",
                column: "OgImageMediaId");

            migrationBuilder.CreateIndex(
                name: "UX_ProductTr",
                table: "ProductTranslations",
                columns: new[] { "ProductId", "Locale" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SubCategories_HeroImageMediaId",
                table: "SubCategories",
                column: "HeroImageMediaId");

            migrationBuilder.CreateIndex(
                name: "IX_SubCategories_ImageMediaId",
                table: "SubCategories",
                column: "ImageMediaId");

            migrationBuilder.CreateIndex(
                name: "IX_SubCategory_Category",
                table: "SubCategories",
                columns: new[] { "CategoryId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "UX_SubCategory_Slug",
                table: "SubCategories",
                column: "Slug",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "UX_SubCategoryTr",
                table: "SubCategoryTranslations",
                columns: new[] { "SubCategoryId", "Locale" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Tag_Slug",
                table: "Tags",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CategoryTranslations");

            migrationBuilder.DropTable(
                name: "CertificationTranslations");

            migrationBuilder.DropTable(
                name: "ProductBodyParts");

            migrationBuilder.DropTable(
                name: "ProductCertifications");

            migrationBuilder.DropTable(
                name: "ProductImages");

            migrationBuilder.DropTable(
                name: "ProductRelated");

            migrationBuilder.DropTable(
                name: "ProductTags");

            migrationBuilder.DropTable(
                name: "ProductTranslations");

            migrationBuilder.DropTable(
                name: "SubCategoryTranslations");

            migrationBuilder.DropTable(
                name: "BodyParts");

            migrationBuilder.DropTable(
                name: "Certifications");

            migrationBuilder.DropTable(
                name: "Tags");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropTable(
                name: "SubCategories");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "Media");
        }
    }
}
