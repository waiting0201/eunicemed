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
    string?   DisplayName = null,
    string[]? Roles       = null,
    bool?     IsActive    = null,
    string?   Password    = null,
    bool?     Unlock      = null);
