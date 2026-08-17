using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace EuniceMed.Api.Services;

/// <summary>
/// 目前請求的操作者。由 <see cref="Routing.AppRouter"/> 在通過驗證後明確設定。
///
/// <para>
/// **為什麼不用 <c>IHttpContextAccessor</c>**：在 Azure Functions 的 isolated worker 中，
/// 即使開了 ASP.NET Core integration，<c>IHttpContextAccessor.HttpContext</c> 也不會被填充
/// —— 它靠的是 ASP.NET Core hosting layer 設定的 AsyncLocal，而 worker pipeline 不經過那裡。
/// 實測結果是 <c>AuditLog.UserId</c> 永遠是 null，稽核紀錄少了「誰」這一半。
/// 因此改為由 Router 明確注入的 scoped 服務。
/// </para>
/// </summary>
public sealed class CurrentUser
{
    public Guid?    Id          { get; private set; }
    public string?  Email       { get; private set; }
    public string?  DisplayName { get; private set; }
    public string[] Roles       { get; private set; } = [];

    public bool IsAuthenticated => Id.HasValue;

    public void Set(ClaimsPrincipal principal)
    {
        var sub = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        Id          = Guid.TryParse(sub, out var id) ? id : null;
        Email       = principal.FindFirst(JwtRegisteredClaimNames.Email)?.Value;
        DisplayName = principal.FindFirst(JwtRegisteredClaimNames.Name)?.Value;
        Roles       = principal.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();
    }
}
