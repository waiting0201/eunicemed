using EuniceMed.Api.Common;
using EuniceMed.Api.Data;
using EuniceMed.Api.Models.Dtos;
using EuniceMed.Api.Models.Entities;
using EuniceMed.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EuniceMed.Api.Handlers;

/// <summary>
/// 後台 FAQ / FAQ 分類 / 下載 / 銷售據點。公開端點在 <see cref="ContentHandler"/>。
///
/// <para>
/// 這四個模組都沒有 <c>IsDeleted</c>，所以 DELETE 一律是硬刪，
/// 且照全站規則**先擋引用回 409**（FAQ 分類底下有題目、下載仍掛在產品上）。
/// </para>
/// </summary>
public sealed class AdminContentHandler(
    AppDbContext     db,
    MediaUsageWriter mediaUsage,
    HtmlSanitizers   sanitizers)
{
    // ── FAQ 分類 ───────────────────────────────────────────────────────────

    public async Task<IActionResult> GetFaqCategoriesAsync()
    {
        var rows   = await db.FaqCategories.Include(c => c.Translations).OrderBy(c => c.SortOrder).ToListAsync();
        var counts = await db.Faqs.GroupBy(f => f.FaqCategoryId)
                                  .Select(g => new { g.Key, Count = g.Count() })
                                  .ToDictionaryAsync(x => x.Key, x => x.Count);

        return new OkObjectResult(ApiResponse.Ok(
            rows.Select(c => ToDto(c, counts.GetValueOrDefault(c.Id))).ToArray()));
    }

    public async Task<IActionResult> GetFaqCategoryAsync(string id)
    {
        var entity = await LoadFaqCategoryAsync(AdminWrite.ParseId(id, "faq category"));
        return new OkObjectResult(ApiResponse.Ok(
            ToDto(entity, await db.Faqs.CountAsync(f => f.FaqCategoryId == entity.Id))));
    }

    public async Task<IActionResult> CreateFaqCategoryAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpsertFaqCategoryRequest>(req);

        if (string.IsNullOrWhiteSpace(body.Slug))
            throw AppException.BadRequest("slug 為必填。");
        if (body.Translations is null || body.Translations.Count == 0)
            throw AppException.BadRequest("至少要有一個語系的翻譯。");

        var slug = Slugify.Make(body.Slug.Trim());
        if (await db.FaqCategories.AnyAsync(c => c.Slug == slug))
            throw AppException.Conflict($"Slug '{slug}' 已被使用。");

        var entity = new FaqCategory
        {
            Slug      = slug,
            SortOrder = body.SortOrder ?? 0,
            Status    = body.Status ?? ContentStatus.Published,
        };
        ApplyFaqCategoryTranslations(entity, body.Translations);

        db.FaqCategories.Add(entity);
        await db.SaveChangesAsync();

        return new ObjectResult(ApiResponse.Ok(ToDto(entity, 0), "FAQ 分類已建立。")) { StatusCode = 201 };
    }

    public async Task<IActionResult> UpdateFaqCategoryAsync(HttpRequest req, string id)
    {
        var body   = await AdminWrite.ReadAsync<UpsertFaqCategoryRequest>(req);
        var entity = await LoadFaqCategoryAsync(AdminWrite.ParseId(id, "faq category"));

        if (!string.IsNullOrWhiteSpace(body.Slug))
        {
            var slug = Slugify.Make(body.Slug.Trim());
            if (slug != entity.Slug && await db.FaqCategories.AnyAsync(c => c.Slug == slug))
                throw AppException.Conflict($"Slug '{slug}' 已被使用。");
            entity.Slug = slug;
        }

        if (body.SortOrder is { } sortOrder) entity.SortOrder = sortOrder;
        if (body.Status    is { } status)    entity.Status    = status;

        ApplyFaqCategoryTranslations(entity, body.Translations);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(
            ToDto(entity, await db.Faqs.CountAsync(f => f.FaqCategoryId == entity.Id)), "FAQ 分類已更新。"));
    }

    public async Task<IActionResult> DeleteFaqCategoryAsync(string id)
    {
        var guid   = AdminWrite.ParseId(id, "faq category");
        var entity = await db.FaqCategories.FirstOrDefaultAsync(c => c.Id == guid)
            ?? throw AppException.NotFound("FaqCategory");

        var faqs = await db.Faqs.CountAsync(f => f.FaqCategoryId == guid);
        if (faqs > 0)
            throw AppException.Conflict($"分類底下仍有 {faqs} 則 FAQ，請先搬移或刪除再刪分類。");

        db.FaqCategories.Remove(entity);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok($"FAQ 分類 '{entity.Slug}' 已刪除。"));
    }

    // ── FAQ ────────────────────────────────────────────────────────────────

    /// <summary>GET /admin/faqs?category=&amp;status=</summary>
    public async Task<IActionResult> GetFaqsAsync(HttpRequest req)
    {
        var q = db.Faqs.Include(f => f.Translations).Include(f => f.FaqCategory).AsQueryable();

        if (ProductHandler.Nullable(req.Query["category"]) is { } category)
            q = q.Where(f => f.FaqCategory!.Slug == category);

        if (ProductHandler.Nullable(req.Query["status"]) is { } rawStatus)
        {
            var status = AdminWrite.ParseStatus(rawStatus);
            q = q.Where(f => f.Status == status);
        }

        var rows = await q.OrderBy(f => f.FaqCategory!.SortOrder).ThenBy(f => f.SortOrder).ToListAsync();
        return new OkObjectResult(ApiResponse.Ok(rows.Select(ToDto).ToArray()));
    }

    public async Task<IActionResult> GetFaqAsync(string id)
    {
        var entity = await LoadFaqAsync(AdminWrite.ParseId(id, "faq"));
        return new OkObjectResult(ApiResponse.Ok(ToDto(entity)));
    }

    public async Task<IActionResult> CreateFaqAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpsertFaqRequest>(req);

        if (body.FaqCategoryId is not { } categoryId)
            throw AppException.BadRequest("faqCategoryId 為必填。");
        if (body.Translations is null || body.Translations.Count == 0)
            throw AppException.BadRequest("至少要有一個語系的翻譯。");

        if (!await db.FaqCategories.AnyAsync(c => c.Id == categoryId))
            throw AppException.BadRequest($"FAQ 分類 {categoryId} 不存在。");

        var now = Clock.Now;
        var entity = new Faq
        {
            FaqCategoryId = categoryId,
            Status        = body.Status ?? ContentStatus.Published,
            SortOrder     = body.SortOrder ?? 0,
            CreatedAt     = now,
            UpdatedAt     = now,
        };
        ApplyFaqTranslations(entity, body.Translations);

        db.Faqs.Add(entity);
        await db.SaveChangesAsync();

        return new ObjectResult(ApiResponse.Ok(ToDto(entity), "FAQ 已建立。")) { StatusCode = 201 };
    }

    public async Task<IActionResult> UpdateFaqAsync(HttpRequest req, string id)
    {
        var body   = await AdminWrite.ReadAsync<UpsertFaqRequest>(req);
        var entity = await LoadFaqAsync(AdminWrite.ParseId(id, "faq"));

        if (body.FaqCategoryId is { } categoryId && categoryId != entity.FaqCategoryId)
        {
            if (!await db.FaqCategories.AnyAsync(c => c.Id == categoryId))
                throw AppException.BadRequest($"FAQ 分類 {categoryId} 不存在。");
            entity.FaqCategoryId = categoryId;
        }

        if (body.Status    is { } status)    entity.Status    = status;
        if (body.SortOrder is { } sortOrder) entity.SortOrder = sortOrder;

        ApplyFaqTranslations(entity, body.Translations);
        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(ToDto(entity), "FAQ 已更新。"));
    }

    public async Task<IActionResult> DeleteFaqAsync(string id)
    {
        var guid   = AdminWrite.ParseId(id, "faq");
        var entity = await db.Faqs.FirstOrDefaultAsync(f => f.Id == guid) ?? throw AppException.NotFound("Faq");

        db.Faqs.Remove(entity);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok("FAQ 已刪除。"));
    }

    // ── 下載 ───────────────────────────────────────────────────────────────

    /// <summary>GET /admin/downloads?type=&amp;status=&amp;fileLocale=</summary>
    public async Task<IActionResult> GetDownloadsAsync(HttpRequest req)
    {
        var q = db.Downloads.Include(d => d.Translations).AsQueryable();

        if (ProductHandler.Nullable(req.Query["type"]) is { } rawType)
        {
            var type = ParseDownloadType(rawType);
            q = q.Where(d => d.Type == type);
        }

        if (ProductHandler.Nullable(req.Query["status"]) is { } rawStatus)
        {
            var status = AdminWrite.ParseStatus(rawStatus);
            q = q.Where(d => d.Status == status);
        }

        if (ProductHandler.Nullable(req.Query["fileLocale"]) is { } fileLocale)
            q = q.Where(d => d.FileLocale == fileLocale);

        var rows = await q.OrderBy(d => d.SortOrder).ToListAsync();
        return new OkObjectResult(ApiResponse.Ok(await ToDtosAsync(rows)));
    }

    public async Task<IActionResult> GetDownloadAsync(string id)
    {
        var entity = await LoadDownloadAsync(AdminWrite.ParseId(id, "download"));
        return new OkObjectResult(ApiResponse.Ok((await ToDtosAsync([entity]))[0]));
    }

    public async Task<IActionResult> CreateDownloadAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpsertDownloadRequest>(req);

        if (body.MediaId is not { } mediaId)
            throw AppException.BadRequest("mediaId 為必填（PDF 走 /admin/uploads/sas 直傳後取得）。");
        if (body.Translations is null || body.Translations.Count == 0)
            throw AppException.BadRequest("至少要有一個語系的翻譯。");

        await AdminWrite.EnsureMediaExistsAsync(db, mediaId);

        var entity = new Download
        {
            MediaId    = mediaId,
            Type       = body.Type ?? DownloadType.Catalog,
            FileLocale = NormalizeFileLocale(body.FileLocale),
            Status     = body.Status ?? ContentStatus.Published,
            SortOrder  = body.SortOrder ?? 0,
            CreatedAt  = Clock.Now,
        };
        ApplyDownloadTranslations(entity, body.Translations);

        db.Downloads.Add(entity);
        await db.SaveChangesAsync();

        if (body.ProductIds is { } products) await ApplyDownloadProductsAsync(entity.Id, products);
        await RebuildDownloadUsageAsync(entity);

        return new ObjectResult(ApiResponse.Ok((await ToDtosAsync([entity]))[0], "下載項目已建立。")) { StatusCode = 201 };
    }

    public async Task<IActionResult> UpdateDownloadAsync(HttpRequest req, string id)
    {
        var body   = await AdminWrite.ReadAsync<UpsertDownloadRequest>(req);
        var entity = await LoadDownloadAsync(AdminWrite.ParseId(id, "download"));

        if (body.MediaId is { } mediaId)
        {
            await AdminWrite.EnsureMediaExistsAsync(db, mediaId);
            entity.MediaId = mediaId;
        }

        if (body.Type       is { } type)       entity.Type       = type;
        if (body.FileLocale is not null)       entity.FileLocale = NormalizeFileLocale(body.FileLocale);
        if (body.Status     is { } status)     entity.Status     = status;
        if (body.SortOrder  is { } sortOrder)  entity.SortOrder  = sortOrder;

        ApplyDownloadTranslations(entity, body.Translations);
        await db.SaveChangesAsync();

        if (body.ProductIds is { } products) await ApplyDownloadProductsAsync(entity.Id, products);
        await RebuildDownloadUsageAsync(entity);

        return new OkObjectResult(ApiResponse.Ok((await ToDtosAsync([entity]))[0], "下載項目已更新。"));
    }

    public async Task<IActionResult> DeleteDownloadAsync(string id)
    {
        var guid   = AdminWrite.ParseId(id, "download");
        var entity = await db.Downloads.FirstOrDefaultAsync(d => d.Id == guid)
            ?? throw AppException.NotFound("Download");

        var products = await db.ProductDownloads.CountAsync(pd => pd.DownloadId == guid);
        if (products > 0)
            throw AppException.Conflict($"此檔案仍掛在 {products} 筆產品上，請先取消掛載再刪除。");

        // 認證的可下載文件也指到這裡（Certification.DownloadId 刻意不設 FK，見 docs/05 §3.3），
        // 所以要自己查一次，否則認證會留下指向不存在檔案的欄位。
        var certs = await db.Certifications.CountAsync(c => c.DownloadId == guid);
        if (certs > 0)
            throw AppException.Conflict($"此檔案仍被 {certs} 筆認證引用，請先改掉引用再刪除。");

        db.Downloads.Remove(entity);
        await db.SaveChangesAsync();
        await mediaUsage.RebuildAsync(nameof(Download), guid, []);

        return new OkObjectResult(ApiResponse.Ok("下載項目已刪除。"));
    }

    // ── 銷售據點 ───────────────────────────────────────────────────────────

    /// <summary>GET /admin/sales-locations?type=&amp;country=&amp;status=</summary>
    public async Task<IActionResult> GetSalesLocationsAsync(HttpRequest req)
    {
        var q = db.SalesLocations.Include(l => l.Translations).AsQueryable();

        if (ProductHandler.Nullable(req.Query["type"]) is { } rawType)
        {
            var type = ParseLocationType(rawType);
            q = q.Where(l => l.LocationType == type);
        }

        if (ProductHandler.Nullable(req.Query["country"]) is { } country)
        {
            var code = country.ToUpperInvariant();
            q = q.Where(l => l.CountryCode == code);
        }

        if (ProductHandler.Nullable(req.Query["status"]) is { } rawStatus)
        {
            var status = AdminWrite.ParseStatus(rawStatus);
            q = q.Where(l => l.Status == status);
        }

        var rows = await q.OrderBy(l => l.LocationType).ThenBy(l => l.SortOrder).ToListAsync();
        return new OkObjectResult(ApiResponse.Ok(rows.Select(ToDto).ToArray()));
    }

    public async Task<IActionResult> GetSalesLocationAsync(string id)
    {
        var entity = await LoadSalesLocationAsync(AdminWrite.ParseId(id, "sales location"));
        return new OkObjectResult(ApiResponse.Ok(ToDto(entity)));
    }

    public async Task<IActionResult> CreateSalesLocationAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpsertSalesLocationRequest>(req);

        if (body.Translations is null || body.Translations.Count == 0)
            throw AppException.BadRequest("至少要有一個語系的翻譯。");

        var now = Clock.Now;
        var entity = new SalesLocation
        {
            LocationType = body.LocationType ?? SalesLocationType.Domestic,
            CountryCode  = NormalizeCountry(body.CountryCode),
            WebsiteUrl   = ProductHandler.Nullable(body.WebsiteUrl),
            Phone        = ProductHandler.Nullable(body.Phone),
            Status       = body.Status ?? ContentStatus.Published,
            SortOrder    = body.SortOrder ?? 0,
            CreatedAt    = now,
            UpdatedAt    = now,
        };
        ApplySalesLocationTranslations(entity, body.Translations);

        db.SalesLocations.Add(entity);
        await db.SaveChangesAsync();

        return new ObjectResult(ApiResponse.Ok(ToDto(entity), "銷售據點已建立。")) { StatusCode = 201 };
    }

    public async Task<IActionResult> UpdateSalesLocationAsync(HttpRequest req, string id)
    {
        var body   = await AdminWrite.ReadAsync<UpsertSalesLocationRequest>(req);
        var entity = await LoadSalesLocationAsync(AdminWrite.ParseId(id, "sales location"));

        if (body.LocationType is { } type)   entity.LocationType = type;
        if (body.CountryCode  is not null)   entity.CountryCode  = NormalizeCountry(body.CountryCode);
        if (body.Status       is { } status) entity.Status       = status;
        if (body.SortOrder    is { } order)  entity.SortOrder    = order;

        if (body.ClearWebsiteUrl)                   entity.WebsiteUrl = null;
        else if (body.WebsiteUrl is not null)       entity.WebsiteUrl = ProductHandler.Nullable(body.WebsiteUrl);

        if (body.ClearPhone)                        entity.Phone      = null;
        else if (body.Phone is not null)            entity.Phone      = ProductHandler.Nullable(body.Phone);

        ApplySalesLocationTranslations(entity, body.Translations);
        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(ToDto(entity), "銷售據點已更新。"));
    }

    public async Task<IActionResult> DeleteSalesLocationAsync(string id)
    {
        var guid   = AdminWrite.ParseId(id, "sales location");
        var entity = await db.SalesLocations.FirstOrDefaultAsync(l => l.Id == guid)
            ?? throw AppException.NotFound("SalesLocation");

        db.SalesLocations.Remove(entity);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok("銷售據點已刪除。"));
    }

    // ── 內部：載入 ─────────────────────────────────────────────────────────

    private async Task<FaqCategory> LoadFaqCategoryAsync(Guid id) =>
        await db.FaqCategories.Include(c => c.Translations).FirstOrDefaultAsync(c => c.Id == id)
        ?? throw AppException.NotFound("FaqCategory");

    private async Task<Faq> LoadFaqAsync(Guid id) =>
        await db.Faqs.Include(f => f.Translations).Include(f => f.FaqCategory).FirstOrDefaultAsync(f => f.Id == id)
        ?? throw AppException.NotFound("Faq");

    private async Task<Download> LoadDownloadAsync(Guid id) =>
        await db.Downloads.Include(d => d.Translations).FirstOrDefaultAsync(d => d.Id == id)
        ?? throw AppException.NotFound("Download");

    private async Task<SalesLocation> LoadSalesLocationAsync(Guid id) =>
        await db.SalesLocations.Include(l => l.Translations).FirstOrDefaultAsync(l => l.Id == id)
        ?? throw AppException.NotFound("SalesLocation");

    // ── 內部：翻譯 ─────────────────────────────────────────────────────────

    private static void ApplyFaqCategoryTranslations(
        FaqCategory entity, Dictionary<string, FaqCategoryTranslationInput>? input)
    {
        if (input is null) return;

        foreach (var (rawLocale, value) in input)
        {
            var locale = AdminWrite.ValidLocale(rawLocale);
            if (string.IsNullOrWhiteSpace(value.Name))
                throw AppException.BadRequest($"語系 {locale} 的 name 為必填。");

            var tr = entity.Translations.FirstOrDefault(t => t.Locale == locale);
            if (tr is null)
            {
                tr = new FaqCategoryTranslation { Locale = locale };
                entity.Translations.Add(tr);
            }
            tr.Name = value.Name.Trim();
        }
    }

    private void ApplyFaqTranslations(Faq entity, Dictionary<string, FaqTranslationInput>? input)
    {
        if (input is null) return;

        foreach (var (rawLocale, value) in input)
        {
            var locale = AdminWrite.ValidLocale(rawLocale);
            if (string.IsNullOrWhiteSpace(value.Question))
                throw AppException.BadRequest($"語系 {locale} 的 question 為必填。");
            if (string.IsNullOrWhiteSpace(value.Answer))
                throw AppException.BadRequest($"語系 {locale} 的 answer 為必填。");

            var tr = entity.Translations.FirstOrDefault(t => t.Locale == locale);
            if (tr is null)
            {
                tr = new FaqTranslation { Locale = locale };
                entity.Translations.Add(tr);
            }

            tr.Question = value.Question.Trim();
            // 答案是折疊面板裡的一段短文，用 Section profile（p/strong/em/ul/ol/li/a）
            tr.Answer   = sanitizers.Sanitize(value.Answer, RichTextProfile.Section);

            // 淨化後整段空掉表示原文只有被剝掉的標籤（例如整段包在 script 裡）。
            // 讓它落地會變成前台一個點得開但空白的問答。
            if (string.IsNullOrWhiteSpace(tr.Answer))
                throw AppException.BadRequest($"語系 {locale} 的 answer 淨化後為空，請確認內容不是只有不允許的標籤。");
        }
    }

    private static void ApplyDownloadTranslations(
        Download entity, Dictionary<string, DownloadTranslationInput>? input)
    {
        if (input is null) return;

        foreach (var (rawLocale, value) in input)
        {
            var locale = AdminWrite.ValidLocale(rawLocale);
            if (string.IsNullOrWhiteSpace(value.Title))
                throw AppException.BadRequest($"語系 {locale} 的 title 為必填。");

            var tr = entity.Translations.FirstOrDefault(t => t.Locale == locale);
            if (tr is null)
            {
                tr = new DownloadTranslation { Locale = locale };
                entity.Translations.Add(tr);
            }

            tr.Title       = value.Title.Trim();
            tr.Description = value.Description;
        }
    }

    private static void ApplySalesLocationTranslations(
        SalesLocation entity, Dictionary<string, SalesLocationTranslationInput>? input)
    {
        if (input is null) return;

        foreach (var (rawLocale, value) in input)
        {
            var locale = AdminWrite.ValidLocale(rawLocale);
            if (string.IsNullOrWhiteSpace(value.Name))
                throw AppException.BadRequest($"語系 {locale} 的 name 為必填。");

            var tr = entity.Translations.FirstOrDefault(t => t.Locale == locale);
            if (tr is null)
            {
                tr = new SalesLocationTranslation { Locale = locale };
                entity.Translations.Add(tr);
            }

            tr.Name        = value.Name.Trim();
            tr.Address     = value.Address;
            tr.RegionLabel = value.RegionLabel;
            tr.Note        = value.Note;
        }
    }

    // ── 內部：其他 ─────────────────────────────────────────────────────────

    private async Task ApplyDownloadProductsAsync(Guid downloadId, Guid[] productIds)
    {
        var distinct = productIds.Distinct().ToArray();
        await AdminWrite.EnsureAllExistAsync(db.Products.Select(p => p.Id), distinct, "productId");

        await db.ProductDownloads.Where(pd => pd.DownloadId == downloadId).ExecuteDeleteAsync();

        foreach (var pid in distinct)
            db.ProductDownloads.Add(new ProductDownload { ProductId = pid, DownloadId = downloadId });

        await db.SaveChangesAsync();
    }

    private Task RebuildDownloadUsageAsync(Download d) =>
        mediaUsage.RebuildAsync(nameof(Download), d.Id, AdminWrite.MediaRefs(("file", d.MediaId)));

    private static byte ParseDownloadType(string raw) =>
        raw.ToLowerInvariant() switch
        {
            "catalog"     or "1" => DownloadType.Catalog,
            "manual"      or "2" => DownloadType.Manual,
            "certificate" or "3" => DownloadType.Certificate,
            _ => throw AppException.BadRequest($"未知的 type：{raw}（catalog / manual / certificate）。"),
        };

    private static byte ParseLocationType(string raw) =>
        raw.ToLowerInvariant() switch
        {
            "domestic"      or "1" => SalesLocationType.Domestic,
            "international" or "2" => SalesLocationType.International,
            _ => throw AppException.BadRequest($"未知的 type：{raw}（domestic / international）。"),
        };

    /// <summary>
    /// 檔案語言。**刻意不套 <c>Locales.Supported</c> 白名單** ——
    /// 它是檔案本身的語言（清單顯示 `EN · PDF`），可能有站台沒有的語系（如日文型錄），
    /// 與介面語系是兩件事（docs/05 §3.8）。
    /// </summary>
    private static string NormalizeFileLocale(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? Locales.Default : raw.Trim();

    private static string NormalizeCountry(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? "TW" : raw.Trim().ToUpperInvariant();

    // ── 對映 ───────────────────────────────────────────────────────────────

    private static AdminFaqCategoryDto ToDto(FaqCategory c, int faqCount) => new(
        c.Id, c.Slug, c.SortOrder, c.Status, faqCount,
        c.Translations.OrderBy(t => t.Locale)
                      .ToDictionary(t => t.Locale, t => new FaqCategoryTranslationInput(t.Name)));

    private static AdminFaqDto ToDto(Faq f) => new(
        f.Id, f.FaqCategoryId, f.FaqCategory?.Slug, f.Status, f.SortOrder,
        f.Translations.OrderBy(t => t.Locale)
                      .ToDictionary(t => t.Locale, t => new FaqTranslationInput(t.Question, t.Answer)),
        f.CreatedAt, f.UpdatedAt);

    /// <summary>下載的檔案網址與掛載產品都要另外查，所以整批處理避免 N+1。</summary>
    private async Task<AdminDownloadDto[]> ToDtosAsync(IReadOnlyList<Download> rows)
    {
        if (rows.Count == 0) return [];

        var ids      = rows.Select(d => d.Id).ToArray();
        var mediaIds = rows.Select(d => d.MediaId).Distinct().ToArray();

        var urls = await db.Media.Where(m => mediaIds.Contains(m.Id))
                                 .ToDictionaryAsync(m => m.Id, m => m.BlobUrl);

        var products = (await db.ProductDownloads.Where(pd => ids.Contains(pd.DownloadId))
                                                 .Select(pd => new { pd.DownloadId, pd.ProductId })
                                                 .ToListAsync())
            .GroupBy(x => x.DownloadId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.ProductId).ToArray());

        return rows.Select(d => new AdminDownloadDto(
            d.Id, d.MediaId, urls.GetValueOrDefault(d.MediaId), d.Type, d.FileLocale, d.Status, d.SortOrder,
            products.GetValueOrDefault(d.Id, []),
            d.Translations.OrderBy(t => t.Locale)
                          .ToDictionary(t => t.Locale, t => new DownloadTranslationInput(t.Title, t.Description)),
            d.CreatedAt)).ToArray();
    }

    private static AdminSalesLocationDto ToDto(SalesLocation l) => new(
        l.Id, l.LocationType, l.CountryCode, l.WebsiteUrl, l.Phone, l.Status, l.SortOrder,
        l.Translations.OrderBy(t => t.Locale).ToDictionary(t => t.Locale,
            t => new SalesLocationTranslationInput(t.Name, t.Address, t.RegionLabel, t.Note)),
        l.CreatedAt, l.UpdatedAt);
}
