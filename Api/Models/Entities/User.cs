namespace EuniceMed.Api.Models.Entities;

/// <summary>後台使用者。docs/05-database.md §3.12。自建驗證，非 ASP.NET Identity。</summary>
public class User
{
    public Guid Id { get; set; }

    /// <summary>
    /// 登入識別，全站唯一。**不保證是 email** —— 純帳號名（如 <c>admin</c>）也合法，
    /// 兩端都不驗格式。欄位名保留 <c>Email</c> 只是因為改名要動 prod 的欄位與部署設定，
    /// 划不來（2026-09-01 決議）。系統沒有任何寄信給使用者的流程，所以不填 email 不會壞掉。
    /// </summary>
    public string Email       { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>BCrypt hash（與 Jabez 一致）</summary>
    public string PasswordHash { get; set; } = string.Empty;

    public bool      IsActive    { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public DateTime  CreatedAt   { get; set; }

    // ── 以下三欄為規格外新增，理由見 Data/Configurations/UserConfiguration.cs ──

    /// <summary>連續登入失敗次數，成功登入後歸零</summary>
    public int FailedLoginCount { get; set; }

    /// <summary>鎖定至此時間（UTC）；null 表示未鎖定</summary>
    public DateTime? LockedUntil { get; set; }

    /// <summary>首次登入或密碼被重設後為 true，需先改密碼</summary>
    public bool MustChangePassword { get; set; }

    public ICollection<UserRole>     UserRoles     { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}

/// <summary>角色。四筆固定資料：Admin / Editor / Author / Viewer。</summary>
public class Role
{
    public Guid   Id   { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<UserRole> UserRoles { get; set; } = [];
}

public class UserRole
{
    public Guid  UserId { get; set; }
    public User? User   { get; set; }

    public Guid  RoleId { get; set; }
    public Role? Role   { get; set; }
}

/// <summary>
/// Refresh token。**只存雜湊，不存明文** —— DB 外洩時無法直接冒用。
/// 單次使用：用過即 <see cref="RevokedAt"/> 標記並發新的一組。
/// </summary>
public class RefreshToken
{
    public Guid Id { get; set; }

    public Guid  UserId { get; set; }
    public User? User   { get; set; }

    /// <summary>SHA-256(token) 的 Base64。查詢時以雜湊比對。</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTime  ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public DateTime  CreatedAt { get; set; }

    public bool IsUsable(DateTime nowUtc) => RevokedAt is null && ExpiresAt > nowUtc;
}
