using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;

namespace EuniceMed.Api.Services;

/// <summary>
/// 以 IP 分區的 token bucket。用於 <c>POST /auth/login</c> 與 <c>POST /contact</c>。
///
/// <para>
/// ⚠️ **誠實說明其極限**：本專案沒有 WAF／APIM（docs/07 §7.4），這是行程內計數器。
/// Flex Consumption 會水平擴展，每個實例各有一份 bucket，所以實際全域上限是
/// 「實例數 × TokenLimit」。要讓最壞情況是個已知數字，必須在 Function App 設定
/// <c>maximumInstanceCount</c>（見 docs/07）。
/// </para>
///
/// <para>
/// 另外，取用戶 IP 靠的是 <c>X-Forwarded-For</c>，而**在沒有 WAF 的情況下這個 header
/// 是攻擊者可控的**。這道限制是禮貌性的減速帶，不是安全控制。真正的把關是
/// reCAPTCHA（表單）與登入失敗鎖定（帳號層級，記在 DB，跨實例有效）。
/// </para>
///
/// <para>
/// ⚠️ **2026-08-17 實測：本機的 Functions Core Tools host 會把 X-Forwarded-For 剝掉**，
/// worker 收到的是空字串，於是所有請求都退回 <c>RemoteIpAddress</c>（127.0.0.1）
/// 而擠進同一個 bucket。用 <c>GET /health</c> 的 <c>client</c> 區塊可以直接看出來。
/// 這代表兩件事：
/// (1) 本機測速率限制時，分區是無效的，別被誤導；
/// (2) 上 Azure 後**必須重新確認** —— 若正式環境也收不到 XFF，這個限制就是全域共用的，
///     單一使用者連打就會擋掉所有人的登入。因此上限刻意放寬（見下方），
///     並且**不把它當成帳號安全的依靠**。
/// </para>
/// </summary>
public abstract class IpRateLimiter : IDisposable
{
    private readonly PartitionedRateLimiter<string> _limiter;

    protected IpRateLimiter(int tokenLimit, TimeSpan window)
    {
        _limiter = PartitionedRateLimiter.Create<string, string>(ip =>
            RateLimitPartition.GetTokenBucketLimiter(ip, _ => new TokenBucketRateLimiterOptions
            {
                TokenLimit          = tokenLimit,
                TokensPerPeriod     = tokenLimit,
                ReplenishmentPeriod = window,
                QueueLimit          = 0,
                AutoReplenishment   = true,
            }));
    }

    /// <summary>取得一個 token；false 表示應回 429。</summary>
    public bool TryAcquire(string partitionKey)
    {
        using var lease = _limiter.AttemptAcquire(partitionKey);
        return lease.IsAcquired;
    }

    public void Dispose() => _limiter.Dispose();

    /// <summary>
    /// 取用戶 IP。Functions 前端代理過，<c>RemoteIpAddress</c> 是平台位址，
    /// 因此取 X-Forwarded-For 的第一段（並去掉 Azure 附加的 :port）。
    /// </summary>
    public static string ClientIp(HttpRequest req)
    {
        var xff = req.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(xff))
        {
            var first = xff.Split(',')[0].Trim();
            var colon = first.LastIndexOf(':');
            // IPv4:port → 去掉 port；IPv6 含多個冒號，原樣保留
            if (colon > 0 && first.IndexOf(':') == colon) first = first[..colon];
            if (!string.IsNullOrWhiteSpace(first)) return first;
        }

        return req.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}

/// <summary>
/// 登入端點專用。
///
/// <para>
/// 上限刻意訂得比「帳號鎖定門檻」寬鬆很多（30/分 vs 連續失敗 5 次）。
/// 兩者是不同層級的控制，**不可以互相蓋掉**：
/// </para>
/// <list type="bullet">
/// <item>帳號層級的暴力破解 → 由 DB 的失敗計數與鎖定處理（跨實例有效、精確）</item>
/// <item>來源層級的洪水攻擊 → 由這個 bucket 擋（行程內、僅為減速帶）</item>
/// </list>
/// <para>
/// 初版兩者都設 5，結果是 IP 限制先觸發、**帳號鎖定永遠跑不到**，等於白寫。
/// 而且在 XFF 被剝掉的環境下所有人共用一個 bucket，5/分會讓正常使用者互相卡死。
/// </para>
/// </summary>
public sealed class LoginRateLimiter() : IpRateLimiter(tokenLimit: 30, window: TimeSpan.FromMinutes(1));

/// <summary>
/// 聯絡表單專用。訪客送表單是低頻動作，這裡可以嚴格些；
/// 真正的把關是 reCAPTCHA 與 DB 端以 <c>ContactSubmission.CreatedAt</c> 計數（Phase 7）。
/// </summary>
public sealed class ContactRateLimiter() : IpRateLimiter(tokenLimit: 10, window: TimeSpan.FromMinutes(10));
