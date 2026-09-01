using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace EuniceMed.Api.Services;

/// <summary>
/// 表單通知信。走品牌方既有信箱的 SMTP（本案沒有 Azure Communication Services）。
///
/// <para>
/// ⚠️ **`Smtp:Host` 沒設定時就整個跳過寄信，只記一行 log。這是預設模式，不是降級。**
/// 帳密至今未取得（CLAUDE.md §7 🔴 第一條），但表單沒有理由為了一組還沒拿到的密碼
/// 整支不能用 —— 收件匣才是這三支表單的真相來源，信只是通知。
/// 帳密到手時在 Function App 設 <c>Smtp__Host</c> 就會自動開始寄，程式碼一行都不用改。
/// </para>
///
/// <para>
/// 呼叫端**必須先入庫再寄信**，且寄信失敗不得回錯（CLAUDE.md §7 已封閉決議）。
/// 這支因此永遠不丟例外：寄不出去是我們的問題，不是送件者的問題。
/// </para>
/// </summary>
public sealed class EmailSender(IConfiguration config, ILogger<EmailSender> log)
{
    private string? Host => Nullable(config["Smtp:Host"]);

    /// <summary>SMTP 是否已設定。未設定時 <see cref="SendAsync"/> 只記 log。</summary>
    public bool Enabled => Host is not null;

    /// <param name="replyTo">
    /// 收件匣按「回覆」時要回給誰。<b>From 不能拿來裝送件人</b> —— 它必須是 relay 已驗證的
    /// 網域，填別人的信箱會被 SPF/DMARC 擋下（決議見 docs/07 §6.3：客戶網域的 DNS 我們動不了，
    /// 寄件網域是我們自己的）。所以「回覆詢問者」這件事只能靠 Reply-To。
    /// </param>
    public async Task SendAsync(string subject, string body, string? replyTo = null, CancellationToken ct = default)
    {
        if (Host is not { } host)
        {
            log.LogInformation("SMTP not configured; skipping notification: {Subject}", subject);
            return;
        }

        var from = Nullable(config["Smtp:From"]) ?? "no-reply@eunicemed.com";
        var to   = Nullable(config["Smtp:To"]);

        if (to is null)
        {
            log.LogWarning("Smtp:Host is set but Smtp:To is not; nowhere to send {Subject}", subject);
            return;
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(MailboxAddress.Parse(from));
            foreach (var address in to.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                message.To.Add(MailboxAddress.Parse(address));
            if (Nullable(replyTo) is { } reply && MailboxAddress.TryParse(reply, out var replyAddress))
                message.ReplyTo.Add(replyAddress);

            message.Subject = subject;
            message.Body    = new TextPart("plain") { Text = body };

            var port = int.TryParse(config["Smtp:Port"], out var p) ? p : 587;
            // EnableSsl 為 true 走 implicit TLS（465）；否則 STARTTLS（587）。
            // 明文送出去是不能接受的，所以沒有「都不加密」這個選項
            var secure = string.Equals(config["Smtp:EnableSsl"], "true", StringComparison.OrdinalIgnoreCase)
                ? SecureSocketOptions.SslOnConnect
                : SecureSocketOptions.StartTls;

            using var client = new SmtpClient();
            await client.ConnectAsync(host, port, secure, ct);

            if (Nullable(config["Smtp:Username"]) is { } user)
                await client.AuthenticateAsync(user, config["Smtp:Password"] ?? string.Empty, ct);

            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);
        }
        catch (Exception ex)
        {
            // 送件者已經看到成功了，而且資料已經進 DB —— 這裡丟例外只會把
            // 「信沒寄出」升級成「表單壞掉」
            log.LogError(ex, "Failed to send notification: {Subject}", subject);
        }
    }

    private static string? Nullable(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
