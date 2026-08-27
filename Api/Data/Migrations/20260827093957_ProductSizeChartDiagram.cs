using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EuniceMed.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ProductSizeChartDiagram : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SizeChartDiagramMediaId",
                table: "Products",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_SizeChartDiagramMediaId",
                table: "Products",
                column: "SizeChartDiagramMediaId");

            migrationBuilder.AddForeignKey(
                name: "FK_Products_Media_SizeChartDiagramMediaId",
                table: "Products",
                column: "SizeChartDiagramMediaId",
                principalTable: "Media",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Products_Media_SizeChartDiagramMediaId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_SizeChartDiagramMediaId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "SizeChartDiagramMediaId",
                table: "Products");
        }
    }
}
