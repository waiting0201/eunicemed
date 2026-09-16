using Microsoft.Extensions.Configuration;

namespace EuniceMed.Api.Common;

/// <summary>
/// 密碼長度下限。
///
/// <para>
/// **預設 6** —— 應客戶要求放寬（原為 12）。代價是後台密碼可以很短，而
/// `/admin` 對全網際網路開放（SWA Free 沒有 IP 限制）；唯一的補償是登入失敗
/// 5 次鎖 15 分鐘與 IP 速率限制（docs/07 §7.4）。要調嚴就設
/// `Auth__MinPasswordLength`，那是往上調的，6 是這個設定吃得下的最小值。
/// </para>
///
/// <para>
/// 四個檢查點必須讀同一個值：種子、建立使用者、更新使用者、改密碼。
/// 各自寫死的話會出現「建得起來卻改不了」這種矛盾。
/// </para>
/// </summary>
public static class PasswordPolicy
{
    public const int DefaultMinLength = 6;

    public static int MinLength(IConfiguration cfg) =>
        int.TryParse(cfg["Auth:MinPasswordLength"], out var n) && n >= DefaultMinLength
            ? n
            : DefaultMinLength;

    /// <summary>不合規時拋 400。訊息帶上實際門檻，否則使用者只能猜。</summary>
    public static void Require(string? password, IConfiguration cfg)
    {
        var min = MinLength(cfg);
        if (string.IsNullOrWhiteSpace(password) || password.Length < min)
            throw AppException.BadRequest($"密碼至少需要 {min} 個字元。");
    }
}
