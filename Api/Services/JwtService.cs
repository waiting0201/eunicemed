using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace EuniceMed.Api.Services;

public sealed class JwtService : IJwtService
{
    private readonly string               _issuer;
    private readonly string               _audience;
    private readonly int                  _expiryMinutes;
    private readonly SymmetricSecurityKey _key;

    private readonly JwtSecurityTokenHandler _handler = new()
    {
        // 停用預設 claim type 映射，保持 JWT 原始 claim name（sub、name、email）
        // 否則 sub → http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier
        MapInboundClaims = false,
    };

    public JwtService(IConfiguration config)
    {
        var secret = config["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is required.");

        if (Encoding.UTF8.GetByteCount(secret) < 32)
            throw new InvalidOperationException("Jwt:Secret must be at least 32 bytes for HMAC-SHA256.");

        _issuer        = config["Jwt:Issuer"]   ?? "eunicemed-api";
        _audience      = config["Jwt:Audience"] ?? "eunicemed-admin";
        _expiryMinutes = int.TryParse(config["Jwt:ExpiryMinutes"], out var em) ? em : 15;
        _key           = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    }

    public string GenerateAccessToken(Guid userId, string displayName, string email, IEnumerable<string> roles)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   userId.ToString()),
            new(JwtRegisteredClaimNames.Name,  displayName),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
        };

        // 同時發 ClaimTypes.Role（給 ClaimsPrincipal.IsInRole）與字面 "role"（給前端 decode payload）
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
            claims.Add(new Claim("role", role));
        }

        var token = new JwtSecurityToken(
            issuer:             _issuer,
            audience:           _audience,
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            DateTime.UtcNow.AddMinutes(_expiryMinutes),
            signingCredentials: new SigningCredentials(_key, SecurityAlgorithms.HmacSha256));

        return _handler.WriteToken(token);
    }

    public string GenerateRefreshToken()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    /// <summary>
    /// refresh token 只存雜湊。不需要 salt 或慢雜湊 —— token 本身是 64 bytes 的
    /// 密碼學亂數，沒有字典攻擊的空間，SHA-256 足夠且可直接建索引比對。
    /// </summary>
    public string HashRefreshToken(string token)
        => Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public ClaimsPrincipal? ValidateToken(string token)
    {
        try
        {
            var parameters = new TokenValidationParameters
            {
                ValidateIssuer           = true,
                ValidateAudience         = true,
                ValidateLifetime         = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer              = _issuer,
                ValidAudience            = _audience,
                IssuerSigningKey         = _key,
                ClockSkew                = TimeSpan.FromSeconds(30),
            };
            return _handler.ValidateToken(token, parameters, out _);
        }
        catch
        {
            return null;
        }
    }

    public Task<ClaimsPrincipal?> ValidateRequestAsync(HttpRequest req)
    {
        var authHeader = req.Headers.Authorization.FirstOrDefault();
        if (authHeader is null || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return Task.FromResult<ClaimsPrincipal?>(null);

        var token = authHeader["Bearer ".Length..].Trim();
        return Task.FromResult(ValidateToken(token));
    }
}
