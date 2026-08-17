using EuniceMed.Api.Common;
using EuniceMed.Api.Data;
using EuniceMed.Api.Models.Dtos;
using EuniceMed.Api.Models.Entities;
using EuniceMed.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.IdentityModel.Tokens.Jwt;

namespace EuniceMed.Api.Handlers;

/// <summary>後台驗證：登入 / 換發 / 登出 / 改密碼。</summary>
public sealed class AuthHandler(
    AppDbContext        db,
    IJwtService         jwt,
    LoginRateLimiter    rateLimiter,
    IConfiguration      config,
    ILogger<AuthHandler> logger)
{
    private readonly int _refreshExpiryDays =
        int.TryParse(config["Jwt:RefreshExpiryDays"], out var d) ? d : 7;

    /// <summary>連續失敗幾次後鎖定</summary>
    private const int LockoutThreshold = 5;

    /// <summary>鎖定時長</summary>
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    /// <summary>POST /auth/login → { accessToken, refreshToken, user }</summary>
    public async Task<IActionResult> LoginAsync(HttpRequest req)
    {
        // IP 層速率限制（減速帶；真正的把關是下方的帳號鎖定，那是記在 DB 的）
        var ip = IpRateLimiter.ClientIp(req);
        if (!rateLimiter.TryAcquire(ip))
        {
            req.HttpContext.Response.Headers["Retry-After"] = "60";
            throw AppException.TooManyRequests("登入嘗試過於頻繁，請稍後再試。");
        }

        var body = await req.ReadFromJsonAsync<LoginRequest>();
        if (body is null || string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrWhiteSpace(body.Password))
            return new BadRequestObjectResult(ApiResponse.Fail("Email and password are required."));

        var email = body.Email.Trim();
        var user = await db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == email);

        var now = DateTime.UtcNow;

        // 帳號不存在與密碼錯誤回同一個訊息 —— 不洩漏帳號是否存在
        if (user is null)
        {
            logger.LogWarning("Login failed: unknown email {Email} from {Ip}", email, ip);
            throw AppException.Unauthorized("Email 或密碼錯誤。");
        }

        if (user.LockedUntil is { } until && until > now)
        {
            logger.LogWarning("Login blocked: account {UserId} locked until {Until}", user.Id, until);
            throw AppException.Forbidden($"帳號已鎖定，請於 {(until - now).TotalMinutes:F0} 分鐘後再試。");
        }

        if (!BCrypt.Net.BCrypt.Verify(body.Password, user.PasswordHash))
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= LockoutThreshold)
            {
                user.LockedUntil      = now.Add(LockoutDuration);
                user.FailedLoginCount = 0;
                logger.LogWarning("Account {UserId} locked after {N} failed attempts", user.Id, LockoutThreshold);
            }
            await db.SaveChangesAsync();

            throw AppException.Unauthorized("Email 或密碼錯誤。");
        }

        if (!user.IsActive)
            throw AppException.Forbidden("帳號已停用。");

        // 登入成功：清空失敗計數與鎖定
        user.FailedLoginCount = 0;
        user.LockedUntil      = null;
        user.LastLoginAt      = now;

        var roles = user.UserRoles.Select(ur => ur.Role!.Name).ToArray();
        var (access, refresh) = await IssueTokensAsync(user, roles, now);

        db.Add(new AuditLog
        {
            UserId = user.Id, Action = AuditActions.Login,
            Entity = nameof(User), EntityId = user.Id.ToString(), CreatedAt = now,
        });
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(
            new LoginResponse(access, refresh, ToAuthUser(user, roles)), "登入成功。"));
    }

    /// <summary>POST /auth/refresh → 單次使用，舊 token 立即撤銷並發新的一組</summary>
    public async Task<IActionResult> RefreshAsync(HttpRequest req)
    {
        var body = await req.ReadFromJsonAsync<RefreshRequest>();
        if (body is null || string.IsNullOrWhiteSpace(body.RefreshToken))
            return new BadRequestObjectResult(ApiResponse.Fail("refreshToken is required."));

        var hash = jwt.HashRefreshToken(body.RefreshToken);
        var now  = DateTime.UtcNow;

        var stored = await db.RefreshTokens
            .Include(t => t.User).ThenInclude(u => u!.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(t => t.TokenHash == hash);

        if (stored is null || !stored.IsUsable(now))
            throw AppException.Unauthorized("Refresh token 無效或已過期。");

        if (stored.User is null || !stored.User.IsActive)
            throw AppException.Forbidden("帳號已停用。");

        // 輪替：舊的立刻作廢
        stored.RevokedAt = now;

        var roles = stored.User.UserRoles.Select(ur => ur.Role!.Name).ToArray();
        var (access, refresh) = await IssueTokensAsync(stored.User, roles, now);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(new TokenPairResponse(access, refresh)));
    }

    /// <summary>POST /auth/logout → 撤銷該 refresh token</summary>
    public async Task<IActionResult> LogoutAsync(HttpRequest req)
    {
        var body = await req.ReadFromJsonAsync<RefreshRequest>();
        if (body is null || string.IsNullOrWhiteSpace(body.RefreshToken))
            return new BadRequestObjectResult(ApiResponse.Fail("refreshToken is required."));

        var hash = jwt.HashRefreshToken(body.RefreshToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);

        // 找不到也回 200 —— 登出是冪等的，且不該用來探測 token 是否存在
        if (stored is { RevokedAt: null })
        {
            stored.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        return new OkObjectResult(ApiResponse.Ok("已登出。"));
    }

    /// <summary>POST /auth/change-password（需登入）</summary>
    public async Task<IActionResult> ChangePasswordAsync(HttpRequest req)
    {
        var sub = req.HttpContext.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (!Guid.TryParse(sub, out var userId))
            throw AppException.Unauthorized("Invalid token claims.");

        var body = await req.ReadFromJsonAsync<ChangePasswordRequest>();
        if (body is null || string.IsNullOrWhiteSpace(body.NewPassword))
            return new BadRequestObjectResult(ApiResponse.Fail("currentPassword 與 newPassword 為必填。"));

        if (body.NewPassword.Length < 12)
            return new BadRequestObjectResult(ApiResponse.Fail("新密碼至少需 12 個字元。"));

        var user = await db.Users.FindAsync(userId)
            ?? throw AppException.NotFound("User");

        if (!BCrypt.Net.BCrypt.Verify(body.CurrentPassword, user.PasswordHash))
            throw AppException.Unauthorized("目前密碼錯誤。");

        user.PasswordHash       = BCrypt.Net.BCrypt.HashPassword(body.NewPassword);
        user.MustChangePassword = false;

        // 改密碼即撤銷所有既有 refresh token，強制其他裝置重新登入
        await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow));

        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok("密碼已更新，請重新登入。"));
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    private async Task<(string Access, string Refresh)> IssueTokensAsync(User user, string[] roles, DateTime now)
    {
        var access  = jwt.GenerateAccessToken(user.Id, user.DisplayName, user.Email, roles);
        var refresh = jwt.GenerateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId    = user.Id,
            TokenHash = jwt.HashRefreshToken(refresh),
            ExpiresAt = now.AddDays(_refreshExpiryDays),
            CreatedAt = now,
        });

        // 順手清掉該使用者過期或已撤銷超過 30 天的紀錄，避免表無限成長
        var cutoff = now.AddDays(-30);
        await db.RefreshTokens
            .Where(t => t.UserId == user.Id && (t.ExpiresAt < cutoff || (t.RevokedAt != null && t.RevokedAt < cutoff)))
            .ExecuteDeleteAsync();

        return (access, refresh);
    }

    private static AuthUserDto ToAuthUser(User u, string[] roles) =>
        new(u.Id, u.Email, u.DisplayName, roles, u.MustChangePassword);
}
