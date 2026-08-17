using System.Text.Json.Nodes;
using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Dtos;
using EuniceMed.Api.Services.Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EuniceMed.Api.Handlers;

/// <summary>應用方案的公開端點（docs/04-api.md §4「應用方案」）。</summary>
public sealed class ApplicationHandler(
    IApplicationReadService reader,
    ICollectionReadService  collections)
{
    /// <summary>GET /applications?locale=&amp;type=body-part|special-care</summary>
    public async Task<IActionResult> GetListAsync(HttpRequest req)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var type   = ApplicationReadService.ParseType(ProductHandler.Nullable(req.Query["type"]));

        var items = await reader.GetListAsync(locale, type);
        return new OkObjectResult(ApiResponse.Ok(items));
    }

    /// <summary>
    /// GET /applications/body-map?locale= —— 人體圖專用，只回 <c>ShowOnBodyMap=1</c> 的項目。
    /// 獨立端點而非在列表加參數：首頁與應用方案首頁都只需要這一小塊，
    /// 帶著 lead / 圖片 / SEO 一起傳是白費頻寬。
    /// </summary>
    public async Task<IActionResult> GetBodyMapAsync(HttpRequest req)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var items  = await reader.GetBodyMapAsync(locale);
        return new OkObjectResult(ApiResponse.Ok(items));
    }

    /// <summary>GET /applications/{slug}?locale=</summary>
    public async Task<IActionResult> GetBySlugAsync(HttpRequest req, string slug)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var r      = await reader.GetAsync(slug, locale);

        if (r is null)
            return new NotFoundObjectResult(ApiResponse.Fail(
                "Application not found.", $"No published application '{slug}' in locale '{locale}'."));

        var products = await reader.GetRecommendedProductsAsync(r.Id, locale, take: 6);
        var related  = await reader.GetSiblingsAsync(r.Id, r.Type, locale);

        var dto = new ApplicationDto(
            r.Slug, ApplicationReadService.TypeName(r.Type), r.Name, r.Lead, r.Body,
            r.HeroUrl is null ? null : new MediaRefDto(r.HeroUrl, r.HeroAlt),
            JsonField.SubstituteAutoStats(JsonField.Parse(r.StatsJson), r.ProductCount),
            JsonField.Parse(r.ConcernsJson),
            await ResolveSupportLevelsAsync(r.SupportLevelsJson, locale),
            [.. products],
            JsonField.Parse(r.HowToJson),
            r.FittingUrl is null ? null : new MediaRefDto(r.FittingUrl, r.FittingAlt),
            r.Disclaimer,
            [.. related],
            new SeoDto(r.SeoTitle, r.SeoDescription, null));

        return new OkObjectResult(ApiResponse.Ok(dto));
    }

    /// <summary>
    /// 儲存的是 <c>collectionSlug</c>，回傳的是 <c>collection: {slug, name}</c>。
    ///
    /// <para>
    /// 名稱在此處代入而非讓編輯者填：系列只有三個且名稱多語系，
    /// 存成文字會讓「Care」在中文站也是「Care」，或反過來需要編輯者
    /// 在每個應用方案重打一次三個系列名稱。
    /// </para>
    /// <para>
    /// 找不到對應系列時**整項保留但 collection 為 null** —— 隱藏整個支撐強度卡
    /// 會讓頁面少一塊卻沒有任何訊息，比留白難查得多。
    /// </para>
    /// </summary>
    private async Task<object?> ResolveSupportLevelsAsync(string? json, string locale)
    {
        if (JsonField.Parse(json) is not JsonNode node) return null;
        if (node is not JsonArray arr) return node;

        var names = (await collections.GetAllAsync(locale))
            .ToDictionary(c => c.Slug, c => c.Name, StringComparer.OrdinalIgnoreCase);

        foreach (var item in arr.OfType<JsonObject>())
        {
            if (item["collectionSlug"]?.GetValue<string>() is not { } slug) continue;

            item.Remove("collectionSlug");
            item["collection"] = names.TryGetValue(slug, out var name)
                ? new JsonObject { ["slug"] = slug, ["name"] = name }
                : null;
        }

        return arr;
    }
}
