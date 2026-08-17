namespace EuniceMed.Api.Common;

/// <summary>
/// 統一 API 回傳格式，所有端點皆回傳此結構。
/// </summary>
public sealed class ApiResponse<T>
{
    public bool     Success   { get; init; }
    public T?       Data      { get; init; }
    public string   Message   { get; init; } = string.Empty;
    public string[] Errors    { get; init; } = [];
    public string   Timestamp { get; init; } = DateTimeOffset.UtcNow.ToString("o");
}

/// <summary>
/// Static factory — 讓 Handler 程式碼保持簡潔。
/// </summary>
public static class ApiResponse
{
    public static ApiResponse<T> Ok<T>(T data, string message = "Success") =>
        new() { Success = true, Data = data, Message = message };

    public static ApiResponse<object?> Ok(string message = "Success") =>
        new() { Success = true, Data = null, Message = message };

    public static ApiResponse<object?> Fail(string message, params string[] errors) =>
        new() { Success = false, Data = null, Message = message, Errors = errors };

    public static ApiResponse<object?> Fail(string message, IEnumerable<string> errors) =>
        new() { Success = false, Data = null, Message = message, Errors = errors.ToArray() };
}
