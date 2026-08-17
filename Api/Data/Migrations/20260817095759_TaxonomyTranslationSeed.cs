using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace EuniceMed.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class TaxonomyTranslationSeed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "CategoryTranslations",
                columns: new[] { "Id", "CategoryId", "Description", "Locale", "Name", "SeoDescription", "SeoTitle", "StatsJson", "SupportLevelsJson" },
                values: new object[,]
                {
                    { new Guid("91111111-0000-0001-0000-000000000001"), new Guid("41111111-0000-0000-0000-000000000001"), "Improve circulation, ease symptoms and slow the progression of varicose veins.", "en", "Medical Compression Stockings", null, null, null, null },
                    { new Guid("91111111-0000-0001-0000-000000000002"), new Guid("41111111-0000-0000-0000-000000000002"), "Stability, alignment and protection for knee, ankle, elbow, wrist and back.", "en", "Orthopedic Support", null, null, null, null },
                    { new Guid("91111111-0000-0001-0000-000000000003"), new Guid("41111111-0000-0000-0000-000000000003"), "Medical-grade silicone for heel pain, plantar fasciitis and bone spurs.", "en", "Footcare & Insoles", null, null, null, null },
                    { new Guid("91111111-0000-0002-0000-000000000001"), new Guid("41111111-0000-0000-0000-000000000001"), "改善循環、緩解並延緩靜脈曲張。", "zh-TW", "醫療彈性襪", null, null, null, null },
                    { new Guid("91111111-0000-0002-0000-000000000002"), new Guid("41111111-0000-0000-0000-000000000002"), "膝、踝、肘、腕、背的穩定、對位與保護。", "zh-TW", "矯型護具", null, null, null, null },
                    { new Guid("91111111-0000-0002-0000-000000000003"), new Guid("41111111-0000-0000-0000-000000000003"), "醫療級矽膠，處理足跟痛、足底筋膜炎、骨刺等。", "zh-TW", "足部護理與鞋墊", null, null, null, null }
                });

            migrationBuilder.InsertData(
                table: "CertificationTranslations",
                columns: new[] { "Id", "CertificationId", "Description", "Locale", "SubLabel" },
                values: new object[,]
                {
                    { new Guid("a1111111-0000-0001-0000-000000000001"), new Guid("51111111-0000-0000-0000-000000000001"), "Medical device quality management system certification.", "en", "Quality management" },
                    { new Guid("a1111111-0000-0001-0000-000000000002"), new Guid("51111111-0000-0000-0000-000000000002"), "Conforms to EU health, safety and environmental requirements.", "en", "European conformity" },
                    { new Guid("a1111111-0000-0001-0000-000000000003"), new Guid("51111111-0000-0000-0000-000000000003"), "Textiles tested free from harmful substances.", "en", "Tested for harmful substances" },
                    { new Guid("a1111111-0000-0001-0000-000000000004"), new Guid("51111111-0000-0000-0000-000000000004"), "Protected by registered design patents.", "en", "Patented design" },
                    { new Guid("a1111111-0000-0001-0000-000000000005"), new Guid("51111111-0000-0000-0000-000000000005"), "Designed and manufactured in Taiwan.", "en", "Made in Taiwan" },
                    { new Guid("a1111111-0000-0002-0000-000000000001"), new Guid("51111111-0000-0000-0000-000000000001"), "醫療器材品質管理系統認證。", "zh-TW", "品質管理系統" },
                    { new Guid("a1111111-0000-0002-0000-000000000002"), new Guid("51111111-0000-0000-0000-000000000002"), "符合歐盟健康、安全與環境要求。", "zh-TW", "歐盟符合性" },
                    { new Guid("a1111111-0000-0002-0000-000000000003"), new Guid("51111111-0000-0000-0000-000000000003"), "紡織品經檢驗不含有害物質。", "zh-TW", "有害物質檢驗" },
                    { new Guid("a1111111-0000-0002-0000-000000000004"), new Guid("51111111-0000-0000-0000-000000000004"), "受註冊設計專利保護。", "zh-TW", "專利設計" },
                    { new Guid("a1111111-0000-0002-0000-000000000005"), new Guid("51111111-0000-0000-0000-000000000005"), "台灣設計與製造。", "zh-TW", "台灣製造" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "CategoryTranslations",
                keyColumn: "Id",
                keyValue: new Guid("91111111-0000-0001-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "CategoryTranslations",
                keyColumn: "Id",
                keyValue: new Guid("91111111-0000-0001-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "CategoryTranslations",
                keyColumn: "Id",
                keyValue: new Guid("91111111-0000-0001-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "CategoryTranslations",
                keyColumn: "Id",
                keyValue: new Guid("91111111-0000-0002-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "CategoryTranslations",
                keyColumn: "Id",
                keyValue: new Guid("91111111-0000-0002-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "CategoryTranslations",
                keyColumn: "Id",
                keyValue: new Guid("91111111-0000-0002-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "CertificationTranslations",
                keyColumn: "Id",
                keyValue: new Guid("a1111111-0000-0001-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "CertificationTranslations",
                keyColumn: "Id",
                keyValue: new Guid("a1111111-0000-0001-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "CertificationTranslations",
                keyColumn: "Id",
                keyValue: new Guid("a1111111-0000-0001-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "CertificationTranslations",
                keyColumn: "Id",
                keyValue: new Guid("a1111111-0000-0001-0000-000000000004"));

            migrationBuilder.DeleteData(
                table: "CertificationTranslations",
                keyColumn: "Id",
                keyValue: new Guid("a1111111-0000-0001-0000-000000000005"));

            migrationBuilder.DeleteData(
                table: "CertificationTranslations",
                keyColumn: "Id",
                keyValue: new Guid("a1111111-0000-0002-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "CertificationTranslations",
                keyColumn: "Id",
                keyValue: new Guid("a1111111-0000-0002-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "CertificationTranslations",
                keyColumn: "Id",
                keyValue: new Guid("a1111111-0000-0002-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "CertificationTranslations",
                keyColumn: "Id",
                keyValue: new Guid("a1111111-0000-0002-0000-000000000004"));

            migrationBuilder.DeleteData(
                table: "CertificationTranslations",
                keyColumn: "Id",
                keyValue: new Guid("a1111111-0000-0002-0000-000000000005"));
        }
    }
}
