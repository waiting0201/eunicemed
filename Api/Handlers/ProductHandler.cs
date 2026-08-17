using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Dtos;
using EuniceMed.Api.Services.Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EuniceMed.Api.Handlers;

/// <summary>產品公開端點。後台 CRUD 於後續補上。</summary>
public sealed class ProductHandler(
    IProductReadService reader,
    ITaxonomyReadService taxonomy,
    Data.AppDbContext db)
{
    /// <summary>
    /// GET /products?locale=&amp;category=&amp;subCategory=&amp;collection=&amp;bodyPart=
    ///              &amp;featured=&amp;facets=&amp;page=&amp;pageSize=&amp;sort=
    /// </summary>
    public async Task<IActionResult> GetListAsync(HttpRequest req)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        var filter = new ProductFilter(
            Nullable(req.Query["category"]),
            Nullable(req.Query["subCategory"]),
            Nullable(req.Query["collection"]),
            Nullable(req.Query["bodyPart"]));

        bool? featured = req.Query.ContainsKey("featured")
            ? string.Equals(req.Query["featured"], "true", StringComparison.OrdinalIgnoreCase)
            : null;

        var (page, pageSize) = Paging(req);
        var sort = Nullable(req.Query["sort"]);

        var (items, total) = await reader.GetListAsync(filter, locale, featured, sort, page, pageSize);

        Dictionary<string, FacetCount[]>? facets = null;
        if (string.Equals(req.Query["facets"], "true", StringComparison.OrdinalIgnoreCase))
        {
            var rows   = await reader.GetFacetRowsAsync(locale);
            var labels = await taxonomy.GetFacetLabelsAsync(locale);
            facets = FacetFolder.Compute(rows, filter,
                labels.Categories, labels.SubCategories, labels.Collections, labels.BodyParts);
        }

        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        return new OkObjectResult(ApiResponse.Ok(
            new FacetedResult<ProductListItemDto>(items, total, page, pageSize, totalPages, facets)));
    }

    /// <summary>
    /// GET /products/{category}/{sub}/{slug}
    ///
    /// <para>
    /// 三段皆驗證歸屬，任一段不符即 404。**不做寬鬆比對** —— 若只認 slug，
    /// 同一個產品會有多個可索引 URL，等於自己製造重複內容（docs/04 §4）。
    /// </para>
    /// </summary>
    public Task<IActionResult> GetByPathAsync(HttpRequest req, string category, string sub, string slug)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        return DetailAsync(() => reader.GetByPathAsync(category, sub, slug, locale), locale, slug);
    }

    /// <summary>GET /products/by-slug/{slug} —— 扁平查詢，供預覽與舊 URL 301 解析。</summary>
    public Task<IActionResult> GetBySlugAsync(HttpRequest req, string slug)
    {
        var locale = Locales.Normalize(req.Query["locale"]);
        return DetailAsync(() => reader.GetBySlugAsync(slug, locale), locale, slug);
    }

    private async Task<IActionResult> DetailAsync(Func<Task<ProductRow?>> load, string locale, string slug)
    {
        var r = await load();
        if (r is null)
            return new NotFoundObjectResult(ApiResponse.Fail(
                "Product not found.", $"No published product '{slug}' in locale '{locale}'."));

        var certs   = await taxonomy.GetCertificationsAsync(locale);
        var related = await reader.GetRelatedAsync(r.Id, locale, take: 4);

        var dto = new ProductDto(
            r.Id, r.Slug, r.Sku, r.Name,
            Pair(r.CategorySlug, r.CategoryName),
            Pair(r.SubCategorySlug, r.SubCategoryName),
            Pair(r.CollectionSlug, r.CollectionName),
            [],                                   // bodyParts 由詳情查詢補（見下方 TODO）
            JsonField.Parse(r.ConditionsJson),
            r.Summary, r.Description,
            [],                                   // images 同上
            JsonField.Parse(r.FeaturesJson),
            r.UseCaseImageUrl is null ? null : new MediaRefDto(r.UseCaseImageUrl, null),
            JsonField.Parse(r.UseCasesJson),
            JsonField.Parse(r.SpecsJson),
            JsonField.Parse(r.SizeChartJson),
            certs.ToArray(),
            related.Select(p => new ProductRelatedDto(p.Slug, p.Name, p.Image, p.Url)).ToArray(),
            new SeoDto(r.SeoTitle, r.SeoDescription, r.OgImageUrl),
            r.PublishedAt);

        return new OkObjectResult(ApiResponse.Ok(dto));
    }

    // ── 後台：舊站資料匯入 ─────────────────────────────────────────────────

    /// <summary>
    /// POST /admin/products/import —— 由 <c>reference/legacy/products.json</c> 匯入 149 筆。
    /// Admin 專屬（由 AppRouter 把關）。冪等：以 SKU 為業務鍵 upsert。
    /// </summary>
    public async Task<IActionResult> ImportLegacyAsync(HttpRequest req)
    {
        var path = ProductHandler.Nullable(req.Query["path"]) ?? FindLegacyFile();

        if (path is null || !File.Exists(path))
            throw AppException.BadRequest(
                "找不到 reference/legacy/products.json。本機請確認檔案存在；" +
                "正式環境該目錄不會部署，需以 ?path= 指定或改由本機執行。");

        var report = await Data.Seed.LegacyProductImporter.RunAsync(db, path, req.HttpContext.RequestAborted);

        return new OkObjectResult(ApiResponse.Ok(report,
            $"匯入完成：新增 {report.Created}、更新 {report.Updated}、略過 {report.Skipped}。"));
    }

    /// <summary>
    /// 從執行目錄逐層往上找 <c>reference/legacy/products.json</c>。
    /// <c>func start</c> 的工作目錄是 <c>Api/bin/Debug/net10.0</c>，
    /// 直接用相對路徑會指到錯的地方。
    /// </summary>
    private static string? FindLegacyFile()
    {
        const string relative = "reference/legacy/products.json";

        foreach (var start in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
        {
            var dir = new DirectoryInfo(start);
            while (dir is not null)
            {
                var candidate = Path.Combine(dir.FullName, relative);
                if (File.Exists(candidate)) return candidate;
                dir = dir.Parent;
            }
        }

        return null;
    }

    // ── 共用 ───────────────────────────────────────────────────────────────

    internal static (int Page, int PageSize) Paging(HttpRequest req)
    {
        var page     = int.TryParse(req.Query["page"], out var p) ? Math.Max(1, p) : 1;
        var pageSize = int.TryParse(req.Query["pageSize"], out var ps) ? Math.Clamp(ps, 1, 100) : 20;
        return (page, pageSize);
    }

    internal static string? Nullable(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    private static SlugName? Pair(string? slug, string? name) =>
        slug is null ? null : new SlugName(slug, name ?? slug);
}
