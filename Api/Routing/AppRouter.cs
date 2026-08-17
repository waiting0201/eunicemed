using EuniceMed.Api.Common;
using EuniceMed.Api.Handlers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace EuniceMed.Api.Routing;

/// <summary>
/// 全站路由分派。RouterFunction 是唯一的 HTTP entry point，所有 /api/* 都進到這裡。
///
/// <para>
/// 分派用 C# list pattern，**由上而下比對** —— 具體路徑必須排在 catch-all 之前，
/// 否則會被 <c>var</c> 參數吃掉。每一段都有註解標明順序需求。
/// </para>
///
/// <para>
/// 驗證與授權一律在此統一執行（見 <see cref="IsPublicRoute"/> / <see cref="GetRequiredRole"/>），
/// **Handler 內禁止重複檢查角色**，只有欄位級遮蔽是例外。
/// </para>
/// </summary>
public sealed class AppRouter(
    ILogger<AppRouter> logger,
    HealthHandler      health,
    CollectionHandler  collections)
{
    public async Task<IActionResult> RouteAsync(HttpRequest req, string route)
    {
        var method   = req.Method.ToUpperInvariant();
        var segments = route.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);

        logger.LogDebug("Router: method={Method} route={Route}", method, route);

        // CORS preflight — 允許所有 OPTIONS（正式環境由 Function App 平台層 CORS 設定把關）
        if (method == "OPTIONS")
            return new OkResult();

        // TODO Phase 2：JWT 驗證 + 角色檢查（IsPublicRoute / GetRequiredRole）

        // ── 分派 ───────────────────────────────────────────────────────────
        return (method, segments) switch
        {
            // ── Health ────────────────────────────────────────────────────
            ("GET", ["health"]) => health.Get(),

            // ── Collections（Care / Protect / Advance）─────────────────────
            ("GET", ["collections"])          => await collections.GetAllAsync(req),
            ("GET", ["collections", var slug]) => await collections.GetBySlugAsync(req, slug),

            // ── 404 ───────────────────────────────────────────────────────
            _ => new NotFoundObjectResult(
                     ApiResponse.Fail(
                         "Endpoint not found.",
                         $"Route '/api/{route}' with method {method} does not exist.")),
        };
    }

    /// <summary>公開路由（不需 JWT）。除了 /admin/* 與 /auth/* 以外的讀取端點皆為公開。</summary>
    private static bool IsPublicRoute(string method, string[] segments) =>
        (method, segments) switch
        {
            ("GET",  ["health"])           => true,
            ("POST", ["auth", "login"])    => true,
            ("POST", ["auth", "refresh"])  => true,
            ("POST", ["contact"])          => true,
            // 其餘 /admin/* 一律需要 JWT；非 admin 的 GET 一律公開
            (_, ["admin", ..])             => false,
            ("GET", _)                     => true,
            _                              => false,
        };
}
