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
    AdminProductHandler adminProducts,
    TaxonomyHandler    taxonomy,
    AdminTaxonomyHandler adminTaxonomy,
    MediaHandler       media,
    PageHandler        pages,
    ApplicationHandler applications,
    AdminApplicationHandler adminApplications,
    ArticleHandler     articles,
    AdminArticleHandler adminArticles,
    TagHandler         tags,
    ContentHandler     content,
    AdminContentHandler adminContent,
    SiteHandler        site,
    ContactHandler     contact,
    AdminSummaryHandler summary)
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

            // ── Contact（公開送件）────────────────────────────────────────
            ("POST", ["contact"]) => await contact.SubmitAsync(req),

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

            // ── 應用方案（公開）───────────────────────────────────────────
            // 順序敏感：body-map 必須排在 {slug} 之前，否則會被當成 slug
            ("GET", ["applications"])             => await applications.GetListAsync(req),
            ("GET", ["applications", "body-map"]) => await applications.GetBodyMapAsync(req),
            ("GET", ["applications", var slug])   => await applications.GetBySlugAsync(req, slug),

            // ── 文章：News / Insights（公開）──────────────────────────────
            ("GET", ["news"])                  => await articles.GetNewsListAsync(req),
            ("GET", ["news", var slug])        => await articles.GetNewsAsync(req, slug),
            ("GET", ["insights"])              => await articles.GetInsightsListAsync(req),
            ("GET", ["insights", var slug])    => await articles.GetInsightAsync(req, slug),
            ("GET", ["article-categories"])    => await articles.GetCategoriesAsync(req),

            // ── FAQ / 下載 / 據點（公開）──────────────────────────────────
            ("GET", ["faqs"])            => await content.GetFaqsAsync(req),
            ("GET", ["faq-categories"])  => await content.GetFaqCategoriesAsync(req),
            ("GET", ["downloads"])       => await content.GetDownloadsAsync(req),
            ("GET", ["sales-locations"]) => await content.GetSalesLocationsAsync(req),

            // ── 導覽 / 設定 / 轉址 / sitemap（公開）───────────────────────
            ("GET", ["menus"])     => await site.GetMenusAsync(req),
            ("GET", ["settings"])  => await site.GetSettingsAsync(req),
            ("GET", ["sitemap"])   => await site.GetSitemapAsync(),
            ("GET", ["redirects"]) => await site.GetRedirectsAsync(),

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
            ("DELETE", ["admin", "pages", var pageKey, "sections", var sk])
                => await pages.AdminDeleteSectionLocaleAsync(req, pageKey, sk),
            // 刻意不提供 POST / DELETE sections —— 區段集合由 schema registry 決定

            ("POST",  ["admin", "maintenance", "sync-page-sections"])
                => await pages.SyncSectionsAsync(req),

            // ── Admin：媒體 ───────────────────────────────────────────────
            // 順序敏感：media-presets 與 uploads 必須排在 ["admin","media",var id] 之前
            ("GET",    ["admin", "media-presets"])            => media.GetPresets(),
            ("POST",   ["admin", "uploads", "sas"])           => await media.CreateSasAsync(req),
            ("POST",   ["admin", "uploads", "register"])      => await media.RegisterUploadAsync(req),
            ("GET",    ["admin", "media"])                    => await media.GetAllAsync(req),
            ("POST",   ["admin", "media"])                    => await media.UploadAsync(req),
            ("GET",    ["admin", "media", var id, "usages"])  => await media.GetUsagesAsync(id),
            ("PUT" or "PATCH", ["admin", "media", var id])    => await media.UpdateAsync(req, id),
            ("DELETE", ["admin", "media", var id])            => await media.DeleteAsync(id),

            // ── Admin：維護 ───────────────────────────────────────────────
            ("POST", ["admin", "products", "import"])              => await products.ImportLegacyAsync(req),

            // ── Admin：Products ───────────────────────────────────────────
            // 順序敏感：import 在上面、publish/unpublish/related 在 ["admin","products",var id]
            // 之前，否則後三段會被兩段的 catch-all 吃掉。
            ("POST", ["admin", "products", var id, "publish"])   => await adminProducts.PublishAsync(id),
            ("POST", ["admin", "products", var id, "unpublish"]) => await adminProducts.UnpublishAsync(id),
            ("GET",  ["admin", "products", var id, "related"])   => await adminProducts.GetRelatedAsync(id),
            ("PUT",  ["admin", "products", var id, "related"])   => await adminProducts.UpdateRelatedAsync(req, id),

            ("GET",    ["admin", "products"])          => await adminProducts.GetListAsync(req),
            ("POST",   ["admin", "products"])          => await adminProducts.CreateAsync(req),
            ("GET",    ["admin", "products", var id])  => await adminProducts.GetByIdAsync(id),
            ("PUT" or "PATCH", ["admin", "products", var id]) => await adminProducts.UpdateAsync(req, id),
            ("DELETE", ["admin", "products", var id])  => await adminProducts.DeleteAsync(id),

            // ── Admin：分類 / 子分類 / 認證 / 部位 ─────────────────────────
            ("GET",    ["admin", "categories"])          => await adminTaxonomy.GetCategoriesAsync(),
            ("POST",   ["admin", "categories"])          => await adminTaxonomy.CreateCategoryAsync(req),
            ("GET",    ["admin", "categories", var id])  => await adminTaxonomy.GetCategoryAsync(id),
            ("PUT" or "PATCH", ["admin", "categories", var id]) => await adminTaxonomy.UpdateCategoryAsync(req, id),
            ("DELETE", ["admin", "categories", var id])  => await adminTaxonomy.DeleteCategoryAsync(id),

            ("GET",    ["admin", "sub-categories"])          => await adminTaxonomy.GetSubCategoriesAsync(req),
            ("POST",   ["admin", "sub-categories"])          => await adminTaxonomy.CreateSubCategoryAsync(req),
            ("GET",    ["admin", "sub-categories", var id])  => await adminTaxonomy.GetSubCategoryAsync(id),
            ("PUT" or "PATCH", ["admin", "sub-categories", var id]) => await adminTaxonomy.UpdateSubCategoryAsync(req, id),
            ("DELETE", ["admin", "sub-categories", var id])  => await adminTaxonomy.DeleteSubCategoryAsync(id),

            ("GET",    ["admin", "certifications"])          => await adminTaxonomy.GetCertificationsAsync(),
            ("POST",   ["admin", "certifications"])          => await adminTaxonomy.CreateCertificationAsync(req),
            ("GET",    ["admin", "certifications", var id])  => await adminTaxonomy.GetCertificationAsync(id),
            ("PUT" or "PATCH", ["admin", "certifications", var id]) => await adminTaxonomy.UpdateCertificationAsync(req, id),
            ("DELETE", ["admin", "certifications", var id])  => await adminTaxonomy.DeleteCertificationAsync(id),

            // 部位刻意只有 GET / PUT —— 見 AdminBodyPartDto 的註解
            ("GET",  ["admin", "body-parts"])         => await adminTaxonomy.GetBodyPartsAsync(),
            ("PUT" or "PATCH", ["admin", "body-parts", var id]) => await adminTaxonomy.UpdateBodyPartAsync(req, id),

            // ── Admin：應用方案 ───────────────────────────────────────────
            // 順序敏感：publish / unpublish 必須排在 ["admin","applications",var id] 之前
            ("POST", ["admin", "applications", var id, "publish"])   => await adminApplications.PublishAsync(id),
            ("POST", ["admin", "applications", var id, "unpublish"]) => await adminApplications.UnpublishAsync(id),

            ("GET",    ["admin", "applications"])          => await adminApplications.GetListAsync(req),
            ("POST",   ["admin", "applications"])          => await adminApplications.CreateAsync(req),
            ("GET",    ["admin", "applications", var id])  => await adminApplications.GetByIdAsync(id),
            ("PUT" or "PATCH", ["admin", "applications", var id]) => await adminApplications.UpdateAsync(req, id),
            ("DELETE", ["admin", "applications", var id])  => await adminApplications.DeleteAsync(id),

            // ── Admin：文章（News / Insights）─────────────────────────────
            // 順序敏感：四段路徑（publish / event / gallery）全部排在三段之前
            ("POST",   ["admin", "articles", var id, "publish"])   => await adminArticles.PublishAsync(id),
            ("POST",   ["admin", "articles", var id, "unpublish"]) => await adminArticles.UnpublishAsync(id),
            ("GET",    ["admin", "articles", var id, "event"])     => await adminArticles.GetEventAsync(id),
            ("PUT",    ["admin", "articles", var id, "event"])     => await adminArticles.UpsertEventAsync(req, id),
            ("DELETE", ["admin", "articles", var id, "event"])     => await adminArticles.DeleteEventAsync(id),
            ("GET",    ["admin", "articles", var id, "gallery"])   => await adminArticles.GetGalleryAsync(id),
            ("PUT",    ["admin", "articles", var id, "gallery"])   => await adminArticles.UpdateGalleryAsync(req, id),

            ("GET",    ["admin", "articles"])          => await adminArticles.GetListAsync(req),
            ("POST",   ["admin", "articles"])          => await adminArticles.CreateAsync(req),
            ("GET",    ["admin", "articles", var id])  => await adminArticles.GetByIdAsync(id),
            ("PUT" or "PATCH", ["admin", "articles", var id]) => await adminArticles.UpdateAsync(req, id),
            ("DELETE", ["admin", "articles", var id])  => await adminArticles.DeleteAsync(id),

            ("GET",    ["admin", "tags"])          => await tags.GetAllAsync(),
            ("POST",   ["admin", "tags"])          => await tags.CreateAsync(req),
            ("PUT" or "PATCH", ["admin", "tags", var id]) => await tags.UpdateAsync(req, id),
            ("DELETE", ["admin", "tags", var id])  => await tags.DeleteAsync(id),

            ("GET",    ["admin", "article-categories"])          => await adminArticles.GetCategoriesAsync(req),
            ("POST",   ["admin", "article-categories"])          => await adminArticles.CreateCategoryAsync(req),
            ("GET",    ["admin", "article-categories", var id])  => await adminArticles.GetCategoryAsync(id),
            ("PUT" or "PATCH", ["admin", "article-categories", var id]) => await adminArticles.UpdateCategoryAsync(req, id),
            ("DELETE", ["admin", "article-categories", var id])  => await adminArticles.DeleteCategoryAsync(id),

            // ── Admin：FAQ / 下載 / 據點 ──────────────────────────────────
            ("GET",    ["admin", "faq-categories"])          => await adminContent.GetFaqCategoriesAsync(),
            ("POST",   ["admin", "faq-categories"])          => await adminContent.CreateFaqCategoryAsync(req),
            ("GET",    ["admin", "faq-categories", var id])  => await adminContent.GetFaqCategoryAsync(id),
            ("PUT" or "PATCH", ["admin", "faq-categories", var id]) => await adminContent.UpdateFaqCategoryAsync(req, id),
            ("DELETE", ["admin", "faq-categories", var id])  => await adminContent.DeleteFaqCategoryAsync(id),

            ("GET",    ["admin", "faqs"])          => await adminContent.GetFaqsAsync(req),
            ("POST",   ["admin", "faqs"])          => await adminContent.CreateFaqAsync(req),
            ("GET",    ["admin", "faqs", var id])  => await adminContent.GetFaqAsync(id),
            ("PUT" or "PATCH", ["admin", "faqs", var id]) => await adminContent.UpdateFaqAsync(req, id),
            ("DELETE", ["admin", "faqs", var id])  => await adminContent.DeleteFaqAsync(id),

            ("GET",    ["admin", "downloads"])          => await adminContent.GetDownloadsAsync(req),
            ("POST",   ["admin", "downloads"])          => await adminContent.CreateDownloadAsync(req),
            ("GET",    ["admin", "downloads", var id])  => await adminContent.GetDownloadAsync(id),
            ("PUT" or "PATCH", ["admin", "downloads", var id]) => await adminContent.UpdateDownloadAsync(req, id),
            ("DELETE", ["admin", "downloads", var id])  => await adminContent.DeleteDownloadAsync(id),

            ("GET",    ["admin", "sales-locations"])          => await adminContent.GetSalesLocationsAsync(req),
            ("POST",   ["admin", "sales-locations"])          => await adminContent.CreateSalesLocationAsync(req),
            ("GET",    ["admin", "sales-locations", var id])  => await adminContent.GetSalesLocationAsync(id),
            ("PUT" or "PATCH", ["admin", "sales-locations", var id]) => await adminContent.UpdateSalesLocationAsync(req, id),
            ("DELETE", ["admin", "sales-locations", var id])  => await adminContent.DeleteSalesLocationAsync(id),

            // ── Admin：側欄統計 ───────────────────────────────────────────
            ("GET", ["admin", "summary"]) => await summary.GetAsync(),

            // ── Admin：選單 / 轉址 / 設定 ─────────────────────────────────
            ("GET", ["admin", "menus"])          => await site.AdminGetMenusAsync(),
            ("PUT", ["admin", "menus"])          => await site.AdminReplaceMenusAsync(req),

            ("GET",    ["admin", "redirects"])          => await site.AdminGetRedirectsAsync(req),
            ("POST",   ["admin", "redirects"])          => await site.AdminCreateRedirectAsync(req),
            ("PUT" or "PATCH", ["admin", "redirects", var id]) => await site.AdminUpdateRedirectAsync(req, id),
            ("DELETE", ["admin", "redirects", var id])  => await site.AdminDeleteRedirectAsync(id),

            ("GET", ["admin", "settings"]) => await site.AdminGetSettingsAsync(),
            ("PUT", ["admin", "settings"]) => await site.AdminUpdateSettingsAsync(req),

            // ── Admin：Collections ────────────────────────────────────────
            ("GET",    ["admin", "collections"])          => await collections.AdminGetAllAsync(),
            ("POST",   ["admin", "collections"])          => await collections.AdminCreateAsync(req),
            ("GET",    ["admin", "collections", var id])  => await collections.AdminGetByIdAsync(id),
            ("PUT" or "PATCH", ["admin", "collections", var id]) => await collections.AdminUpdateAsync(req, id),
            ("DELETE", ["admin", "collections", var id])  => await collections.AdminDeleteAsync(id),

            // ── Admin：表單收件匣 ─────────────────────────────────────────
            // 順序敏感：export 必須排在 {id} 之前，否則會被 var id 吃掉。
            ("GET",   ["admin", "contact-submissions"])           => await contact.GetListAsync(req),
            ("GET",   ["admin", "contact-submissions", "export"]) => await contact.ExportAsync(req),
            ("GET",   ["admin", "contact-submissions", var id])   => await contact.GetAsync(id),
            ("PATCH", ["admin", "contact-submissions", var id])   => await contact.UpdateStatusAsync(req, id),

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

            // 舊站匯入：Admin only（會一次改動全部 149 筆，docs/05 §4.1）
            ("POST", ["admin", "products", "import"]) => Admins,

            // 分類骨架：**寫入**需 Editor 以上。Author 不該能改動全站 URL 結構 ——
            // 改一個子分類 slug 就會讓底下所有產品的網址失效（docs/api-routes.md）。
            // 讀取維持「登入即可」：Author 編產品時就是要從這幾張表挑分類與部位，
            // 連讀都擋掉的話產品表單根本填不出來。
            (not "GET", ["admin", "categories", ..])      => Editors,
            (not "GET", ["admin", "sub-categories", ..])  => Editors,
            (not "GET", ["admin", "certifications", ..])  => Editors,
            (not "GET", ["admin", "body-parts", ..])      => Editors,

            // 沒有草稿工作流的模組：**寫入需 Editor 以上**。
            //
            // 這幾張表沒有發布端點，`status` 是 payload 裡的一個欄位、存檔即生效。
            // 若開放 Author 寫入，他只要在建立時送 status=1 就直接上線，
            // 等於繞過「Author 不可發布」那條規則。有草稿工作流的模組
            // （產品、文章、應用方案）則維持 Author+ —— 那些的 POST 一律建為草稿，
            // 且 PUT 不碰 status，發布只能走 /publish。
            (not "GET", ["admin", "article-categories", ..]) => Editors,
            (not "GET", ["admin", "tags", ..])               => Editors,
            (not "GET", ["admin", "faq-categories", ..])     => Editors,
            (not "GET", ["admin", "faqs", ..])               => Editors,
            (not "GET", ["admin", "downloads", ..])          => Editors,
            (not "GET", ["admin", "sales-locations", ..])    => Editors,

            // 選單與轉址改動會影響全站導覽與既有網址，寫入需 Editor 以上
            (not "GET", ["admin", "menus", ..])     => Editors,
            (not "GET", ["admin", "redirects", ..]) => Editors,

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
