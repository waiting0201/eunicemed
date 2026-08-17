namespace EuniceMed.Api.Common;

/// <summary>主表 + 翻譯表配對後的結果。</summary>
public readonly record struct Localized<TEntity, TTranslation>(TEntity Entity, TTranslation Tr);

/// <summary>翻譯列：一定有 Locale。</summary>
public interface ILocalized
{
    string Locale { get; }
}

/// <summary>有翻譯表的主實體。</summary>
public interface ITranslatable<TTranslation> where TTranslation : ILocalized
{
    ICollection<TTranslation> Translations { get; }
}

/// <summary>
/// 多語系查詢 —— 全站語言純度原則的唯一實作點。
///
/// <para>
/// docs/08-design.md §5.2：缺該語系翻譯的內容 **整塊隱藏，不 fallback 露出他語**。
/// 這裡用 <c>SelectMany</c> 打在「已過濾的集合導覽」上，EF Core 會翻成
/// <c>INNER JOIN XxxTranslation t ON t.XxxId = e.Id AND t.Locale = @locale</c>，
/// 缺翻譯的列自然從結果消失 —— 規則由查詢形狀保證，不靠開發者自律。
/// </para>
///
/// <para>
/// ⚠️ 前提：每個 <c>Locale</c> 屬性都必須在 EntityTypeConfiguration 設
/// <c>.HasColumnType("varchar(10)").IsUnicode(false)</c>。否則 EF 會送 NVARCHAR 參數，
/// SQL Server 在欄位側加隱含轉換，UX_XxxTr 索引直接失效，每個公開請求都變成掃描。
/// 這個錯誤不會有任何錯誤訊息，只會慢。
/// </para>
/// </summary>
public static class LocaleQuery
{
    public static IQueryable<Localized<TEntity, TTranslation>> WithLocale<TEntity, TTranslation>(
        this IQueryable<TEntity> source,
        string locale)
        where TEntity : class, ITranslatable<TTranslation>
        where TTranslation : class, ILocalized
        => source.SelectMany(
            e => e.Translations.Where(t => t.Locale == locale),
            (e, t) => new Localized<TEntity, TTranslation>(e, t));
}
