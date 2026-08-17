using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace EuniceMed.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCollections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Collections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Strength = table.Column<byte>(type: "tinyint", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Collections", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CollectionTranslations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CollectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CollectionTranslations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CollectionTranslations_Collections_CollectionId",
                        column: x => x.CollectionId,
                        principalTable: "Collections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Collections",
                columns: new[] { "Id", "CreatedAt", "Slug", "SortOrder", "Strength", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("11111111-0000-0000-0000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "care", 1, (byte)1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("11111111-0000-0000-0000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "protect", 2, (byte)2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("11111111-0000-0000-0000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "advance", 3, (byte)3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "CollectionTranslations",
                columns: new[] { "Id", "CollectionId", "Description", "Locale", "Name" },
                values: new object[,]
                {
                    { new Guid("21111111-0000-0000-0000-000000000001"), new Guid("11111111-0000-0000-0000-000000000001"), "Everyday light relief for comfort through ordinary days.", "en", "Care" },
                    { new Guid("21111111-0000-0000-0000-000000000002"), new Guid("11111111-0000-0000-0000-000000000001"), "日常輕度緩解，為平常的每一天提供舒適支撐。", "zh-TW", "日常照護" },
                    { new Guid("21111111-0000-0000-0000-000000000003"), new Guid("11111111-0000-0000-0000-000000000002"), "Strong support for high-load activity and demanding movement.", "en", "Protect" },
                    { new Guid("21111111-0000-0000-0000-000000000004"), new Guid("11111111-0000-0000-0000-000000000002"), "高強度活動的強力支撐，因應大負荷的動作需求。", "zh-TW", "強力防護" },
                    { new Guid("21111111-0000-0000-0000-000000000005"), new Guid("11111111-0000-0000-0000-000000000003"), "Rehabilitation-oriented, targeted protection for recovery.", "en", "Advance" },
                    { new Guid("21111111-0000-0000-0000-000000000006"), new Guid("11111111-0000-0000-0000-000000000003"), "復健導向的針對性保護，協助恢復過程。", "zh-TW", "進階復健" }
                });

            migrationBuilder.CreateIndex(
                name: "UX_Collection_Slug",
                table: "Collections",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_CollectionTr",
                table: "CollectionTranslations",
                columns: new[] { "CollectionId", "Locale" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CollectionTranslations");

            migrationBuilder.DropTable(
                name: "Collections");
        }
    }
}
