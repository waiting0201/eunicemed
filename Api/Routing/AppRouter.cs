using System.Security.Claims;
using EuniceMed.Api.Common;
using EuniceMed.Api.Handlers;
using EuniceMed.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace EuniceMed.Api.Routing;

/// <summary>
/// 全站路由分派。RouterFunction 是唯一的 HTTP entry point，所有 /api/* 都進到這裡。
///
/// <para>
/// 分派用 C# list pattern，**由上而下比對** —— 具體路徑必須排在 catch-all 之前，
/// 否則會被 <c>var</c> 參數吃掉。順序敏感處都有註解標明。
/// </para>
///
/// <para>
/// 驗證與授權一律在此統一執行，**Handler 內禁止重複檢查角色**（唯一例外是欄位級遮蔽）。
/// 路由表另見 docs/api-routes.md —— 那份表是 API 契約，改這裡就要同步改那裡。
/// </para>
/// </summary>
public sealed class AppRouter(
    ILogger<AppRouter> logger,
    IJwtService        jwt,
    CurrentUser        currentUser,
    HealthHandler      health,
    AuthHandler        auth,
    UserHandler        users,
    CollectionHandler  collections,
    ProductHandler     products,
    TaxonomyHandler    taxonomy,
    MediaHandler       media,
    PageHandler        pages)
{
    public async Task<IActionResult> RouteAsync(HttpRequest req, string route)
    {
        var method   = req.Method.ToUpperInvariant();
        var segments = route.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);

        logger.LogDebug("Router: method={Method} route={Route}", method, route);

        // CORS preflight — 允許所有 OPTIONS（正式環境由 Function App 平台層 CORS 把關）
        if (method == "OPTIONS")
            return new OkResult();

        // ── 驗證 + 授權 ────────────────────────────────────────────────────
        if (!IsPublicRoute(method, segments))
        {
            var principal = await jwt.ValidateRequestAsync(req);
            if (principal is null)
                return new UnauthorizedObjectResult(
                    ApiResponse.Fail("Unauthorized.", "Invalid or missing Bearer token."));

            // 寫入 HttpContext.User 供 Handler 讀 claims；
            // 另外明確設定 CurrentUser —— IHttpContextAccessor 在 Functions worker 不會被填充，
            // 少了這行 AuditLog.UserId 會永遠是 null（見 Services/CurrentUser.cs）。
            req.HttpContext.User = principal;
            currentUser.Set(principal);

            var required = GetRequiredRoles(method, segments);
            if (required is not null)
                RequireAnyRole(principal, required);
        }

        // ── 分派 ───────────────────────────────────────────────────────────
        return (method, segments) switch
        {
            // ── Health ────────────────────────────────────────────────────
            ("GET", ["health"]) => health.Get(req),

            // ── Auth ──────────────────────────────────────────────────────
            ("POST", ["auth", "login"])           => await auth.LoginAsync(req),
            ("POST", ["auth", "refresh"])         => await auth.RefreshAsync(req),
            ("POST", ["auth", "logout"])          => await auth.LogoutAsync(req),
            ("POST", ["auth", "change-password"]) => await auth.ChangePasswordAsync(req),

            // ── Collections（公開唯讀）────────────────────────────────────
            ("GET", ["collections"])           => await collections.GetAllAsync(req),
            ("GET", ["collections", var slug]) => await collections.GetBySlugAsync(req, slug),

            // ── Products（公開）───────────────────────────────────────────
            // 順序敏感：by-slug 必須排在三段路徑之前，否則 "by-slug" 會被
            // 當成 {category} 吃掉。
            ("GET", ["products"])                                  => await products.GetListAsync(req),
            ("GET", ["products", "by-slug", var s])                => await products.GetBySlugAsync(req, s),
            ("GET", ["products", var cat, var sub, var s])         => await products.GetByPathAsync(req, cat, sub, s),

            // ── 分類 / 子分類 / 認證（公開）───────────────────────────────
            ("GET", ["categories"])                                => await taxonomy.GetCategoriesAsync(req),
            ("GET", ["categories", var slug])                      => await taxonomy.GetCategoryAsync(req, slug),
            ("GET", ["sub-categories"])                            => await taxonomy.GetSubCategoriesAsync(req),
            ("GET", ["sub-categories", var cat, var sub])          => await taxonomy.GetSubCategoryAsync(req, cat, sub),
            ("GET", ["certifications"])                            => await taxonomy.GetCertificationsAsync(req),

            // ── 頁面區段（公開）───────────────────────────────────────────
            ("GET", ["pages", var pageKey]) => await pages.GetPublicAsync(req, pageKey),

            // ── Admin：頁面區段 ───────────────────────────────────────────
            // 順序敏感：page-schema 與 pages 各自的具體路徑必須排在 catch-all 之前
            ("GET",   ["admin", "page-schema", var pageKey])  => pages.GetSchemaAsync(pageKey),
            ("GET",   ["admin", "pages"])                     => await pages.AdminListAsync(),
            ("GET",   ["admin", "pages", var pageKey])        => await pages.AdminGetAsync(pageKey),
            ("PUT",   ["admin", "pages", var pageKey, "sections", var sk])
                => await pages.AdminUpsertSectionAsync(req, pageKey, sk),
            ("PATCH", ["admin", "pages", var pageKey, "sections", var sk, "enabled"])
                => await pages.AdminToggleAsync(req, pageKey, sk),
            // 刻意不提供 POST / DELETE sections —— 區段集合由 schema registry 決定

            ("POST",  ["admin", "maintenance", "sync-page-sections"])
                => await pages.SyncSectionsAsync(req),

            // ── Admin：媒體 ───────────────────────────────────────────────
            // 順序敏感：media-presets 與 uploads 必須排在 ["admin","media",var id] 之前
            ("GET",    ["admin", "media-presets"])            => media.GetPresets(),
            ("POST",   ["admin", "uploads", "sas"])           => await media.CreateSasAsync(req),
            ("GET",    ["admin", "media"])                    => await media.GetAllAsync(req),
            ("POST",   ["admin", "media"])                    => await media.UploadAsync(req),
            ("GET",    ["admin", "media", var id, "usages"])  => await media.GetUsagesAsync(id),
            ("DELETE", ["admin", "media", var id])            => await media.DeleteAsync(id),

            // ── Admin：維護 ───────────────────────────────────────────────
            ("POST", ["admin", "products", "import"])              => await products.ImportLegacyAsync(req),

            // ── Admin：Collections ────────────────────────────────────────
            ("GET",    ["admin", "collections"])          => await collections.AdminGetAllAsync(),
            ("POST",   ["admin", "collections"])          => await collections.AdminCreateAsync(req),
            ("GET",    ["admin", "collections", var id])  => await collections.AdminGetByIdAsync(id),
            ("PUT" or "PATCH", ["admin", "collections", var id]) => await collections.AdminUpdateAsync(req, id),
            ("DELETE", ["admin", "collections", var id])  => await collections.AdminDeleteAsync(id),

            // ── Admin：Users（Admin only）─────────────────────────────────
            ("GET",    ["admin", "users"])         => await users.GetAllAsync(),
            ("POST",   ["admin", "users"])         => await users.CreateAsync(req),
            ("GET",    ["admin", "users", var id]) => await users.GetByIdAsync(id),
            ("PUT" or "PATCH", ["admin", "users", var id]) => await users.UpdateAsync(req, id),
            ("DELETE", ["admin", "users", var id]) => await users.DeleteAsync(req, id),

            // ── 404 ───────────────────────────────────────────────────────
            _ => new NotFoundObjectResult(
                     ApiResponse.Fail(
                         "Endpoint not found.",
                         $"Route '/api/{route}' with method {method} does not exist.")),
        };
    }

    // ── 授權規則 ───────────────────────────────────────────────────────────

    /// <summary>
    /// 公開路由（不需 JWT）。
    /// 規則：<c>/admin/*</c> 一律需要 JWT；<c>/auth/*</c> 除 change-password 外公開；
    /// 其餘 GET 為公開讀取；其餘寫入預設需要驗證。
    /// </summary>
    private static bool IsPublicRoute(string method, string[] segments) =>
        (method, segments) switch
        {
            ("GET",  ["health"])          => true,
            ("POST", ["auth", "login"])   => true,
            ("POST", ["auth", "refresh"]) => true,
            ("POST", ["auth", "logout"])  => true,   // 冪等，且只認 refresh token 本身
            ("POST", ["contact"])         => true,   // Phase 7

            (_, ["admin", ..])            => false,
            ("GET", _)                    => true,
            _                             => false,
        };

    /// <summary>
    /// 該路由所需的角色（任一符合即可）。null = 已登入即可。
    ///
    /// <para>
    /// **Author 可建立與編輯草稿，但不可發布** —— 這是 EuniceMed 特有的一條
    /// （docs/03-cms.md §2）。因此發布動作獨立列在寫入之前，且不含 Author。
    /// </para>
    /// </summary>
    private static string[]? GetRequiredRoles(string method, string[] segments) =>
        (method, segments) switch
        {
            // 發布／取消發布：必須排在一般寫入規則之前，否則會被 ["admin", _, var id] 吃掉
            ("POST", ["admin", _, _, "publish" or "unpublish"]) => Editors,

            // 使用者管理：Admin only
            (_, ["admin", "users", ..]) => Admins,

            // 設定：Admin only
            (_, ["admin", "settings", ..]) => Admins,

            // 維護端點：Admin only（另需 X-Maintenance-Key，於 Handler 檢查）
            (_, ["admin", "maintenance", ..]) => Admins,

            // 表單收件匣：讀取含 Viewer，寫入需 Editor 以上
            ("GET", ["admin", "contact-submissions", ..]) => null,
            (_,     ["admin", "contact-submissions", ..]) => Editors,

            // 其餘後台：讀取只要登入，寫入需 Author 以上
            ("GET", ["admin", ..]) => null,
            (_,     ["admin", ..]) => Authors,

            _ => null,
        };

    private static readonly string[] Admins  = [RoleNames.Admin];
    private static readonly string[] Editors = [RoleNames.Admin, RoleNames.Editor];
    private static readonly string[] Authors = [RoleNames.Admin, RoleNames.Editor, RoleNames.Author];

    /// <summary>符合任一角色即通過，否則 403。</summary>
    private static void RequireAnyRole(ClaimsPrincipal principal, string[] allowed)
    {
        var held = principal.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();

        if (!held.Any(allowed.Contains))
            throw AppException.Forbidden(
                $"此操作需要下列角色之一：{string.Join(" / ", allowed)}。目前角色：{(held.Length == 0 ? "無" : string.Join(" / ", held))}");
    }
}
