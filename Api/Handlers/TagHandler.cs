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
/// 標籤 CRUD。產品與文章共用同一張 <c>Tag</c> 表。
///
/// <para>
/// 名稱**不建 translation 表**，用雙語欄位（`NameEn` / `NameZhTw`）——
/// 與部位同一個決定（docs/05 §3.2）：標籤是一兩個詞，為它多開一張表
/// 只會讓每次查詢多一個 join。
/// </para>
///
/// <para>
/// 沒有中文名稱的標籤在中文站顯示英文名 —— 這是全站語言純度規則的**唯一例外**，
/// 因為標籤是篩選器的一顆按鈕，隱藏它會讓那一組文章在中文站永遠篩不出來。
/// </para>
/// </summary>
public sealed class TagHandler(AppDbContext db)
{
    public async Task<IActionResult> GetAllAsync()
    {
        var rows = await db.Tags.OrderBy(t => t.NameEn).ToListAsync();
        var ids  = rows.Select(t => t.Id).ToList();

        var productCounts = await db.Set<ProductTag>()
            .Where(t => ids.Contains(t.TagId))
            .GroupBy(t => t.TagId).Select(g => new { g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.N);

        var articleCounts = await db.Set<ArticleTag>()
            .Where(t => ids.Contains(t.TagId))
            .GroupBy(t => t.TagId).Select(g => new { g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.N);

        return new OkObjectResult(ApiResponse.Ok(rows.Select(t => new AdminTagDto(
            t.Id, t.Slug, t.NameEn, t.NameZhTw,
            productCounts.GetValueOrDefault(t.Id),
            articleCounts.GetValueOrDefault(t.Id))).ToArray()));
    }

    public async Task<IActionResult> CreateAsync(HttpRequest req)
    {
        var body = await AdminWrite.ReadAsync<UpsertTagRequest>(req);

        if (string.IsNullOrWhiteSpace(body.NameEn))
            throw AppException.BadRequest("nameEn 為必填。");

        var slug = Slugify.Make(string.IsNullOrWhiteSpace(body.Slug) ? body.NameEn : body.Slug);
        if (await db.Tags.AnyAsync(t => t.Slug == slug))
            throw AppException.Conflict($"Slug '{slug}' 已被使用。");

        var entity = new Tag
        {
            Slug     = slug,
            NameEn   = body.NameEn.Trim(),
            NameZhTw = string.IsNullOrWhiteSpace(body.NameZhTw) ? null : body.NameZhTw.Trim(),
        };

        db.Tags.Add(entity);
        await db.SaveChangesAsync();

        return new ObjectResult(ApiResponse.Ok(
            new AdminTagDto(entity.Id, entity.Slug, entity.NameEn, entity.NameZhTw, 0, 0),
            "標籤已建立。")) { StatusCode = 201 };
    }

    public async Task<IActionResult> UpdateAsync(HttpRequest req, string id)
    {
        var guid   = AdminWrite.ParseId(id, "tag");
        var body   = await AdminWrite.ReadAsync<UpsertTagRequest>(req);
        var entity = await db.Tags.FirstOrDefaultAsync(t => t.Id == guid)
            ?? throw AppException.NotFound("Tag");

        if (!string.IsNullOrWhiteSpace(body.Slug))
        {
            var slug = Slugify.Make(body.Slug.Trim());
            if (slug != entity.Slug && await db.Tags.AnyAsync(t => t.Slug == slug))
                throw AppException.Conflict($"Slug '{slug}' 已被使用。");
            entity.Slug = slug;
        }

        if (!string.IsNullOrWhiteSpace(body.NameEn)) entity.NameEn = body.NameEn.Trim();

        // 中文名稱可以清空（回到「中文站顯示英文名」），所以空字串當成清空而非「不動它」
        if (body.NameZhTw is not null)
            entity.NameZhTw = string.IsNullOrWhiteSpace(body.NameZhTw) ? null : body.NameZhTw.Trim();

        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(
            new AdminTagDto(entity.Id, entity.Slug, entity.NameEn, entity.NameZhTw, 0, 0),
            "標籤已更新。"));
    }

    public async Task<IActionResult> DeleteAsync(string id)
    {
        var guid   = AdminWrite.ParseId(id, "tag");
        var entity = await db.Tags.FirstOrDefaultAsync(t => t.Id == guid)
            ?? throw AppException.NotFound("Tag");

        // 從**主表**數而不是從關聯表數：產品與文章都是軟刪除，
        // 關聯列會留著。若照關聯表的數字擋，只被已刪內容用過的標籤就永遠刪不掉。
        var products = await db.Products.CountAsync(p => p.Tags.Any(t => t.TagId == guid));
        var articles = await db.Articles.CountAsync(a => a.Tags.Any(t => t.TagId == guid));
        if (products + articles > 0)
            throw AppException.Conflict(
                $"這個標籤還掛在 {products} 筆產品與 {articles} 篇文章上。請先取消掛載再刪除。");

        // 剩下的關聯列都屬於已軟刪除的內容。不先清掉的話 FK 會擋，
        // 而且是在 SaveChanges 才炸 —— 使用者看到的會是 500 而不是說得清楚的訊息。
        await db.Set<ProductTag>().IgnoreQueryFilters().Where(t => t.TagId == guid).ExecuteDeleteAsync();
        await db.Set<ArticleTag>().IgnoreQueryFilters().Where(t => t.TagId == guid).ExecuteDeleteAsync();

        db.Tags.Remove(entity);
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok($"標籤 '{entity.Slug}' 已刪除。"));
    }
}
