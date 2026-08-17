using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EuniceMed.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class MediaPipeline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MediaUsages",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Entity = table.Column<string>(type: "varchar(40)", unicode: false, maxLength: 40, nullable: false),
                    EntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Locale = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: true),
                    FieldPath = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaUsages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MediaUsages_Media_MediaId",
                        column: x => x.MediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MediaVariants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Format = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    Width = table.Column<int>(type: "int", nullable: false),
                    Height = table.Column<int>(type: "int", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    BlobUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MediaVariants_Media_MediaId",
                        column: x => x.MediaId,
                        principalTable: "Media",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MediaUsage_Entity",
                table: "MediaUsages",
                columns: new[] { "Entity", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "UX_MediaUsage",
                table: "MediaUsages",
                columns: new[] { "MediaId", "Entity", "EntityId", "FieldPath" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_MediaVariant",
                table: "MediaVariants",
                columns: new[] { "MediaId", "Format", "Width" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MediaUsages");

            migrationBuilder.DropTable(
                name: "MediaVariants");
        }
    }
}
