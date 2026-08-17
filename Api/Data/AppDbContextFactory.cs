using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace EuniceMed.Api.Data;

/// <summary>
/// 供 EF Core 設計時期工具（dotnet ef migrations add）使用。
/// 優先讀取 local.settings.json，再嘗試環境變數，最後 fallback 至本機 SQL Server。
/// </summary>
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connStr = ReadFromLocalSettings()
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Server=localhost,1433;Database=EuniceMedDb;User Id=sa;Password=Strong@Password123;TrustServerCertificate=True;";

        var opt = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connStr)
            .Options;

        return new AppDbContext(opt);
    }

    private static string? ReadFromLocalSettings()
    {
        var path = Path.Combine(Directory.GetCurrentDirectory(), "local.settings.json");
        if (!File.Exists(path)) return null;

        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(path));
            if (doc.RootElement.TryGetProperty("ConnectionStrings", out var cs)
                && cs.TryGetProperty("DefaultConnection", out var conn))
            {
                return conn.GetString();
            }
        }
        catch { /* 讀取失敗則 fallback */ }

        return null;
    }
}
