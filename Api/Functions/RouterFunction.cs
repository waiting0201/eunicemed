using EuniceMed.Api.Routing;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace EuniceMed.Api.Functions;

/// <summary>
/// 唯一的 Azure Function Entry Point。
/// Route = "{*route}" 捕捉所有 /api/* 請求，交由 AppRouter 內部分派。
/// </summary>
public sealed class RouterFunction(AppRouter router)
{
    [Function("Router")]
    public async Task<IActionResult> Run(
        [HttpTrigger(
            AuthorizationLevel.Anonymous,
            "get", "post", "put", "patch", "delete", "options",
            Route = "{*route}")] HttpRequest req,
        string? route)
    {
        return await router.RouteAsync(req, route ?? string.Empty);
    }
}
