using EuniceMed.Api.Common;
using EuniceMed.Api.Data.Configurations;
using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace EuniceMed.Api.Data.Seed;

/// <summary>
/// 建立預設管理者帳號。docs/05-database.md §4：密碼由環境變數注入、強制首次登入變更密碼。
///
/// <para>
/// 不用 <c>HasData</c> 的原因：密碼雜湊必須來自環境變數，而 <c>HasData</c> 是編譯期常數，
/// 把雜湊寫死在原始碼等於把正式站密碼進版控。
/// </para>
///
/// <para>
/// **只在 User 表為空時才動作**，因此重跑無害，也不會覆蓋既有帳號。
/// </para>
/// </summary>
public static class AdminUserSeeder
{
    public static async Task RunAsync(AppDbContext db, IConfiguration cfg, CancellationToken ct = default)
    {
        if (await db.Users.AnyAsync(ct)) return;

        var email    = cfg["Seed:AdminEmail"];
        var password = cfg["Seed:AdminPassword"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            Console.Error.WriteLine(
                "[AdminUserSeeder] User 表為空，但未設定 Seed__AdminEmail / Seed__AdminPassword，跳過建立預設管理者。");
            return;
        }

        var minLength = PasswordPolicy.MinLength(cfg);
        if (password.Length < minLength)
        {
            Console.Error.WriteLine(
                $"[AdminUserSeeder] Seed__AdminPassword 少於 {minLength} 字元，拒絕建立帳號。");
            return;
        }

        var now  = DateTime.UtcNow;
        var user = new User
        {
            Email              = email.Trim(),
            DisplayName        = cfg["Seed:AdminDisplayName"] ?? "Administrator",
            PasswordHash       = BCrypt.Net.BCrypt.HashPassword(password),
            IsActive           = true,
            MustChangePassword = true,
            CreatedAt          = now,
        };
        user.UserRoles.Add(new UserRole { RoleId = RoleIds.Admin });

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        Console.WriteLine($"[AdminUserSeeder] 已建立預設管理者 {user.Email}（首次登入須變更密碼）。");
    }
}
