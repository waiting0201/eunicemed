namespace EuniceMed.Api.Models.Dtos;

public sealed record UserDto(
    Guid      Id,
    string    Email,
    string    DisplayName,
    string[]  Roles,
    bool      IsActive,
    bool      MustChangePassword,
    bool      IsLocked,
    DateTime? LastLoginAt,
    DateTime  CreatedAt);

public sealed record CreateUserRequest(
    string   Email,
    string   DisplayName,
    string   Password,
    string[] Roles);

public sealed record UpdateUserRequest(
    // Email 可改：換工作信箱是正常需求，而先前這裡沒有這個欄位 ——
    // 送了會被靜默忽略（其餘欄位照改），比擋下來更難察覺
    string?   Email       = null,
    string?   DisplayName = null,
    string[]? Roles       = null,
    bool?     IsActive    = null,
    string?   Password    = null,
    bool?     Unlock      = null);
