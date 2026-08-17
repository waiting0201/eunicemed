namespace EuniceMed.Api.Models.Dtos;

public sealed record LoginRequest(string Email, string Password);

public sealed record RefreshRequest(string RefreshToken);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public sealed record AuthUserDto(
    Guid     Id,
    string   Email,
    string   DisplayName,
    string[] Roles,
    bool     MustChangePassword);

public sealed record LoginResponse(
    string      AccessToken,
    string      RefreshToken,
    AuthUserDto User);

public sealed record TokenPairResponse(
    string AccessToken,
    string RefreshToken);
