using System.Text.Json.Nodes;
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
/// 後台應用方案。公開端點（含人體圖）在 <see cref="ApplicationHandler"/>。
///
/// <para>
/// 應用方案有一件別的模組沒有的事：<b>人體圖座標</b>。
/// <c>MapPositionJson</c> 是 SVG viewBox 內的座標，形狀為
/// <c>{hotspot:{cx,cy},chip:{cx,cy}}</c>，取自 mockup4。這裡驗證形狀 ——
/// 存進一個少了 <c>cx</c> 的物件，前端畫熱區時會拿到 NaN，整張人體圖靜默不顯示。
/// </para>
/// </summary>
public sealed class AdminApplicationHandler(
    AppDbContext     db,
    MediaUsageWriter mediaUsage,
    HtmlSanitizers   sanitizers)
{
    /// <summary>GET /admin/applications?type=&amp;status=&amp;bodyPart=</summary>
    public async Task<IActionResult> GetListAsync(HttpRequest req)
    {
        var q = db.Applications.Include(a => a.BodyPart).AsQueryable();

        if (ProductHandler.Nullable(req.Query["type"]) is { } rawType)
        {
            var type = ParseType(rawType);
            q = q.Where(a => a.Type == type);
        }

        if (ProductHandler.Nullable(req.Query["status"]) is { } rawStatus)
        {
            var status = AdminWrite.ParseStatus(rawStatus);
            q = q.Where(a => a.Status == status);
        }

        if (ProductHandler.Nullable(req.Query["bodyPart"]) is { } bodyPart)
            q = q.Where(a => a.BodyPart!.Slug == bodyPart);

        var rows = await q
            .OrderBy(a => a.Type).ThenBy(a => a.SortOrder)
            .Select(a => new
            {
                a.Id, a.Slug, a.Type, a.ShowOnBodyMap, a.Status, a.SortOrder, a.UpdatedAt,
                BodyPartSlug = a.BodyPart!.Slug,
                NameEn   = a.Translations.Where(t => t.Locale == Locales.En).Select(t => t.Name).FirstOrDefault(),
                NameZhTw = a.Translations.Where(t => t.Locale == Locales.ZhTw).Select(t => t.Name).FirstOrDefault(),
                ProductCount = db.ProductApplications.Count(pa => pa.ApplicationId == a.Id),
            })
            .ToListAsync();

        var items = rows.Select(r => new AdminApplicationListItemDto(
            r.Id, r.Slug, r.Type, r.BodyPartSlug, r.NameEn, r.NameZhTw,
            r.ShowOnBodyMap, r.Status, r.SortOrder, r.ProductCount, r.UpdatedAt)).ToArray();

        return new OkObjectResult(ApiResponse.Ok(items));
    }

    public async Task<IActionResult> GetByIdAsync(string id)
    {
        var entity = await LoadFullAsync(AdminWrite.ParseId(id, "application"));
        return new OkObjectResult(ApiResponse.Ok(await ToDtoAsync(entity)));
    }

    public async Task<IActionResult> CreateAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpsertApplicationRequest>(req);

        if (string.IsNullOrWhiteSpace(body.Slug))
            throw AppException.BadRequest("slug 為必填。");
        if (body.Translations is null || body.Translations.Count == 0)
            throw AppException.BadRequest("至少要有一個語系的翻譯。");

        var slug = Slugify.Make(body.Slug.Trim());
        if (await db.Applications.AnyAsync(a => a.Slug == slug))
            throw AppException.Conflict($"Slug '{slug}' 已被使用。");

        var type = body.Type ?? ApplicationType.BodyPart;
        await ValidateBodyPartAsync(type, body.BodyPartId, body.ShowOnBodyMap ?? false);

        var now = Clock.Now;
        var entity = new Application
        {
            Slug                = slug,
            Type                = type,
            BodyPartId          = body.BodyPartId,
            ImageMediaId        = body.ImageMediaId,
            CardImageMediaId    = body.CardImageMediaId,
            FittingImageMediaId = body.FittingImageMediaId,
            ShowOnBodyMap       = body.ShowOnBodyMap ?? false,
            MapPositionJson     = ValidateMapPosition(body.MapPosition),
            Status              = ContentStatus.Draft,
            SortOrder           = body.SortOrder ?? 0,
            CreatedAt           = now,
            UpdatedAt           = now,
        };

        ApplyTranslations(entity, body.Translations);
        await EnsureMediaAsync(entity);

        db.Applications.Add(entity);
        await db.SaveChangesAsync();

        if (body.ProductIds is { } products) await ApplyProductsAsync(entity.Id, products);
        await RebuildUsageAsync(entity);

        return new ObjectResult(ApiResponse.Ok(await ToDtoAsync(entity), "應用方案已建立（草稿）。")) { StatusCode = 201 };
    }

    public async Task<IActionResult> UpdateAsync(HttpRequest req, string id)
    {
        var body   = await AdminWrite.ReadAsync<UpsertApplicationRequest>(req);
        var entity = await LoadFullAsync(AdminWrite.ParseId(id, "application"));

        AdminWrite.ApplyRowVersion(db.Entry(entity).Property(a => a.RowVer), body.RowVersion);

        if (!string.IsNullOrWhiteSpace(body.Slug))
        {
            var slug = Slugify.Make(body.Slug.Trim());
            if (slug != entity.Slug && await db.Applications.AnyAsync(a => a.Slug == slug))
                throw AppException.Conflict($"Slug '{slug}' 已被使用。");
            entity.Slug = slug;
        }

        var type       = body.Type ?? entity.Type;
        var bodyPartId = body.ClearBodyPart ? null : body.BodyPartId ?? entity.BodyPartId;
        var showOnMap  = body.ShowOnBodyMap ?? entity.ShowOnBodyMap;
        await ValidateBodyPartAsync(type, bodyPartId, showOnMap);

        entity.Type          = type;
        entity.BodyPartId    = bodyPartId;
        entity.ShowOnBodyMap = showOnMap;

        if (body.ClearImage)                             entity.ImageMediaId        = null;
        else if (body.ImageMediaId is { } image)         entity.ImageMediaId        = image;

        if (body.ClearCardImage)                         entity.CardImageMediaId    = null;
        else if (body.CardImageMediaId is { } card)      entity.CardImageMediaId    = card;

        if (body.ClearFittingImage)                      entity.FittingImageMediaId = null;
        else if (body.FittingImageMediaId is { } fit)    entity.FittingImageMediaId = fit;

        if (body.ClearMapPosition)                       entity.MapPositionJson     = null;
        else if (body.MapPosition is not null)           entity.MapPositionJson     = ValidateMapPosition(body.MapPosition);

        if (body.SortOrder is { } sortOrder) entity.SortOrder = sortOrder;

        ApplyTranslations(entity, body.Translations);
        await EnsureMediaAsync(entity);

        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();

        if (body.ProductIds is { } products) await ApplyProductsAsync(entity.Id, products);
        await RebuildUsageAsync(entity);

        return new OkObjectResult(ApiResponse.Ok(await ToDtoAsync(entity), "應用方案已更新。"));
    }

    /// <summary>DELETE /admin/applications/{id} —— 軟刪除，連帶清產品關聯與 MediaUsage。</summary>
    public async Task<IActionResult> DeleteAsync(string id)
    {
        var guid   = AdminWrite.ParseId(id, "application");
        var entity = await db.Applications.FirstOrDefaultAsync(a => a.Id == guid)
            ?? throw AppException.NotFound("Application");

        // ProductApplication 的 Application 側是 Restrict，軟刪除本身不會被擋，
        // 但留著關聯列會讓「同部位產品」的自動遞補把已刪方案的產品算進去。
        await db.ProductApplications.Where(pa => pa.ApplicationId == guid).ExecuteDeleteAsync();

        entity.IsDeleted = true;
        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();

        await mediaUsage.RebuildAsync(nameof(Application), guid, []);

        return new OkObjectResult(ApiResponse.Ok($"應用方案 '{entity.Slug}' 已刪除。"));
    }

    public async Task<IActionResult> PublishAsync(string id)
    {
        var entity = await LoadFullAsync(AdminWrite.ParseId(id, "application"));

        if (entity.Translations.Count == 0)
            throw AppException.BadRequest("沒有任何語系翻譯，無法發布。");

        // 人體圖上要顯示卻沒有座標，前端會拿不到 cx/cy 而靜默不畫那個熱區 ——
        // 編輯者只會看到「發布了但人體圖上沒出現」。
        if (entity.ShowOnBodyMap && string.IsNullOrWhiteSpace(entity.MapPositionJson))
            throw AppException.BadRequest("showOnBodyMap 為 true 但沒有 mapPosition 座標，人體圖上不會出現這個熱區。");

        // Application 沒有 PublishedAt 欄位（docs/05 §3.9）—— 它不做排程發布，
        // 狀態就是全部。不要照抄 Article 那套。
        entity.Status    = ContentStatus.Published;
        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(await ToDtoAsync(entity), "應用方案已發布。"));
    }

    public async Task<IActionResult> UnpublishAsync(string id)
    {
        var entity = await LoadFullAsync(AdminWrite.ParseId(id, "application"));

        entity.Status    = ContentStatus.Draft;
        entity.UpdatedAt = Clock.Now;
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(await ToDtoAsync(entity), "應用方案已取消發布。"));
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    private async Task<Application> LoadFullAsync(Guid id) =>
        await db.Applications.Include(a => a.Translations).FirstOrDefaultAsync(a => a.Id == id)
        ?? throw AppException.NotFound("Application");

    private static byte ParseType(string raw) =>
        raw.ToLowerInvariant() switch
        {
            "bodypart" or "body-part" or "1" => ApplicationType.BodyPart,
            "specialcare" or "special-care" or "2" => ApplicationType.SpecialCare,
            _ => throw AppException.BadRequest($"未知的 type：{raw}（body-part / special-care）。"),
        };

    /// <summary>
    /// 依部位的方案必須綁一個 BodyPart —— 公開端點的 productCount 是
    /// 「手動關聯 ∪ 同 BodyPart 的產品」（docs/13 Phase 6），沒綁部位就只剩手動那半，
    /// 在編輯者逐一掛完之前該頁會顯示 0。
    /// </summary>
    private async Task ValidateBodyPartAsync(byte type, Guid? bodyPartId, bool showOnBodyMap)
    {
        if (bodyPartId is { } id && !await db.BodyParts.AnyAsync(b => b.Id == id))
            throw AppException.BadRequest($"部位 {id} 不存在。");

        if (type == ApplicationType.BodyPart && bodyPartId is null)
            throw AppException.BadRequest("type 為依部位（1）時必須指定 bodyPartId，否則產品數會永遠是 0。");

        if (showOnBodyMap && bodyPartId is null)
            throw AppException.BadRequest("showOnBodyMap 為 true 時必須指定 bodyPartId。");
    }

    /// <summary>
    /// 人體圖座標形狀驗證：<c>{hotspot:{cx,cy},chip:{cx,cy}}</c>，四個值皆為數字。
    /// 少一個就整張圖靜默不顯示，所以寧可在寫入時 400。
    /// </summary>
    private static string? ValidateMapPosition(JsonNode? node)
    {
        if (node is null) return null;

        if (node is not JsonObject obj)
            throw AppException.BadRequest("mapPosition 必須是物件 {hotspot:{cx,cy},chip:{cx,cy}}。");

        foreach (var key in (string[])["hotspot", "chip"])
        {
            if (obj[key] is not JsonObject point)
                throw AppException.BadRequest($"mapPosition.{key} 必須是物件 {{cx,cy}}。");

            foreach (var axis in (string[])["cx", "cy"])
            {
                if (point[axis] is not JsonValue v || !v.TryGetValue<double>(out _))
                    throw AppException.BadRequest($"mapPosition.{key}.{axis} 必須是數字。");
            }
        }

        return obj.ToJsonString();
    }

    private void ApplyTranslations(Application entity, Dictionary<string, ApplicationTranslationInput>? input)
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
                tr = new ApplicationTranslation { Locale = locale };
                entity.Translations.Add(tr);
            }

            tr.Name        = value.Name.Trim();
            tr.Lead        = value.Lead;
            tr.Body        = string.IsNullOrWhiteSpace(value.Body)
                ? null
                : sanitizers.Sanitize(value.Body, RichTextProfile.Section);
            tr.MapCopy     = value.MapCopy;
            tr.MapCtaLabel = value.MapCtaLabel;

            tr.StatsJson         = value.Stats?.ToJsonString();
            tr.ConcernsJson      = value.Concerns?.ToJsonString();
            tr.SupportLevelsJson = value.SupportLevels?.ToJsonString();
            tr.HowToJson         = value.HowTo?.ToJsonString();

            tr.Disclaimer     = value.Disclaimer;
            tr.SeoTitle       = value.SeoTitle;
            tr.SeoDescription = value.SeoDescription;
        }
    }

    private async Task ApplyProductsAsync(Guid applicationId, Guid[] productIds)
    {
        var distinct = productIds.Distinct().ToArray();
        await AdminWrite.EnsureAllExistAsync(db.Products.Select(p => p.Id), distinct, "productId");

        await db.ProductApplications.Where(pa => pa.ApplicationId == applicationId).ExecuteDeleteAsync();

        for (var i = 0; i < distinct.Length; i++)
            db.ProductApplications.Add(new ProductApplication
            {
                ApplicationId = applicationId,
                ProductId     = distinct[i],
                SortOrder     = i,
            });

        await db.SaveChangesAsync();
    }

    private Task EnsureMediaAsync(Application a) =>
        AdminWrite.EnsureMediaExistsAsync(db, a.ImageMediaId, a.CardImageMediaId, a.FittingImageMediaId);

    private Task RebuildUsageAsync(Application a) =>
        mediaUsage.RebuildAsync(nameof(Application), a.Id, AdminWrite.MediaRefs(
            ("image", a.ImageMediaId),
            ("cardImage", a.CardImageMediaId),
            ("fittingImage", a.FittingImageMediaId)));

    private async Task<AdminApplicationDto> ToDtoAsync(Application a) => new(
        a.Id, a.Slug, a.Type, a.BodyPartId,
        a.ImageMediaId, a.CardImageMediaId, a.FittingImageMediaId,
        a.ShowOnBodyMap, JsonField.Parse(a.MapPositionJson),
        a.Status, a.SortOrder,
        await db.ProductApplications.Where(pa => pa.ApplicationId == a.Id)
                                    .OrderBy(pa => pa.SortOrder).Select(pa => pa.ProductId).ToArrayAsync(),
        a.Translations.OrderBy(t => t.Locale).ToDictionary(t => t.Locale, t => new ApplicationTranslationInput(
            t.Name, t.Lead, t.Body, t.MapCopy, t.MapCtaLabel,
            JsonField.Parse(t.StatsJson), JsonField.Parse(t.ConcernsJson),
            JsonField.Parse(t.SupportLevelsJson), JsonField.Parse(t.HowToJson),
            t.Disclaimer, t.SeoTitle, t.SeoDescription)),
        AdminWrite.Base64(a.RowVer),
        a.CreatedAt, a.UpdatedAt);
}
