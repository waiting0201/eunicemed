using System.Data;
using Dapper;
using EuniceMed.Api.Models.Dtos;

namespace EuniceMed.Api.Services.Dapper;

public interface ICollectionReadService
{
    Task<IReadOnlyList<CollectionDto>> GetAllAsync(string locale);
    Task<CollectionDto?> GetBySlugAsync(string slug, string locale);
}

/// <summary>
/// 系列讀取。公開端點一律 Dapper（EF 只負責寫入）。
///
/// ⚠️ Locale 參數必須以 <see cref="DbType.AnsiString"/> 傳送。
/// DB 欄位是 varchar(10)；若送成 NVARCHAR，SQL Server 會在欄位側加隱含轉換，
/// UX_CollectionTr 索引失效。此規則適用本專案每一支 read service。
/// </summary>
public sealed class CollectionReadService(IDbConnection db) : ICollectionReadService
{
    private const string BaseSql = """
        SELECT  c.Slug          AS Slug,
                t.Name          AS Name,
                t.Description   AS Description,
                c.Strength      AS Strength,
                c.SortOrder     AS SortOrder
        FROM    Collections c
                INNER JOIN CollectionTranslations t
                    ON t.CollectionId = c.Id
                   AND t.Locale = @locale
        """;

    public async Task<IReadOnlyList<CollectionDto>> GetAllAsync(string locale)
    {
        var rows = await db.QueryAsync<CollectionDto>(
            $"{BaseSql} ORDER BY c.SortOrder",
            LocaleParam(locale));

        return rows.AsList();
    }

    public async Task<CollectionDto?> GetBySlugAsync(string slug, string locale)
    {
        var p = LocaleParam(locale);
        p.Add("@slug", slug, DbType.String, size: 120);

        return await db.QueryFirstOrDefaultAsync<CollectionDto>(
            $"{BaseSql} AND c.Slug = @slug", p);
    }

    private static DynamicParameters LocaleParam(string locale)
    {
        var p = new DynamicParameters();
        p.Add("@locale", locale, DbType.AnsiString, size: 10);
        return p;
    }
}
