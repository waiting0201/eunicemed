using EuniceMed.Api.Common;
using EuniceMed.Api.Data;
using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace EuniceMed.Api.Services;

/// <summary>
/// slug 改動時自動建立 301。
///
/// <para>
/// **後台沒有轉址畫面**（docs/15-cms-scope.md）。轉址不是一種內容 ——
/// 沒有編輯者會為了樂趣去新增一條規則，他們只會改 slug，然後在幾個月後
/// 才發現舊連結壞了。與其要他們記得「改完 slug 要去另一個畫面補一條」，
/// 不如在改 slug 的那一刻就寫進去。
/// </para>
///
/// <para>
/// ⚠️ <c>Redirect.FromPath</c> 存的是**含語系前綴的完整路徑**：前端 middleware
/// 先比對轉址、再補語系前綴（見 <c>apps/web/middleware.ts</c>）。
/// 所以每次 slug 改動都要為每個語系各寫一條。
/// </para>
///
/// <para>
/// 舊站那份一次性對照（docs/10-legacy-content.md §10）不走這裡，
/// 由 <c>Api/http/phase7-site.http</c> 灌入。
/// </para>
/// </summary>
public sealed class RedirectWriter(AppDbContext db)
{
    /// <summary>
    /// 產品：<c>/{locale}/products/{category}/{sub}/{slug}</c>。
    ///
    /// <para>
    /// **不是只有 slug 會改到網址** —— 把產品換到另一個分類或子分類，
    /// 四段路徑一樣會變。所以這裡收的是整條路徑的前後值，不是單一個 slug。
    /// </para>
    /// </summary>
    public Task ProductPathChangedAsync(
        (string Category, string? Sub, string Slug) before,
        (string Category, string? Sub, string Slug) after) =>
        AddAsync(
            l => ProductPath(l, before.Category, before.Sub, before.Slug),
            l => ProductPath(l, after.Category, after.Sub, after.Slug));

    /// <summary>
    /// 文章：News 與 Insights 各有自己的路徑段，所以**改 type 也會改網址**。
    /// </summary>
    public Task ArticlePathChangedAsync(
        (byte Type, string Slug) before, (byte Type, string Slug) after) =>
        AddAsync(
            l => ArticlePath(l, before.Type, before.Slug),
            l => ArticlePath(l, after.Type, after.Slug));

    /// <summary>
    /// 分類：除了分類落地頁本身，**底下每一筆產品的網址也變了**。
    /// 少了那一步，改一個分類 slug 等於讓該分類下所有產品的既有連結全部 404。
    /// </summary>
    public async Task CategorySlugChangedAsync(Guid categoryId, string oldSlug, string newSlug)
    {
        await AddAsync(l => $"/{l}/products/{oldSlug}", l => $"/{l}/products/{newSlug}");

        var children = await db.SubCategories
            .Where(s => s.CategoryId == categoryId)
            .Select(s => s.Slug)
            .ToListAsync();

        foreach (var sub in children)
            await AddAsync(
                l => $"/{l}/products/{oldSlug}/{sub}",
                l => $"/{l}/products/{newSlug}/{sub}");

        await AddForProductsAsync(
            p => p.CategoryId == categoryId,
            (p, l) => ProductPath(l, oldSlug, p.SubCategorySlug, p.Slug),
            (p, l) => ProductPath(l, newSlug, p.SubCategorySlug, p.Slug));
    }

    /// <summary>
    /// 子分類：同上，但只影響掛在它底下的產品。
    /// 改 slug 與**換到另一個分類**都會改到網址，所以收的是前後兩組。
    /// </summary>
    public async Task SubCategoryPathChangedAsync(
        Guid subCategoryId,
        (string Category, string Sub) before,
        (string Category, string Sub) after)
    {
        await AddAsync(
            l => $"/{l}/products/{before.Category}/{before.Sub}",
            l => $"/{l}/products/{after.Category}/{after.Sub}");

        await AddForProductsAsync(
            p => p.SubCategoryId == subCategoryId,
            (row, l) => ProductPath(l, before.Category, before.Sub, row.Slug),
            (row, l) => ProductPath(l, after.Category, after.Sub, row.Slug));
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    private static string ArticlePath(string locale, byte type, string slug) =>
        $"/{locale}/{(type == ArticleType.Insight ? "insights" : "news")}/{slug}";

    private static string ProductPath(string locale, string category, string? sub, string slug) =>
        sub is null
            ? $"/{locale}/products/{category}/{slug}"
            : $"/{locale}/products/{category}/{sub}/{slug}";

    private sealed record ProductRow(string Slug, string? SubCategorySlug);

    private async Task AddForProductsAsync(
        System.Linq.Expressions.Expression<Func<Product, bool>> filter,
        Func<ProductRow, string, string> from,
        Func<ProductRow, string, string> to)
    {
        var rows = await db.Products
            .Where(filter)
            .Select(p => new ProductRow(p.Slug, p.SubCategory!.Slug))
            .ToListAsync();

        foreach (var row in rows)
            await AddAsync(l => from(row, l), l => to(row, l));
    }

    /// <summary>
    /// 每個語系各一條。
    ///
    /// <para>
    /// <c>FromPath</c> 有唯一索引，所以既有規則要**更新**而不是插入：
    /// A→B 之後再把 slug 改成 C，正確結果是 A→C（而不是 409，也不是留著失效的 A→B）。
    /// 指向舊路徑的規則也一起改指新路徑，避免形成 A→B→C 兩段跳轉。
    /// </para>
    ///
    /// <para>
    /// ⚠️ **改回原本的 slug 是會發生的**（打錯字、改了又反悔）。那會讓既有的
    /// A→B 在 B→A 之後變成 A→A —— middleware 會把它變成無限轉址，
    /// 整個頁面直接打不開。所以任何變成自我轉址的規則一律刪掉，不是留著。
    /// </para>
    /// </summary>
    private async Task AddAsync(Func<string, string> from, Func<string, string> to)
    {
        var now = Clock.Now;

        foreach (var locale in Locales.Supported)
        {
            var fromPath = from(locale);
            var toPath   = to(locale);

            if (Same(fromPath, toPath)) continue;

            // 指向舊路徑的規則改指新目標；若因此指回自己就刪掉
            var chained = await db.Redirects.Where(r => r.ToPath == fromPath).ToListAsync();
            foreach (var link in chained)
            {
                if (Same(link.FromPath, toPath)) db.Redirects.Remove(link);
                else                             link.ToPath = toPath;
            }

            var existing = await db.Redirects.FirstOrDefaultAsync(r => r.FromPath == fromPath);

            if (existing is not null)
            {
                existing.ToPath = toPath;
                continue;
            }

            db.Redirects.Add(new Redirect
            {
                FromPath   = fromPath,
                ToPath     = toPath,
                StatusCode = 301,
                CreatedAt  = now,
            });
        }
    }

    private static bool Same(string a, string b) =>
        string.Equals(a, b, StringComparison.OrdinalIgnoreCase);
}
