using System.Text.Json;
using EuniceMed.Api.Common;
using EuniceMed.Api.Data.Configurations;
using EuniceMed.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace EuniceMed.Api.Data.Seed;

/// <summary>
/// 由 <c>reference/legacy/products.json</c> 匯入 149 筆舊站產品（docs/05-database.md §4.1）。
///
/// <para>
/// 對照規則：物件 key → <c>SubCategory.Slug</c>、<c>model</c> → <c>Product.Sku</c>、
/// <c>name</c> → <c>ProductTranslation.Name</c>（locale = en）、
/// <c>features[]</c> → <c>FeaturesJson[].body</c>（icon / title 待人工補）、
/// <c>image</c> → <c>Media</c> + <c>ProductImage</c>。
/// </para>
///
/// <para>
/// **冪等**：以 <c>Sku</c> 為業務鍵 upsert；來源只有 60/149 筆有 SKU，
/// 其餘退回 (子分類, 英文名稱) 對照。跑兩次仍是 149 筆。
/// 匯入的產品一律 <c>Status = Draft</c> —— 舊站文案需要人工審過才發布。
/// </para>
/// </summary>
public static class LegacyProductImporter
{
    private sealed record LegacyProduct(string Name, string? Model, string[]? Features, string? Image, string? File);

    public sealed record Report(int SubCategoriesMatched, int Created, int Updated, int Skipped, string[] Warnings);

