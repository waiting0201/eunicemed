using EuniceMed.Api.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace EuniceMed.Api.Middleware;

/// <summary>
/// 全域例外處理 Middleware。
/// 使用 IFunctionsWorkerMiddleware + context.GetHttpContext()
/// 因為採用 ConfigureFunctionsWebApplication（ASP.NET Core Integration）。
///
/// 本專案沒有 Application Insights（docs/07-azure-deployment.md §8），
/// 所以每一筆錯誤都必須把 traceId 一併寫進結構化 log，
/// 才能在 Function App 的 log stream 用回應裡的 traceId 反查。
/// </summary>
public sealed class ExceptionMiddleware(ILogger<ExceptionMiddleware> logger) : IFunctionsWorkerMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy   = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented          = false,
    };

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var traceId = context.GetHttpContext()?.TraceIdentifier ?? context.InvocationId;

        using (logger.BeginScope(new Dictionary<string, object> { ["traceId"] = traceId }))
        {
            try
            {
                await next(context);
            }
            catch (AppException appEx)
            {
                logger.LogWarning(appEx, "AppException [{StatusCode}] traceId={TraceId}: {Message}",
                    appEx.StatusCode, traceId, appEx.Message);
                await WriteErrorAsync(context, appEx.StatusCode, appEx.Message, appEx.Message, traceId);
            }
            catch (DbUpdateConcurrencyException dbEx)
            {
                // rowVersion 不符 —— 另一位編輯者已先存檔
                logger.LogWarning(dbEx, "Concurrency conflict traceId={TraceId}", traceId);
                await WriteErrorAsync(context, 409,
                    "此筆資料已被其他人修改，請重新載入後再試。", "Concurrency conflict.", traceId);
            }
            catch (InvalidOperationException ioEx)
                when (ioEx.Message.Contains("Incorrect Content-Type", StringComparison.OrdinalIgnoreCase))
            {
                // ReadFormAsync 對非 multipart/form-data 或 x-www-form-urlencoded 請求拋此例外
                logger.LogWarning(ioEx, "Form parse failed in [{Function}] traceId={TraceId}",
                    context.FunctionDefinition.Name, traceId);
                await WriteErrorAsync(context, 400,
                    "請求需為 multipart/form-data 或 application/x-www-form-urlencoded。",
                    ioEx.Message, traceId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unhandled exception in [{Function}] traceId={TraceId}",
                    context.FunctionDefinition.Name, traceId);
                await WriteErrorAsync(context, 500,
                    "An unexpected error occurred.", "Internal server error.", traceId);
            }
        }
    }

    private static async Task WriteErrorAsync(
        FunctionContext context,
        int             statusCode,
        string          message,
        string          errorDetail,
        string          traceId)
    {
        var httpContext = context.GetHttpContext();
        if (httpContext is null || httpContext.Response.HasStarted) return;

        var body = JsonSerializer.Serialize(
            ApiResponse.Fail(message, errorDetail, $"traceId:{traceId}"), JsonOptions);

        httpContext.Response.StatusCode  = statusCode;
        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(body);
    }
}
