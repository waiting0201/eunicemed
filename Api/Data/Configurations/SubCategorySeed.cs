using EuniceMed.Api.Models.Entities;

namespace EuniceMed.Api.Data.Configurations;

/// <summary>
/// 17 筆子分類的 seed。docs/05-database.md §4。
/// slug 取自 <c>mockup4/images/products/</c> 的檔名前綴，去掉尾端 <c>-1</c>。
///
/// <para>
/// ⚠️ 每個子分類**都有獨立 URL 落地頁**，所以 <c>Description</c> 與 SEO 欄位是必填。
/// 這裡 seed 只給名稱；敘述文案待內容team 撰寫（CLAUDE.md §7）。
/// 產品數少的子分類（travel-stockings、diabetic-socks）在文案補齊前應維持不發布，
/// 否則會產出薄內容頁傷 SEO。
/// </para>
/// </summary>
internal static class SubCategorySeed
{
    private sealed record Row(string Slug, string En, string ZhTw, Guid CategoryId, int Order);

    private static readonly Row[] All =
    [
        // ── 醫療彈性襪（6）────────────────────────────────────────────────
        new("stockings-for-venous-therapy", "Venous Therapy Stockings",  "靜脈治療彈性襪", CategoryIds.Stockings, 1),
        new("stockings-for-edema-therapy",  "Edema Therapy Stockings",   "水腫治療彈性襪", CategoryIds.Stockings, 2),
        new("stockings-for-antiembolism",   "Antiembolism Stockings",    "抗栓塞彈性襪",   CategoryIds.Stockings, 3),
        new("stockings-for-everyday",       "Everyday Stockings",        "日常彈性襪",     CategoryIds.Stockings, 4),
        new("travel-stockings",             "Travel Stockings",          "旅行彈性襪",     CategoryIds.Stockings, 5),
        new("diabetic-socks",               "Diabetic Socks",            "糖尿病襪",       CategoryIds.Stockings, 6),

        // ── 矯型護具（7）──────────────────────────────────────────────────
        new("knee-support",     "Knee Support",     "膝部護具", CategoryIds.Orthopedic, 1),
        new("back-support",     "Back Support",     "背部護具", CategoryIds.Orthopedic, 2),
        new("ankle-support",    "Ankle Support",    "踝部護具", CategoryIds.Orthopedic, 3),
        new("wrist-support",    "Wrist Support",    "腕部護具", CategoryIds.Orthopedic, 4),
        new("elbow-support",    "Elbow Support",    "肘部護具", CategoryIds.Orthopedic, 5),
        new("shoulder-support", "Shoulder Support", "肩部護具", CategoryIds.Orthopedic, 6),
        new("neck-support",     "Neck Support",     "頸部護具", CategoryIds.Orthopedic, 7),

        // ── 足部護理與鞋墊（4）────────────────────────────────────────────
        new("silicone",          "Silicone",          "矽膠系列", CategoryIds.Footcare, 1),
        new("gel",               "Gel",               "凝膠系列", CategoryIds.Footcare, 2),
        new("moisturizing",      "Moisturizing",      "保濕系列", CategoryIds.Footcare, 3),
        new("high-heel-sandals", "High Heel Sandals", "高跟鞋墊", CategoryIds.Footcare, 4),
    ];

    /// <summary>以序號產生固定 GUID，讓 seed 可重現。</summary>
    private static Guid Id(int i)       => new($"71111111-0000-0000-0000-{i:D12}");
    private static Guid TrId(int i, int locale) => new($"81111111-0000-{locale:D4}-0000-{i:D12}");

    /// <summary>slug → Id，供 legacy 匯入器對照。</summary>
    public static IReadOnlyDictionary<string, Guid> SlugToId { get; } =
        All.Select((r, i) => (r.Slug, Id(i + 1))).ToDictionary(x => x.Slug, x => x.Item2);

    public static SubCategory[] Rows() =>
        All.Select((r, i) => new SubCategory
        {
            Id         = Id(i + 1),
            CategoryId = r.CategoryId,
            Slug       = r.Slug,
            SortOrder  = r.Order,
            Status     = Common.ContentStatus.Published,
            CreatedAt  = Seed.T,
            UpdatedAt  = Seed.T,
        }).ToArray();

    public static SubCategoryTranslation[] TranslationRows() =>
        All.SelectMany((r, i) => new[]
        {
            new SubCategoryTranslation { Id = TrId(i + 1, 1), SubCategoryId = Id(i + 1), Locale = Common.Locales.En,   Name = r.En },
            new SubCategoryTranslation { Id = TrId(i + 1, 2), SubCategoryId = Id(i + 1), Locale = Common.Locales.ZhTw, Name = r.ZhTw },
        }).ToArray();
}
