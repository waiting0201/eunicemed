using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace EuniceMed.Api.Services;

public interface IJwtService
{
    /// <summary>簽發 access token。claims：sub、name、email、role（可多個）、jti、exp。</summary>
    string GenerateAccessToken(Guid userId, string displayName, string email, IEnumerable<string> roles);

    /// <summary>產生 refresh token 明文（只回一次，DB 只存雜湊）。</summary>
    string GenerateRefreshToken();

    /// <summary>refresh token 明文 → 儲存用的雜湊。</summary>
    string HashRefreshToken(string token);

    ClaimsPrincipal? ValidateToken(string token);

    Task<ClaimsPrincipal?> ValidateRequestAsync(HttpRequest req);
}
