using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Dtos;
using EuniceMed.Api.Services.Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EuniceMed.Api.Handlers;

/// <summary>FAQ / 下載中心 / 銷售據點的公開端點。</summary>
public sealed class ContentHandler(IContentReadService reader)
{
    /// <summary>
    /// GET /faqs?locale=&amp;category=&amp;facets=true
    ///
    /// <para>
    /// 不分頁：三個分類、預期數十筆，折疊面板本來就是一次全載。
    /// </para>
    /// </summary>
    public async Task<IActionResult> GetFaqsAsync(HttpRequest req)
    {
        var locale   = Locales.Normalize(req.Query["locale"]);
        var category = ProductHandler.Nullable(req.Query["category"]);

        var items = await reader.GetFaqsAsync(locale, category);

        Dictionary<string, FacetCount[]>? facets = null;
        if (string.Equals(req.Query["facets"], "true", StringComparison.OrdinalIgnoreCase))
            facets = new Dictionary<string, FacetCount[]>
            {
                ["categories"] = [.. await reader.GetFaqCategoriesAsync(locale)],
            };

        return new OkObjectResult(ApiResponse.Ok(
            new FacetedResult<FaqDto>(items, items.Count, 1, items.Count, 1, facets)));
    }

    /// <summary>GET /faq-categories?locale=</summary>
    public async Task<IActionResult> GetFaqCategoriesAsync(HttpRequest req)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var items  = await reader.GetFaqCategoriesAsync(locale);
        return new OkObjectResult(ApiResponse.Ok(items));
    }

    /// <summary>GET /downloads?locale=&amp;type=catalog|manual|certificate&amp;productSlug=&amp;facets=true</summary>
    public async Task<IActionResult> GetDownloadsAsync(HttpRequest req)
    {
        var locale      = Locales.Normalize(req.Query["locale"]);
        var type        = ContentReadService.ParseType(ProductHandler.Nullable(req.Query["type"]));
        var productSlug = ProductHandler.Nullable(req.Query["productSlug"]);

        var items = await reader.GetDownloadsAsync(locale, type, productSlug);

        Dictionary<string, FacetCount[]>? facets = null;
        if (string.Equals(req.Query["facets"], "true", StringComparison.OrdinalIgnoreCase))
            facets = new Dictionary<string, FacetCount[]>
            {
                ["types"] = [.. await reader.GetDownloadFacetsAsync(locale, productSlug)],
            };

        return new OkObjectResult(ApiResponse.Ok(
            new FacetedResult<DownloadDto>(items, items.Count, 1, items.Count, 1, facets)));
    }

    /// <summary>
    /// GET /sales-locations?locale=
    ///
    /// <para>
    /// 回傳已分好的 <c>{domestic, international[]}</c> 而非平坦清單 ——
    /// 頁面就是這兩塊，分組規則（未填 region 者集中在最後）留在伺服器端，
    /// 才不會兩個語系的前端各實作一次而分歧。
    /// </para>
    /// </summary>
    public async Task<IActionResult> GetSalesLocationsAsync(HttpRequest req)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var result = await reader.GetSalesLocationsAsync(locale);
        return new OkObjectResult(ApiResponse.Ok(result));
    }
}
