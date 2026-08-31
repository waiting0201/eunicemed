using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EuniceMed.Api.Services;

/// <summary>
/// 一次驗證的結果。<paramref name="Passed"/> 決定送件進收件匣時的狀態，
/// **不決定要不要收件** —— 見 <see cref="RecaptchaVerifier"/>。
/// </summary>
/// <param name="Enabled">是否真的驗了（未設定 secret 時為 false）</param>
/// <param name="Passed">分數過門檻，或根本沒驗</param>
/// <param name="Score">v3 的 0.0–1.0 分數；v2 或驗不成時為 null</param>
/// <param name="Reason">log 與後台顯示用：ok / missing_token / verifier_unavailable / Google 回的 error-codes</param>
public sealed record RecaptchaResult(bool Enabled, bool Passed, double? Score, string Reason);

/// <summary>
/// reCAPTCHA **v3**（分數制）。docs/07 §7.4。
///
/// <para>
/// ⚠️ **低分不擋件，只標記。** 三支表單是這個站的商業目的本身，
/// 為了一個猜出來的門檻把真的詢價丟掉，比放進來幾封垃圾信貴得多。
/// 未達門檻者照樣入庫、狀態直接記成 <c>spam</c>，編輯者在收件匣用既有的狀態
/// 篩選就能複核（docs/15 §6）。
/// </para>
///
/// <para>
/// ⚠️ **驗證服務連不上時放行。** Google 掛掉、逾時、回了看不懂的東西 ——
/// 那些都是我們這邊的問題，不是送件者的問題。同理，
/// <c>Recaptcha:SecretKey</c> 未設定時整支跳過（與 <see cref="EmailSender"/> 同一個
/// 模式）：金鑰還沒拿到不該讓表單不能用。
/// </para>
/// </summary>
public sealed class RecaptchaVerifier(IConfiguration config, ILogger<RecaptchaVerifier> log)
{
    private const string DefaultVerifyUrl = "https://www.google.com/recaptcha/api/siteverify";

    /// <summary>
    /// 驗證端點。可用 <c>Recaptcha__VerifyUrl</c> 覆寫成
    /// <c>https://www.recaptcha.net/recaptcha/api/siteverify</c> ——
    /// google.com 連不到的地區（前端的腳本也要一起換網域）唯一的解法。
    /// 本機測試也靠它把請求導到假的驗證服務，才驗得到分數門檻那條分支。
    /// </summary>
    private string VerifyUrl => Nullable(config["Recaptcha:VerifyUrl"]) ?? DefaultVerifyUrl;

    /// <summary>
    /// 逾時 5 秒。送件者正在等這個請求回來，而驗證失敗本來就是放行 ——
    /// 沒有理由讓他為了 Google 的延遲多等。
    /// </summary>
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(5) };

    private string? Secret => Nullable(config["Recaptcha:SecretKey"]);

    /// <summary>本機與預覽環境可用 <c>Recaptcha__Disabled=true</c> 明確關掉。</summary>
    private bool Disabled =>
        string.Equals(config["Recaptcha:Disabled"], "true", StringComparison.OrdinalIgnoreCase);

    public bool Enabled => Secret is not null && !Disabled;

    /// <summary>低於此分數即標記為 spam。Google 的建議起點是 0.5。</summary>
    public double MinScore =>
        double.TryParse(config["Recaptcha:MinScore"], out var s) ? s : 0.5;

    public async Task<RecaptchaResult> VerifyAsync(string? token, string? remoteIp, CancellationToken ct = default)
    {
        if (!Enabled) return new RecaptchaResult(false, true, null, "not_configured");

        // 已啟用卻沒帶 token：正常的前端一定會帶，直接打 API 的機器人不會。
        // 一樣不擋件，標記起來讓人看。
        if (string.IsNullOrWhiteSpace(token))
            return new RecaptchaResult(true, false, null, "missing_token");

        try
        {
            var form = new Dictionary<string, string> { ["secret"] = Secret!, ["response"] = token };
            if (!string.IsNullOrWhiteSpace(remoteIp)) form["remoteip"] = remoteIp;

            using var res  = await Http.PostAsync(VerifyUrl, new FormUrlEncodedContent(form), ct);
            using var doc  = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
            var root = doc.RootElement;

            var success = root.TryGetProperty("success", out var ok) && ok.ValueKind == JsonValueKind.True;
            double? score = root.TryGetProperty("score", out var sc) && sc.TryGetDouble(out var v) ? v : null;

            if (!success)
            {
                var codes = root.TryGetProperty("error-codes", out var e) && e.ValueKind == JsonValueKind.Array
                    ? string.Join(",", e.EnumerateArray().Select(x => x.GetString()))
                    : string.Empty;

                log.LogInformation("reCAPTCHA rejected a submission: {Codes}", codes);
                return new RecaptchaResult(true, false, score, codes.Length == 0 ? "rejected" : codes);
            }

            // v2 的回應沒有 score 欄位；success 就是通過
            return new RecaptchaResult(true, score is null || score >= MinScore, score, "ok");
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "reCAPTCHA verification failed; letting the submission through.");
            return new RecaptchaResult(true, true, null, "verifier_unavailable");
        }
    }

    private static string? Nullable(string? v) => string.IsNullOrWhiteSpace(v) ? null : v;
}
