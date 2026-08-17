using EuniceMed.Api.Common;
using EuniceMed.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EuniceMed.Api.Handlers;

public sealed class HealthHandler
{
    /// <summary>
    /// GET /health
    ///
    /// <para>
    /// 除了存活狀態，一併回報**伺服器解析到的用戶端 IP**。速率限制是以這個值分區的
    /// （見 <see cref="IpRateLimiter.ClientIp"/>），而它在不同託管環境下的行為並不一致
    /// —— 本機的 Core Tools host 與 Azure 的前端代理對 X-Forwarded-For 的處理不同。
    /// 把它露出來，是為了讓「速率限制全擠在同一個 bucket」這種問題可以直接看出來，
    /// 而不是只能從 429 的分布反推。回傳的是呼叫者自己的 IP，不構成資訊洩漏。
    /// </para>
    /// </summary>
    public IActionResult Get(HttpRequest req) =>
        new OkObjectResult(ApiResponse.Ok(new
        {
            status    = "healthy",
            version   = "1.0.0",
            timestamp = DateTimeOffset.UtcNow,
            runtime   = ".NET 10 / Azure Functions v4 Isolated",
            client = new
            {
                resolvedIp = IpRateLimiter.ClientIp(req),
                forwardedFor = req.Headers["X-Forwarded-For"].ToString(),
                remoteAddress = req.HttpContext.Connection.RemoteIpAddress?.ToString(),
            },
        }, "Service is healthy."));
}
