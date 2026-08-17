namespace EuniceMed.Api.Common;

public enum FacetDimension { Category, SubCategory, Collection, BodyPart }

/// <summary>投影出來的最小候選列 —— 只帶折算 facet 需要的欄位。</summary>
public sealed record FacetRow(
    string   CategorySlug,
    string?  SubCategorySlug,
    string?  CollectionSlug,
    string[] BodyPartSlugs);

/// <summary>產品列表的篩選條件（皆為 slug；null = 未篩選）。</summary>
public sealed record ProductFilter(
    string? Category    = null,
    string? SubCategory = null,
    string? Collection  = null,
    string? BodyPart    = null)
{
    public ProductFilter Without(FacetDimension d) => d switch
    {
        FacetDimension.Category    => this with { Category    = null },
        FacetDimension.SubCategory => this with { SubCategory = null },
        FacetDimension.Collection  => this with { Collection  = null },
        FacetDimension.BodyPart    => this with { BodyPart    = null },
        _                          => this,
    };

    public bool Matches(FacetRow r) =>
        (Category    is null || r.CategorySlug    == Category)
     && (SubCategory is null || r.SubCategorySlug == SubCategory)
     && (Collection  is null || r.CollectionSlug  == Collection)
     && (BodyPart    is null || r.BodyPartSlugs.Contains(BodyPart));
}

public sealed record FacetCount(string Slug, string Label, int Count);

/// <summary>
/// 分面計數。docs/04-api.md §4 的規則：
/// **某個維度的計數不受「該維度自身的篩選」影響，但受其他維度的篩選影響。**
/// （選了 Medical 之後，categories facet 仍要顯示全部三類的數字，
///  但 subCategories facet 要收斂到 Medical 底下。）
///
/// <para>
/// 這條規則代表每個維度需要**不同的篩選基準**，因此無法用單一個 <c>GROUP BY</c> 表達。
/// 做法是投影候選集後在記憶體折算：
/// </para>
/// <list type="bullet">
/// <item>目錄只有 149 筆產品，投影是 3 個 slug + 一個小陣列，一次往返、遠低於 20KB。</item>
/// <item>折算是純函式，排除規則濃縮成 <c>filter.Without(dimension)</c> 一行 —— 這條規則
///       寫錯很難從畫面上看出來，做成可單獨推理的純函式才驗得了。</item>
/// <item>此法在約 5,000 筆以內都成立。超過時的等價做法是一道含四個
///       <c>UNION ALL</c> 分組子查詢的 SQL（仍是一次往返、四個 GROUP BY）。</item>
/// </list>
///
/// <para>
/// 兩個容易被當成 bug 的正確行為：
/// <c>bodyParts</c> 是多值欄位，其計數總和**會大於** <c>total</c>；
/// 而且所有 facet 計數都**完全忽略分頁**。
/// </para>
/// </summary>
public static class FacetFolder
{
    public static Dictionary<string, FacetCount[]> Compute(
        IReadOnlyList<FacetRow>              rows,
        ProductFilter                        filter,
        IReadOnlyDictionary<string, string>  categoryLabels,
        IReadOnlyDictionary<string, string>  subCategoryLabels,
        IReadOnlyDictionary<string, string>  collectionLabels,
        IReadOnlyDictionary<string, string>  bodyPartLabels)
    {
        return new Dictionary<string, FacetCount[]>
        {
            ["categories"]    = Single(rows, filter, FacetDimension.Category,    r => r.CategorySlug,    categoryLabels),
            ["subCategories"] = Single(rows, filter, FacetDimension.SubCategory, r => r.SubCategorySlug, subCategoryLabels),
            ["collections"]   = Single(rows, filter, FacetDimension.Collection,  r => r.CollectionSlug,  collectionLabels),
            ["bodyParts"]     = Multi (rows, filter, FacetDimension.BodyPart,    r => r.BodyPartSlugs,   bodyPartLabels),
        };
    }

    /// <summary>單值維度（分類／子分類／系列）。</summary>
    private static FacetCount[] Single(
        IReadOnlyList<FacetRow>             rows,
        ProductFilter                       filter,
        FacetDimension                      dimension,
        Func<FacetRow, string?>             select,
        IReadOnlyDictionary<string, string> labels)
    {
        var basis = filter.Without(dimension);

        return rows.Where(basis.Matches)
                   .Select(select)
                   .Where(s => s is not null)
                   .GroupBy(s => s!)
                   .Select(g => new FacetCount(g.Key, Label(labels, g.Key), g.Count()))
                   .OrderByDescending(f => f.Count).ThenBy(f => f.Slug)
                   .ToArray();
    }

    /// <summary>多值維度（適用部位）。一筆產品可落在多個 slug，計數總和會大於 total。</summary>
    private static FacetCount[] Multi(
        IReadOnlyList<FacetRow>             rows,
        ProductFilter                       filter,
        FacetDimension                      dimension,
        Func<FacetRow, string[]>            select,
        IReadOnlyDictionary<string, string> labels)
    {
        var basis = filter.Without(dimension);

        return rows.Where(basis.Matches)
                   .SelectMany(select)
                   .GroupBy(s => s)
                   .Select(g => new FacetCount(g.Key, Label(labels, g.Key), g.Count()))
                   .OrderByDescending(f => f.Count).ThenBy(f => f.Slug)
                   .ToArray();
    }

    private static string Label(IReadOnlyDictionary<string, string> labels, string slug) =>
        labels.TryGetValue(slug, out var l) ? l : slug;
}
