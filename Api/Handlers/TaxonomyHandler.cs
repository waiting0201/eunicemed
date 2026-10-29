using EuniceMed.Api.Common;
using EuniceMed.Api.Services.Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EuniceMed.Api.Handlers;

/// <summary>分類 / 子分類 / 認證的公開端點。</summary>
public sealed class TaxonomyHandler(ITaxonomyReadService reader)
{
    /// <summary>GET /categories?locale=&amp;include=subCategories</summary>
    public async Task<IActionResult> GetCategoriesAsync(HttpRequest req)
    {
        var locale  = Locales.Normalize(req.Query["locale"]);
        var include = string.Equals(req.Query["include"], "subCategories", StringComparison.OrdinalIgnoreCase);

        var items = await reader.GetCategoriesAsync(locale, include);
        return new OkObjectResult(ApiResponse.Ok(items.Select(c => WithAutoStats(c)).ToArray()));
    }

    /// <summary>GET /categories/{slug} —— 分類落地頁內容</summary>
    public async Task<IActionResult> GetCategoryAsync(HttpRequest req, string slug)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var item   = await reader.GetCategoryAsync(slug, locale);

        return item is null
            ? new NotFoundObjectResult(ApiResponse.Fail("Category not found.", $"No category '{slug}' in locale '{locale}'."))
            : new OkObjectResult(ApiResponse.Ok(WithAutoStats(item)));
    }

    /// <summary>GET /sub-categories?locale=&amp;category=</summary>
    public async Task<IActionResult> GetSubCategoriesAsync(HttpRequest req)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var items  = await reader.GetSubCategoriesAsync(locale, ProductHandler.Nullable(req.Query["category"]));
        return new OkObjectResult(ApiResponse.Ok(items));
    }

    /// <summary>
    /// GET /sub-categories/{category}/{sub} —— 子分類落地頁內容。
    /// 與產品詳情同樣驗證兩段歸屬，不符即 404。
    /// </summary>
    public async Task<IActionResult> GetSubCategoryAsync(HttpRequest req, string category, string sub)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var item   = await reader.GetSubCategoryAsync(category, sub, locale);

        return item is null
            ? new NotFoundObjectResult(ApiResponse.Fail("Sub-category not found.",
                  $"No sub-category '{category}/{sub}' in locale '{locale}'."))
            : new OkObjectResult(ApiResponse.Ok(WithAutoStats(item)));
    }

    /// <summary>GET /certifications?locale=</summary>
    public async Task<IActionResult> GetCertificationsAsync(HttpRequest req)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var items  = await reader.GetCertificationsAsync(locale);
        return new OkObjectResult(ApiResponse.Ok(items));
    }

    /// <summary>
    /// docs/04-api.md §4：<c>stats[].value</c> 為 <c>"auto"</c> 時由 API 代入實際產品數。
    /// 「產品數」是**不重複**的已發布產品數（<see cref="Models.Dtos.CategoryDto.ProductCount"/>）。
    /// 早期取子分類 count 的總和，但產品可同時掛多個子分類之後，總和會重複計算。
    /// </summary>
    private static Models.Dtos.CategoryDto WithAutoStats(Models.Dtos.CategoryDto c) =>
        c with { Stats = JsonField.SubstituteAutoStats(c.Stats as System.Text.Json.Nodes.JsonNode,
                                                  c.ProductCount) };
}
