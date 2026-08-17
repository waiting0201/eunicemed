namespace EuniceMed.Api.Common;

/// <summary>
/// 分頁查詢結果包裝器，用於所有列表 API 的分頁回傳格式。
/// </summary>
public sealed record PagedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages);
