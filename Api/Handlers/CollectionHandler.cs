using EuniceMed.Api.Common;
using EuniceMed.Api.Data;
using EuniceMed.Api.Models.Dtos;
using EuniceMed.Api.Models.Entities;
using EuniceMed.Api.Services.Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EuniceMed.Api.Handlers;

/// <summary>
/// 產品系列（Care / Protect / Advance）。公開唯讀 + 後台 CRUD。
///
/// <para>
/// **這是後台 CRUD 的參考實作**。其餘 ~20 個內容模組照這個形狀寫：
/// 讀取走 Dapper read service、寫入走 EF Core、翻譯列 upsert、
/// slug 重複回 409、稽核由 interceptor 自動處理。
/// </para>
/// </summary>
public sealed class CollectionHandler(AppDbContext db, ICollectionReadService reader)
{
    // ── 公開 ───────────────────────────────────────────────────────────────

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

    // ── 後台 ───────────────────────────────────────────────────────────────

    /// <summary>GET /admin/collections → 全部系列 × 全部語系（後台編輯用）</summary>
    public async Task<IActionResult> AdminGetAllAsync()
    {
        var rows = await db.Collections
            .Include(c => c.Translations)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        return new OkObjectResult(ApiResponse.Ok(rows.Select(ToAdminDto).ToArray()));
    }

    /// <summary>GET /admin/collections/{id}</summary>
    public async Task<IActionResult> AdminGetByIdAsync(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return new BadRequestObjectResult(ApiResponse.Fail("Invalid collection ID format."));

        var row = await db.Collections
            .Include(c => c.Translations)
            .FirstOrDefaultAsync(c => c.Id == guid)
            ?? throw AppException.NotFound("Collection");

        return new OkObjectResult(ApiResponse.Ok(ToAdminDto(row)));
    }

    /// <summary>POST /admin/collections</summary>
    public async Task<IActionResult> AdminCreateAsync(HttpRequest req)
    {
        var body = await req.ReadFromJsonAsync<UpsertCollectionRequest>();
        if (body is null)
            return new BadRequestObjectResult(ApiResponse.Fail("Invalid request body."));

        if (string.IsNullOrWhiteSpace(body.Slug))
            return new BadRequestObjectResult(ApiResponse.Fail("slug 為必填。"));

        var slug = body.Slug.Trim().ToLowerInvariant();
        if (await db.Collections.AnyAsync(c => c.Slug == slug))
            throw AppException.Conflict($"Slug '{slug}' 已被使用。");

        var now = Clock.Now;
        var entity = new Collection
        {
            Slug      = slug,
            Strength  = body.Strength,
            SortOrder = body.SortOrder,
            CreatedAt = now,
            UpdatedAt = now,
        };
        ApplyTranslations(entity, body.Translations);

        db.Collections.Add(entity);
        await db.SaveChangesAsync();

        return new ObjectResult(ApiResponse.Ok(ToAdminDto(entity), "系列已建立。")) { StatusCode = 201 };
    }

    /// <summary>PUT /admin/collections/{id}</summary>
    public async Task<IActionResult> AdminUpdateAsync(HttpRequest req, string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return new BadRequestObjectResult(ApiResponse.Fail("Invalid collection ID format."));

        var body = await req.ReadFromJsonAsync<UpsertCollectionRequest>();
        if (body is null)
            return new BadRequestObjectResult(ApiResponse.Fail("Invalid request body."));

        var entity = await db.Collections
            .Include(c => c.Translations)
            .FirstOrDefaultAsync(c => c.Id == guid)
            ?? throw AppException.NotFound("Collection");

        if (!string.IsNullOrWhiteSpace(body.Slug))
        {
            var slug = body.Slug.Trim().ToLowerInvariant();
            if (slug != entity.Slug && await db.Collections.AnyAsync(c => c.Slug == slug))
                throw AppException.Conflict($"Slug '{slug}' 已被使用。");
            entity.Slug = slug;
        }

        if (body.Strength  != 0) entity.Strength  = body.Strength;
        if (body.SortOrder != 0) entity.SortOrder = body.SortOrder;
        entity.UpdatedAt = Clock.Now;

        ApplyTranslations(entity, body.Translations);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(ToAdminDto(entity), "系列已更新。"));
    }

    /// <summary>DELETE /admin/collections/{id}</summary>
    public async Task<IActionResult> AdminDeleteAsync(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            return new BadRequestObjectResult(ApiResponse.Fail("Invalid collection ID format."));

        var entity = await db.Collections.FindAsync(guid) ?? throw AppException.NotFound("Collection");

        // Collection 沒有軟刪除（docs/05 §7），是硬刪。Phase 4 加入 Product 後，
        // 這裡要先擋掉「仍有產品引用此系列」的情況。
        db.Collections.Remove(entity);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok($"系列 '{id}' 已刪除。"));
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    /// <summary>
    /// 翻譯列 upsert：只處理 request 帶到的語系，未帶到的維持原狀
    /// （避免前端只送 en 就把 zh-TW 洗掉）。
    /// </summary>
    private static void ApplyTranslations(Collection entity, Dictionary<string, CollectionTranslationInput?>? input)
    {
        if (input is null) return;

        foreach (var (rawLocale, value) in input)
        {
            var locale = Locales.Normalize(rawLocale);
            if (!Locales.Supported.Contains(locale))
                throw AppException.BadRequest($"不支援的語系：{rawLocale}");

            // null = 刪除該語系（見 docs/13 的踩坑「未帶到 = 不動它」）
            if (value is null)
            {
                if (entity.Translations.FirstOrDefault(t => t.Locale == locale) is { } drop)
                    entity.Translations.Remove(drop);
                continue;
            }

            if (string.IsNullOrWhiteSpace(value.Name))
                throw AppException.BadRequest($"語系 {locale} 的 name 為必填。");

            var tr = entity.Translations.FirstOrDefault(t => t.Locale == locale);
            if (tr is null)
            {
                entity.Translations.Add(new CollectionTranslation
                {
                    Locale      = locale,
                    Name        = value.Name.Trim(),
                    Description = value.Description,
                });
            }
            else
            {
                tr.Name        = value.Name.Trim();
                tr.Description = value.Description;
            }
        }
    }

    private static AdminCollectionDto ToAdminDto(Collection c) => new(
        c.Id,
        c.Slug,
        c.Strength,
        c.SortOrder,
        c.Translations
            .OrderBy(t => t.Locale)
            .ToDictionary(t => t.Locale, t => new CollectionTranslationInput(t.Name, t.Description)),
        c.CreatedAt,
        c.UpdatedAt);
}
