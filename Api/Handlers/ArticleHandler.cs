using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Dtos;
using EuniceMed.Api.Models.Entities;
using EuniceMed.Api.Services;
using EuniceMed.Api.Services.Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EuniceMed.Api.Handlers;

/// <summary>
/// News 與 Insights 的公開端點。兩者是同一個 <see cref="Article"/> 實體，
/// 以 <c>Type</c> 分流，因此共用同一支 handler（docs/04-api.md §4「文章」）。
/// </summary>
public sealed class ArticleHandler(IArticleReadService reader)
{
    public Task<IActionResult> GetNewsListAsync(HttpRequest req)     => ListAsync(req, ArticleType.News);
    public Task<IActionResult> GetInsightsListAsync(HttpRequest req) => ListAsync(req, ArticleType.Insight);

    public Task<IActionResult> GetNewsAsync(HttpRequest req, string slug)     => DetailAsync(req, ArticleType.News, slug);
    public Task<IActionResult> GetInsightAsync(HttpRequest req, string slug)  => DetailAsync(req, ArticleType.Insight, slug);

    /// <summary>GET /news|/insights?locale=&amp;category=&amp;tag=&amp;facets=&amp;page=&amp;pageSize=</summary>
    private async Task<IActionResult> ListAsync(HttpRequest req, byte type)
    {
        var locale   = Locales.Normalize(req.Query["locale"]);
        var category = ProductHandler.Nullable(req.Query["category"]);
        var tag      = ProductHandler.Nullable(req.Query["tag"]);
        var (page, pageSize) = ProductHandler.Paging(req);

        var (items, total) = await reader.GetListAsync(type, locale, category, tag, page, pageSize);

        Dictionary<string, FacetCount[]>? facets = null;
        if (string.Equals(req.Query["facets"], "true", StringComparison.OrdinalIgnoreCase))
            facets = new Dictionary<string, FacetCount[]>
            {
                ["categories"] = [.. await reader.GetCategoryFacetsAsync(type, locale, tag)],
            };

        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        return new OkObjectResult(ApiResponse.Ok(
            new FacetedResult<ArticleListItemDto>(items, total, page, pageSize, totalPages, facets)));
    }

    /// <summary>GET /article-categories?locale=&amp;kind=news|insight</summary>
    public async Task<IActionResult> GetCategoriesAsync(HttpRequest req)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var kind   = ProductHandler.Nullable(req.Query["kind"])?.ToLowerInvariant() switch
        {
            "news"    => (byte?)ArticleType.News,
            "insight" => ArticleType.Insight,
            _         => null,
        };

        var items = await reader.GetCategoriesAsync(kind, locale);
        return new OkObjectResult(ApiResponse.Ok(items));
    }

    private async Task<IActionResult> DetailAsync(HttpRequest req, byte type, string slug)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var r      = await reader.GetAsync(type, slug, locale);

        if (r is null)
            return new NotFoundObjectResult(ApiResponse.Fail(
                "Article not found.", $"No published article '{slug}' in locale '{locale}'."));

        // TOC 與內文一起產生：TocBuilder 會回填 anchor id，只取 toc 而丟掉 Html
        // 的話前端點目錄會跳到不存在的錨點。
        var toc = TocBuilder.Build(r.Body);

        var tags     = await reader.GetTagsAsync(r.Id, locale);
        var related  = await reader.GetRelatedAsync(r, locale, take: 3);

        // event / gallery / prev / next 僅 News 有意義（docs/04 §4）。
        // Insights 不查這幾筆，省下三趟往返。
        var isNews   = type == ArticleType.News;
        var evt      = isNews ? await reader.GetEventAsync(r.Id, locale)  : null;
        var gallery  = isNews ? await reader.GetGalleryAsync(r.Id)        : [];
        var (prev, next) = isNews ? await reader.GetNeighboursAsync(r, locale) : (null, null);

        var dto = new ArticleDto(
            r.Slug, ArticleReadService.TypeName(r.Type),
            r.CategorySlug is null ? null : new SlugName(r.CategorySlug, r.CategoryName ?? r.CategorySlug),
            r.Title, r.Standfirst, r.Excerpt, r.PublishedAt, r.AuthorName, r.ReadMinutes,
            r.CoverUrl is null ? null : new MediaRefDto(r.CoverUrl, r.CoverAlt),
            toc.Html, toc.Toc,
            [.. tags], r.Disclaimer, [.. gallery],
            evt, prev, next, [.. related],
            new SeoDto(r.SeoTitle, r.SeoDescription, r.CoverUrl));

        return new OkObjectResult(ApiResponse.Ok(dto));
    }
}
