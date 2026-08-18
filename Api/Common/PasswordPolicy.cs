using Microsoft.Extensions.Configuration;

namespace EuniceMed.Api.Common;

/// <summary>
/// 密碼長度下限。
///
/// <para>
/// **預設 12，正式環境不要調低。** 之所以做成可設定，是為了讓本機用短一點的
/// 開發帳密（`local.settings.json` 設 8）—— 而不是把正式站的下限一起放寬。
/// 沒有這一層的話，「我本機想用短密碼」就會變成改動全站的安全門檻。
/// </para>
///
/// <para>
/// 四個檢查點必須讀同一個值：種子、建立使用者、更新使用者、改密碼。
/// 各自寫死的話會出現「建得起來卻改不了」這種矛盾。
/// </para>
/// </summary>
public static class PasswordPolicy
{
    public const int DefaultMinLength = 12;

    public static int MinLength(IConfiguration cfg) =>
        int.TryParse(cfg["Auth:MinPasswordLength"], out var n) && n >= 8
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
