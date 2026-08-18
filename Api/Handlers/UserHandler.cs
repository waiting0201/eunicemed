using EuniceMed.Api.Common;
using EuniceMed.Api.Data;
using EuniceMed.Api.Models.Dtos;
using EuniceMed.Api.Models.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

namespace EuniceMed.Api.Handlers;

/// <summary>後台使用者管理。**Admin 專屬**（權限由 AppRouter 把關，此處不重複檢查）。</summary>
public sealed class UserHandler(AppDbContext db, Microsoft.Extensions.Configuration.IConfiguration config)
{
    /// <summary>GET /admin/users</summary>
    public async Task<IActionResult> GetAllAsync()
    {
        var users = await db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .OrderBy(u => u.Email)
            .ToListAsync();

        return new OkObjectResult(ApiResponse.Ok(users.Select(ToDto).ToArray()));
    }

    /// <summary>GET /admin/users/{id}</summary>
    public async Task<IActionResult> GetByIdAsync(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return new BadRequestObjectResult(ApiResponse.Fail("Invalid user ID format."));

        var user = await db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == guid)
            ?? throw AppException.NotFound("User");

        return new OkObjectResult(ApiResponse.Ok(ToDto(user)));
    }

    /// <summary>POST /admin/users</summary>
    public async Task<IActionResult> CreateAsync(HttpRequest req)
    {
        var body = await req.ReadFromJsonAsync<CreateUserRequest>();
        if (body is null)
            return new BadRequestObjectResult(ApiResponse.Fail("Invalid request body."));

        if (string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrWhiteSpace(body.DisplayName))
            return new BadRequestObjectResult(ApiResponse.Fail("email 與 displayName 為必填。"));

        PasswordPolicy.Require(body.Password, config);

        var email = body.Email.Trim();
        if (await db.Users.AnyAsync(u => u.Email == email))
            throw AppException.Conflict($"Email '{email}' 已被使用。");

        var roles = await ResolveRolesAsync(body.Roles);

        var user = new User
        {
            Email              = email,
            DisplayName        = body.DisplayName.Trim(),
            PasswordHash       = BCrypt.Net.BCrypt.HashPassword(body.Password),
            IsActive           = true,
            MustChangePassword = true,   // 由管理者建立的帳號，首次登入必須改密碼
            CreatedAt          = Clock.Now,
        };
        foreach (var role in roles)
            user.UserRoles.Add(new UserRole { RoleId = role.Id });

        db.Users.Add(user);
        await db.SaveChangesAsync();

        // 重讀以帶出 Role 名稱
        await db.Entry(user).Collection(u => u.UserRoles).Query().Include(ur => ur.Role).LoadAsync();

        return new ObjectResult(ApiResponse.Ok(ToDto(user), "使用者已建立。")) { StatusCode = 201 };
    }

    /// <summary>PUT /admin/users/{id}</summary>
    public async Task<IActionResult> UpdateAsync(HttpRequest req, string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return new BadRequestObjectResult(ApiResponse.Fail("Invalid user ID format."));

        var body = await req.ReadFromJsonAsync<UpdateUserRequest>();
        if (body is null)
            return new BadRequestObjectResult(ApiResponse.Fail("Invalid request body."));

        var user = await db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == guid)
            ?? throw AppException.NotFound("User");

        if (body.DisplayName is not null) user.DisplayName = body.DisplayName.Trim();

        if (body.IsActive.HasValue)
        {
            // 不允許把自己停用，否則管理者會把自己鎖在門外
            if (!body.IsActive.Value && CurrentUserId(req) == guid)
                throw AppException.BadRequest("無法停用自己的帳號。");
            user.IsActive = body.IsActive.Value;
        }

        if (!string.IsNullOrWhiteSpace(body.Email))
        {
            var email = body.Email.Trim();

            // Email 是登入識別，全站唯一。撞號要擋下來，否則兩個帳號登入時會不確定是哪一個。
            if (email != user.Email && await db.Users.AnyAsync(u => u.Email == email))
                throw AppException.Conflict($"Email '{email}' 已被使用。");

            user.Email = email;
        }

        if (body.Unlock == true)
        {
            user.LockedUntil      = null;
            user.FailedLoginCount = 0;
        }

        if (!string.IsNullOrWhiteSpace(body.Password))
        {
            PasswordPolicy.Require(body.Password, config);

            user.PasswordHash       = BCrypt.Net.BCrypt.HashPassword(body.Password);
            user.MustChangePassword = true;

            await db.RefreshTokens
                .Where(t => t.UserId == guid && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow));
        }

        if (body.Roles is not null)
        {
            var target = await ResolveRolesAsync(body.Roles);

            // 不允許移除自己的 Admin 角色 —— 同樣是防止把自己鎖在門外
            if (CurrentUserId(req) == guid && !target.Any(r => r.Name == RoleNames.Admin))
                throw AppException.BadRequest("無法移除自己的 Admin 角色。");

            user.UserRoles.Clear();
            foreach (var role in target)
                user.UserRoles.Add(new UserRole { UserId = guid, RoleId = role.Id });
        }

        await db.SaveChangesAsync();
        await db.Entry(user).Collection(u => u.UserRoles).Query().Include(ur => ur.Role).LoadAsync();

        return new OkObjectResult(ApiResponse.Ok(ToDto(user), "使用者已更新。"));
    }

    /// <summary>DELETE /admin/users/{id}</summary>
    public async Task<IActionResult> DeleteAsync(HttpRequest req, string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return new BadRequestObjectResult(ApiResponse.Fail("Invalid user ID format."));

        if (CurrentUserId(req) == guid)
            throw AppException.BadRequest("無法刪除自己的帳號。");

        var user = await db.Users.FindAsync(guid) ?? throw AppException.NotFound("User");

        // 最後一個 Admin 不可刪
        var adminCount = await db.Users
            .CountAsync(u => u.IsActive && u.UserRoles.Any(ur => ur.Role!.Name == RoleNames.Admin));
        var isAdmin = await db.Users
            .AnyAsync(u => u.Id == guid && u.UserRoles.Any(ur => ur.Role!.Name == RoleNames.Admin));

        if (isAdmin && adminCount <= 1)
            throw AppException.BadRequest("系統至少需保留一個 Admin 帳號。");

        db.Users.Remove(user);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok($"使用者 '{id}' 已刪除。"));
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    private async Task<List<Role>> ResolveRolesAsync(string[]? names)
    {
        if (names is null || names.Length == 0)
            throw AppException.BadRequest("至少需指定一個角色。");

        var roles = await db.Roles.Where(r => names.Contains(r.Name)).ToListAsync();

        var unknown = names.Except(roles.Select(r => r.Name)).ToArray();
        if (unknown.Length > 0)
            throw AppException.BadRequest($"未知的角色：{string.Join(", ", unknown)}");

        return roles;
    }

    private static Guid? CurrentUserId(HttpRequest req) =>
        Guid.TryParse(req.HttpContext.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var id)
            ? id : null;

    private static UserDto ToDto(User u) => new(
        u.Id,
        u.Email,
        u.DisplayName,
        u.UserRoles.Select(ur => ur.Role!.Name).OrderBy(n => n).ToArray(),
        u.IsActive,
        u.MustChangePassword,
        u.LockedUntil is { } until && until > DateTime.UtcNow,
        u.LastLoginAt,
        u.CreatedAt);
}
