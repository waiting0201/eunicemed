using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EuniceMed.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class DropAuditLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Action = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    DataJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Entity = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Audit_Entity",
                table: "AuditLogs",
                columns: new[] { "Entity", "EntityId", "CreatedAt" },
                descending: new[] { false, false, true });
        }
    }
}