    public static async Task<Report> RunAsync(AppDbContext db, string jsonPath, CancellationToken ct = default)
    {
        if (!File.Exists(jsonPath))
            throw new FileNotFoundException($"找不到匯入檔：{jsonPath}");

        var raw = await File.ReadAllTextAsync(jsonPath, ct);
        var data = JsonSerializer.Deserialize<Dictionary<string, LegacyProduct[]>>(raw,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("匯入檔格式無法解析。");

        var warnings = new List<string>();
        int created = 0, updated = 0, skipped = 0, matched = 0;

        var subCategories = await db.SubCategories
            .Include(s => s.Category)
            .ToDictionaryAsync(s => s.Slug, ct);

        // ── 業務鍵 ─────────────────────────────────────────────────────────
        // 149 筆裡只有 60 筆有 model（SKU），另外 89 筆沒有。
        // 只用 SKU 對照的話，那 89 筆每次重跑都會被當成新產品 —— 實測第二次匯入
        // 會多出 89 筆。所幸 (子分類, 英文名稱) 在來源資料中完全無重複，
        // 足以當作備用業務鍵。
        var loaded = await db.Products
            .Include(p => p.Translations)
            .ToListAsync(ct);

        var existingBySku = loaded
            .Where(p => p.Sku is not null)
            .ToDictionary(p => p.Sku!, StringComparer.OrdinalIgnoreCase);

        var existingByNameKey = loaded
            .Select(p => (Product: p, Name: p.Translations.FirstOrDefault(t => t.Locale == Locales.En)?.Name))
            .Where(x => x.Name is not null && x.Product.SubCategoryId is not null)
            .GroupBy(x => NameKey(x.Product.SubCategoryId!.Value, x.Name!))
            .ToDictionary(g => g.Key, g => g.First().Product);

        // 一次撈完既有 slug 並在記憶體保留本批次已配發的。
        // 逐筆查 DB 是錯的：同批次內尚未 SaveChanges 的產品彼此看不見，
        // 兩個同名產品會拿到同一個 slug，撞上 UX_Product_Slug。
        // （順帶：149 筆逐筆查也等於 149 次往返。）
        // IgnoreQueryFilters —— 軟刪除的產品仍佔用 slug，避免日後復原時撞號。
        var takenSlugs = (await db.Products.IgnoreQueryFilters()
                .Select(p => p.Slug).ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var now = Clock.Now;

        foreach (var (rawKey, items) in data)
        {
            // ⚠️ 舊站的 key 有 6 個帶 -1 後綴（knee-support-1 等），要去掉才對得上 SubCategory.Slug
            var slug = NormalizeSubCategorySlug(rawKey);

            if (!subCategories.TryGetValue(slug, out var sub))
            {
                warnings.Add($"找不到子分類 '{slug}'（原始 key '{rawKey}'），略過該組 {items.Length} 筆。");
                skipped += items.Length;
                continue;
            }
            matched++;

            foreach (var item in items)
            {
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    warnings.Add($"[{slug}] 有一筆缺少 name，略過。");
                    skipped++;
                    continue;
                }

                var sku  = string.IsNullOrWhiteSpace(item.Model) ? null : item.Model.Trim();
                var name = item.Name.Trim();

                // 先比 SKU，沒有 SKU 才退回 (子分類, 名稱)
                Product? existing = null;
                if (sku is not null) existingBySku.TryGetValue(sku, out existing);
                existing ??= existingByNameKey.GetValueOrDefault(NameKey(sub.Id, name));

                if (existing is not null)
                {
                    var tr = existing.Translations.FirstOrDefault(t => t.Locale == Locales.En);
                    if (tr is not null)
                    {
                        tr.Name         = name;
                        tr.FeaturesJson = FeaturesJson(item.Features);
                    }
                    if (sku is not null) existing.Sku = sku;
                    existing.SubCategoryId = sub.Id;
                    existing.CategoryId    = sub.CategoryId;
                    existing.UpdatedAt     = now;
                    updated++;
                    continue;
                }

                var product = new Product
                {
                    Slug          = ReserveSlug(takenSlugs, Slugify.Make(item.Name)),
                    Sku           = sku,
                    CategoryId    = sub.CategoryId,
                    SubCategoryId = sub.Id,
                    Status        = ContentStatus.Draft,   // 舊站文案需人工審過才發布
                    CreatedAt     = now,
                    UpdatedAt     = now,
                };
                product.Translations.Add(new ProductTranslation
                {
                    Locale       = Locales.En,
                    Name         = name,
                    FeaturesJson = FeaturesJson(item.Features),
                });

                db.Products.Add(product);
                if (sku is not null) existingBySku[sku] = product;
                existingByNameKey[NameKey(sub.Id, name)] = product;
                created++;
            }
        }

        await db.SaveChangesAsync(ct);
        return new Report(matched, created, updated, skipped, warnings.ToArray());
    }

    /// <summary>沒有 SKU 時的備用業務鍵：(子分類, 英文名稱)。</summary>
    private static string NameKey(Guid subCategoryId, string name) =>
        $"{subCategoryId:N}|{name.Trim().ToLowerInvariant()}";

    /// <summary>去掉舊站 key 尾端的 <c>-1</c>（docs/05 §4：slug 取自檔名前綴）。</summary>
    internal static string NormalizeSubCategorySlug(string key) =>
        key.EndsWith("-1", StringComparison.Ordinal) ? key[..^2] : key;

    /// <summary>
    /// features 只有純文字，icon 與 title 待人工補 —— 這裡放進 body，
    /// 讓編輯者在後台看得到原文再逐條整理（docs/05 §4.1）。
    /// </summary>
    private static string? FeaturesJson(string[]? features)
    {
        if (features is null || features.Length == 0) return null;

        var items = features
            .Where(f => !string.IsNullOrWhiteSpace(f))
            .Select(f => new { icon = (string?)null, title = (string?)null, body = f.Trim() });

        return JsonSerializer.Serialize(items);
    }

    /// <summary>取一個尚未被使用的 slug，並立即登記佔用（含本批次尚未存檔的）。</summary>
    private static string ReserveSlug(HashSet<string> taken, string baseSlug)
    {
        var slug = baseSlug;
        var n = 2;

        while (!taken.Add(slug))
            slug = $"{baseSlug}-{n++}";

        return slug;
    }
}
