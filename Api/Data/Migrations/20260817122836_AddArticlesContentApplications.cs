using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace EuniceMed.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddArticlesContentApplications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Applications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Type = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)1),
                    BodyPartId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ImageMediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CardImageMediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FittingImageMediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ShowOnBodyMap = table.Column<bool>(type: "bit", nullable: false),
                    MapPositionJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)0),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVer = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Applications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Applications_BodyParts_BodyPartId",
                        column: x => x.BodyPartId,
                        principalTable: "BodyParts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Applications_Media_CardImageMediaId",
                        column: x => x.CardImageMediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Applications_Media_FittingImageMediaId",
                        column: x => x.FittingImageMediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Applications_Media_ImageMediaId",
                        column: x => x.ImageMediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ArticleCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kind = table.Column<byte>(type: "tinyint", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)1),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArticleCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Downloads",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<byte>(type: "tinyint", nullable: false),
                    FileLocale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    Status = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)1),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Downloads", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Downloads_Media_MediaId",
                        column: x => x.MediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FaqCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FaqCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SalesLocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LocationType = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)1),
                    CountryCode = table.Column<string>(type: "varchar(2)", unicode: false, maxLength: 2, nullable: false),
                    WebsiteUrl = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Status = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)1),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesLocations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ApplicationTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ApplicationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Lead = table.Column<string>(type: "nvarchar(800)", maxLength: 800, nullable: true),
                    Body = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MapCopy = table.Column<string>(type: "nvarchar(600)", maxLength: 600, nullable: true),
                    MapCtaLabel = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    StatsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcernsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SupportLevelsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HowToJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Disclaimer = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SeoTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SeoDescription = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApplicationTranslations_Applications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "Applications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductApplications",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ApplicationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductApplications", x => new { x.ProductId, x.ApplicationId });
                    table.ForeignKey(
                        name: "FK_ProductApplications_Applications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "Applications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductApplications_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ArticleCategoryTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ArticleCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PromoJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArticleCategoryTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ArticleCategoryTranslations_ArticleCategories_ArticleCategoryId",
                        column: x => x.ArticleCategoryId,
                        principalTable: "ArticleCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Articles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                    Type = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)1),
                    CategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CoverMediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReadMinutes = table.Column<short>(type: "smallint", nullable: true),
                    IsFeatured = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)0),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVer = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Articles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Articles_ArticleCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "ArticleCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Articles_Media_CoverMediaId",
                        column: x => x.CoverMediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DownloadTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DownloadId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DownloadTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DownloadTranslations_Downloads_DownloadId",
                        column: x => x.DownloadId,
                        principalTable: "Downloads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductDownloads",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DownloadId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductDownloads", x => new { x.ProductId, x.DownloadId });
                    table.ForeignKey(
                        name: "FK_ProductDownloads_Downloads_DownloadId",
                        column: x => x.DownloadId,
                        principalTable: "Downloads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductDownloads_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FaqCategoryTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FaqCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FaqCategoryTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FaqCategoryTranslations_FaqCategories_FaqCategoryId",
                        column: x => x.FaqCategoryId,
                        principalTable: "FaqCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Faqs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FaqCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)1),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Faqs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Faqs_FaqCategories_FaqCategoryId",
                        column: x => x.FaqCategoryId,
                        principalTable: "FaqCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SalesLocationTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SalesLocationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    RegionLabel = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Note = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesLocationTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalesLocationTranslations_SalesLocations_SalesLocationId",
                        column: x => x.SalesLocationId,
                        principalTable: "SalesLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ArticleImages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ArticleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArticleImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ArticleImages_Articles_ArticleId",
                        column: x => x.ArticleId,
                        principalTable: "Articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ArticleImages_Media_MediaId",
                        column: x => x.MediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ArticleTags",
                columns: table => new
                {
                    ArticleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TagId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArticleTags", x => new { x.ArticleId, x.TagId });
                    table.ForeignKey(
                        name: "FK_ArticleTags_Articles_ArticleId",
                        column: x => x.ArticleId,
                        principalTable: "Articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ArticleTags_Tags_TagId",
                        column: x => x.TagId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ArticleTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ArticleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Standfirst = table.Column<string>(type: "nvarchar(600)", maxLength: 600, nullable: true),
                    Body = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Excerpt = table.Column<string>(type: "nvarchar(600)", maxLength: 600, nullable: true),
                    AuthorName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Disclaimer = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SeoTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SeoDescription = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArticleTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ArticleTranslations_Articles_ArticleId",
                        column: x => x.ArticleId,
                        principalTable: "Articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NewsEvents",
                columns: table => new
                {
                    ArticleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ContactEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: true),
                    CtaUrl = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsEvents", x => x.ArticleId);
                    table.ForeignKey(
                        name: "FK_NewsEvents_Articles_ArticleId",
                        column: x => x.ArticleId,
                        principalTable: "Articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FaqTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FaqId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    Question = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Answer = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FaqTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FaqTranslations_Faqs_FaqId",
                        column: x => x.FaqId,
                        principalTable: "Faqs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NewsEventTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ArticleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    DatesLabel = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    Venue = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Booth = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    CtaLabel = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsEventTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NewsEventTranslations_NewsEvents_ArticleId",
                        column: x => x.ArticleId,
                        principalTable: "NewsEvents",
                        principalColumn: "ArticleId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Applications",
                columns: new[] { "Id", "BodyPartId", "CardImageMediaId", "CreatedAt", "FittingImageMediaId", "ImageMediaId", "IsDeleted", "MapPositionJson", "ShowOnBodyMap", "Slug", "SortOrder", "Status", "Type", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("e1111111-0000-0000-0000-000000000001"), new Guid("61111111-0000-0000-0000-000000000005"), null, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "{\"hotspot\":{\"cx\":130,\"cy\":195},\"chip\":{\"cx\":130,\"cy\":204}}", true, "back", 1, (byte)1, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("e1111111-0000-0000-0000-000000000002"), new Guid("61111111-0000-0000-0000-000000000001"), null, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "{\"hotspot\":{\"cx\":152,\"cy\":395},\"chip\":{\"cx\":154,\"cy\":334}}", true, "knee", 2, (byte)1, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("e1111111-0000-0000-0000-000000000003"), new Guid("61111111-0000-0000-0000-000000000002"), null, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "{\"hotspot\":{\"cx\":108,\"cy\":505},\"chip\":{\"cx\":107,\"cy\":470}}", true, "ankle", 3, (byte)1, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("e1111111-0000-0000-0000-000000000004"), new Guid("61111111-0000-0000-0000-000000000006"), null, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, "{\"hotspot\":{\"cx\":165,\"cy\":538},\"chip\":{\"cx\":168,\"cy\":504}}", true, "foot", 4, (byte)1, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("e1111111-0000-0000-0000-000000000005"), null, null, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, null, false, "elderly-care", 5, (byte)1, (byte)2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("e1111111-0000-0000-0000-000000000006"), null, null, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, null, false, "bunion-relief", 6, (byte)1, (byte)2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("e1111111-0000-0000-0000-000000000007"), null, null, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, false, null, false, "post-operative-recovery", 7, (byte)1, (byte)2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "ArticleCategories",
                columns: new[] { "Id", "CreatedAt", "Kind", "Slug", "SortOrder", "Status", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("c1111111-0000-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), (byte)1, "exhibitions", 1, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("c1111111-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), (byte)1, "sponsorship", 2, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("c1111111-0000-0000-0000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), (byte)1, "company", 3, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("c1111111-0000-0000-0000-000000000004"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), (byte)2, "medical", 1, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("c1111111-0000-0000-0000-000000000005"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), (byte)2, "esg", 2, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("c1111111-0000-0000-0000-000000000006"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), (byte)2, "sponsorship", 3, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "FaqCategories",
                columns: new[] { "Id", "Slug", "SortOrder", "Status" },
                values: new object[,]
                {
                    { new Guid("d1111111-0000-0000-0000-000000000001"), "use", 1, (byte)1 },
                    { new Guid("d1111111-0000-0000-0000-000000000002"), "sizing", 2, (byte)1 },
                    { new Guid("d1111111-0000-0000-0000-000000000003"), "order", 3, (byte)1 }
                });

            migrationBuilder.InsertData(
                table: "ApplicationTranslations",
                columns: new[] { "Id", "ApplicationId", "Body", "ConcernsJson", "Disclaimer", "HowToJson", "Lead", "Locale", "MapCopy", "MapCtaLabel", "Name", "SeoDescription", "SeoTitle", "StatsJson", "SupportLevelsJson" },
                values: new object[,]
                {
                    { new Guid("e2222222-0000-0001-0000-000000000001"), new Guid("e1111111-0000-0000-0000-000000000001"), null, null, null, null, null, "en", null, null, "Back & Waist", null, null, null, null },
                    { new Guid("e2222222-0000-0001-0000-000000000002"), new Guid("e1111111-0000-0000-0000-000000000002"), null, null, null, null, null, "en", null, null, "Knee", null, null, null, null },
                    { new Guid("e2222222-0000-0001-0000-000000000003"), new Guid("e1111111-0000-0000-0000-000000000003"), null, null, null, null, null, "en", null, null, "Ankle", null, null, null, null },
                    { new Guid("e2222222-0000-0001-0000-000000000004"), new Guid("e1111111-0000-0000-0000-000000000004"), null, null, null, null, null, "en", null, null, "Foot", null, null, null, null },
                    { new Guid("e2222222-0000-0001-0000-000000000005"), new Guid("e1111111-0000-0000-0000-000000000005"), null, null, null, null, null, "en", null, null, "Elderly care", null, null, null, null },
                    { new Guid("e2222222-0000-0001-0000-000000000006"), new Guid("e1111111-0000-0000-0000-000000000006"), null, null, null, null, null, "en", null, null, "Bunion relief", null, null, null, null },
                    { new Guid("e2222222-0000-0001-0000-000000000007"), new Guid("e1111111-0000-0000-0000-000000000007"), null, null, null, null, null, "en", null, null, "Post-operative recovery", null, null, null, null },
                    { new Guid("e2222222-0000-0002-0000-000000000001"), new Guid("e1111111-0000-0000-0000-000000000001"), null, null, null, null, null, "zh-TW", null, null, "背部與腰部", null, null, null, null },
                    { new Guid("e2222222-0000-0002-0000-000000000002"), new Guid("e1111111-0000-0000-0000-000000000002"), null, null, null, null, null, "zh-TW", null, null, "膝部", null, null, null, null },
                    { new Guid("e2222222-0000-0002-0000-000000000003"), new Guid("e1111111-0000-0000-0000-000000000003"), null, null, null, null, null, "zh-TW", null, null, "踝部", null, null, null, null },
                    { new Guid("e2222222-0000-0002-0000-000000000004"), new Guid("e1111111-0000-0000-0000-000000000004"), null, null, null, null, null, "zh-TW", null, null, "足部", null, null, null, null },
                    { new Guid("e2222222-0000-0002-0000-000000000005"), new Guid("e1111111-0000-0000-0000-000000000005"), null, null, null, null, null, "zh-TW", null, null, "銀髮照護", null, null, null, null },
                    { new Guid("e2222222-0000-0002-0000-000000000006"), new Guid("e1111111-0000-0000-0000-000000000006"), null, null, null, null, null, "zh-TW", null, null, "拇趾外翻", null, null, null, null },
                    { new Guid("e2222222-0000-0002-0000-000000000007"), new Guid("e1111111-0000-0000-0000-000000000007"), null, null, null, null, null, "zh-TW", null, null, "術後復健", null, null, null, null }
                });

            migrationBuilder.InsertData(
                table: "ArticleCategoryTranslations",
                columns: new[] { "Id", "ArticleCategoryId", "Locale", "Name", "PromoJson" },
                values: new object[,]
                {
                    { new Guid("c2222222-0000-0001-0000-000000000001"), new Guid("c1111111-0000-0000-0000-000000000001"), "en", "Exhibitions", null },
                    { new Guid("c2222222-0000-0001-0000-000000000002"), new Guid("c1111111-0000-0000-0000-000000000002"), "en", "Sponsorship", null },
                    { new Guid("c2222222-0000-0001-0000-000000000003"), new Guid("c1111111-0000-0000-0000-000000000003"), "en", "Company", null },
                    { new Guid("c2222222-0000-0001-0000-000000000004"), new Guid("c1111111-0000-0000-0000-000000000004"), "en", "Medical", null },
                    { new Guid("c2222222-0000-0001-0000-000000000005"), new Guid("c1111111-0000-0000-0000-000000000005"), "en", "ESG", null },
                    { new Guid("c2222222-0000-0001-0000-000000000006"), new Guid("c1111111-0000-0000-0000-000000000006"), "en", "Sponsorship", null },
                    { new Guid("c2222222-0000-0002-0000-000000000001"), new Guid("c1111111-0000-0000-0000-000000000001"), "zh-TW", "展覽活動", null },
                    { new Guid("c2222222-0000-0002-0000-000000000002"), new Guid("c1111111-0000-0000-0000-000000000002"), "zh-TW", "贊助合作", null },
                    { new Guid("c2222222-0000-0002-0000-000000000003"), new Guid("c1111111-0000-0000-0000-000000000003"), "zh-TW", "公司動態", null },
                    { new Guid("c2222222-0000-0002-0000-000000000004"), new Guid("c1111111-0000-0000-0000-000000000004"), "zh-TW", "醫療專欄", null },
                    { new Guid("c2222222-0000-0002-0000-000000000005"), new Guid("c1111111-0000-0000-0000-000000000005"), "zh-TW", "永續發展", null },
                    { new Guid("c2222222-0000-0002-0000-000000000006"), new Guid("c1111111-0000-0000-0000-000000000006"), "zh-TW", "贊助合作", null }
                });

            migrationBuilder.InsertData(
                table: "FaqCategoryTranslations",
                columns: new[] { "Id", "FaqCategoryId", "Locale", "Name" },
                values: new object[,]
                {
                    { new Guid("d2222222-0000-0001-0000-000000000001"), new Guid("d1111111-0000-0000-0000-000000000001"), "en", "Product use" },
                    { new Guid("d2222222-0000-0001-0000-000000000002"), new Guid("d1111111-0000-0000-0000-000000000002"), "en", "Sizing" },
                    { new Guid("d2222222-0000-0001-0000-000000000003"), new Guid("d1111111-0000-0000-0000-000000000003"), "en", "Ordering & partnership" },
                    { new Guid("d2222222-0000-0002-0000-000000000001"), new Guid("d1111111-0000-0000-0000-000000000001"), "zh-TW", "產品使用" },
                    { new Guid("d2222222-0000-0002-0000-000000000002"), new Guid("d1111111-0000-0000-0000-000000000002"), "zh-TW", "尺寸選擇" },
                    { new Guid("d2222222-0000-0002-0000-000000000003"), new Guid("d1111111-0000-0000-0000-000000000003"), "zh-TW", "訂購與合作" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Application_BodyMap",
                table: "Applications",
                columns: new[] { "ShowOnBodyMap", "SortOrder" },
                filter: "[Status] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_BodyPartId",
                table: "Applications",
                column: "BodyPartId");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_CardImageMediaId",
                table: "Applications",
                column: "CardImageMediaId");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_FittingImageMediaId",
                table: "Applications",
                column: "FittingImageMediaId");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_ImageMediaId",
                table: "Applications",
                column: "ImageMediaId");

            migrationBuilder.CreateIndex(
                name: "UX_Application_Slug",
                table: "Applications",
                column: "Slug",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "UX_ApplicationTr",
                table: "ApplicationTranslations",
                columns: new[] { "ApplicationId", "Locale" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_ArticleCategory",
                table: "ArticleCategories",
                columns: new[] { "Kind", "Slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_ArticleCategoryTr",
                table: "ArticleCategoryTranslations",
                columns: new[] { "ArticleCategoryId", "Locale" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ArticleImages_ArticleId",
                table: "ArticleImages",
                column: "ArticleId");

            migrationBuilder.CreateIndex(
                name: "IX_ArticleImages_MediaId",
                table: "ArticleImages",
                column: "MediaId");

            migrationBuilder.CreateIndex(
                name: "IX_Article_Category",
                table: "Articles",
                columns: new[] { "CategoryId", "Status", "PublishedAt" },
                descending: new[] { false, false, true });

            migrationBuilder.CreateIndex(
                name: "IX_Article_Published",
                table: "Articles",
                columns: new[] { "Type", "Status", "PublishedAt" },
                descending: new[] { false, false, true });

            migrationBuilder.CreateIndex(
                name: "IX_Articles_CoverMediaId",
                table: "Articles",
                column: "CoverMediaId");

            migrationBuilder.CreateIndex(
                name: "UX_Article_Slug",
                table: "Articles",
                column: "Slug",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_ArticleTags_TagId",
                table: "ArticleTags",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "UX_ArticleTr",
                table: "ArticleTranslations",
                columns: new[] { "ArticleId", "Locale" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Downloads_MediaId",
                table: "Downloads",
                column: "MediaId");

            migrationBuilder.CreateIndex(
                name: "UX_DownloadTr",
                table: "DownloadTranslations",
                columns: new[] { "DownloadId", "Locale" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_FaqCategory_Slug",
                table: "FaqCategories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_FaqCategoryTr",
                table: "FaqCategoryTranslations",
                columns: new[] { "FaqCategoryId", "Locale" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Faq_Category",
                table: "Faqs",
                columns: new[] { "FaqCategoryId", "Status", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "UX_FaqTr",
                table: "FaqTranslations",
                columns: new[] { "FaqId", "Locale" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_NewsEventTr",
                table: "NewsEventTranslations",
                columns: new[] { "ArticleId", "Locale" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductApplications_ApplicationId",
                table: "ProductApplications",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductDownloads_DownloadId",
                table: "ProductDownloads",
                column: "DownloadId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesLocation_Type",
                table: "SalesLocations",
                columns: new[] { "LocationType", "Status", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "UX_SalesLocationTr",
                table: "SalesLocationTranslations",
                columns: new[] { "SalesLocationId", "Locale" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicationTranslations");

            migrationBuilder.DropTable(
                name: "ArticleCategoryTranslations");

            migrationBuilder.DropTable(
                name: "ArticleImages");

            migrationBuilder.DropTable(
                name: "ArticleTags");

            migrationBuilder.DropTable(
                name: "ArticleTranslations");

            migrationBuilder.DropTable(
                name: "DownloadTranslations");

            migrationBuilder.DropTable(
                name: "FaqCategoryTranslations");

            migrationBuilder.DropTable(
                name: "FaqTranslations");

            migrationBuilder.DropTable(
                name: "NewsEventTranslations");

            migrationBuilder.DropTable(
                name: "ProductApplications");

            migrationBuilder.DropTable(
                name: "ProductDownloads");

            migrationBuilder.DropTable(
                name: "SalesLocationTranslations");

            migrationBuilder.DropTable(
                name: "Faqs");

            migrationBuilder.DropTable(
                name: "NewsEvents");

            migrationBuilder.DropTable(
                name: "Applications");

            migrationBuilder.DropTable(
                name: "Downloads");

            migrationBuilder.DropTable(
                name: "SalesLocations");

            migrationBuilder.DropTable(
                name: "FaqCategories");

            migrationBuilder.DropTable(
                name: "Articles");

            migrationBuilder.DropTable(
                name: "ArticleCategories");
        }
    }
}
