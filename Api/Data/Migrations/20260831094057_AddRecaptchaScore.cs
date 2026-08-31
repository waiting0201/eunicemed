using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EuniceMed.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRecaptchaScore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "RecaptchaScore",
                table: "ContactSubmissions",
                type: "float",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RecaptchaScore",
                table: "ContactSubmissions");
        }
    }
}
