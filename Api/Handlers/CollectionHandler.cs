using EuniceMed.Api.Common;
using EuniceMed.Api.Services.Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EuniceMed.Api.Handlers;

/// <summary>產品系列（Care / Protect / Advance）。公開唯讀。</summary>
public sealed class CollectionHandler(ICollectionReadService reader)
{
    /// <summary>GET /collections?locale=en → 依 SortOrder 回傳全部系列</summary>
    public async Task<IActionResult> GetAllAsync(HttpRequest req)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var items  = await reader.GetAllAsync(locale);
        return new OkObjectResult(ApiResponse.Ok(items));
    }

    /// <summary>GET /collections/{slug}?locale=en → 單一系列</summary>
    public async Task<IActionResult> GetBySlugAsync(HttpRequest req, string slug)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var item   = await reader.GetBySlugAsync(slug, locale);

        // 缺該語系翻譯時一併回 404 —— 語言純度原則，不 fallback 露出他語
        return item is null
            ? new NotFoundObjectResult(ApiResponse.Fail("Collection not found.", $"No collection '{slug}' in locale '{locale}'."))
            : new OkObjectResult(ApiResponse.Ok(item));
    }
}
