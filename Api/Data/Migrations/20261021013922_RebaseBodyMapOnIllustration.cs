using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EuniceMed.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class RebaseBodyMapOnIllustration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Applications",
                keyColumn: "Id",
                keyValue: new Guid("e1111111-0000-0000-0000-000000000001"),
                column: "MapPositionJson",
                value: "{\"hotspot\":{\"cx\":131,\"cy\":209},\"chip\":{\"cx\":131,\"cy\":248}}");

            migrationBuilder.UpdateData(
                table: "Applications",
                keyColumn: "Id",
                keyValue: new Guid("e1111111-0000-0000-0000-000000000002"),
                column: "MapPositionJson",
                value: "{\"hotspot\":{\"cx\":158,\"cy\":396},\"chip\":{\"cx\":159,\"cy\":340}}");

            migrationBuilder.UpdateData(
                table: "Applications",
                keyColumn: "Id",
                keyValue: new Guid("e1111111-0000-0000-0000-000000000003"),
                column: "MapPositionJson",
                value: "{\"hotspot\":{\"cx\":100,\"cy\":492},\"chip\":{\"cx\":100,\"cy\":456}}");

            migrationBuilder.UpdateData(
                table: "Applications",
                keyColumn: "Id",
                keyValue: new Guid("e1111111-0000-0000-0000-000000000004"),
                column: "MapPositionJson",
                value: "{\"hotspot\":{\"cx\":165,\"cy\":521},\"chip\":{\"cx\":170,\"cy\":488}}");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Applications",
                keyColumn: "Id",
                keyValue: new Guid("e1111111-0000-0000-0000-000000000001"),
                column: "MapPositionJson",
                value: "{\"hotspot\":{\"cx\":130,\"cy\":195},\"chip\":{\"cx\":130,\"cy\":204}}");

            migrationBuilder.UpdateData(
                table: "Applications",
                keyColumn: "Id",
                keyValue: new Guid("e1111111-0000-0000-0000-000000000002"),
                column: "MapPositionJson",
                value: "{\"hotspot\":{\"cx\":152,\"cy\":395},\"chip\":{\"cx\":154,\"cy\":334}}");

            migrationBuilder.UpdateData(
                table: "Applications",
                keyColumn: "Id",
                keyValue: new Guid("e1111111-0000-0000-0000-000000000003"),
                column: "MapPositionJson",
                value: "{\"hotspot\":{\"cx\":108,\"cy\":505},\"chip\":{\"cx\":107,\"cy\":470}}");

            migrationBuilder.UpdateData(
                table: "Applications",
                keyColumn: "Id",
                keyValue: new Guid("e1111111-0000-0000-0000-000000000004"),
                column: "MapPositionJson",
                value: "{\"hotspot\":{\"cx\":165,\"cy\":538},\"chip\":{\"cx\":168,\"cy\":504}}");
        }
    }
}
