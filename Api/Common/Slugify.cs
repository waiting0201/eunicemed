using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace EuniceMed.Api.Common;

/// <summary>
/// URL slug 產生。
///
/// <para>
/// 只處理拉丁文字：**中文字元一律移除**，不做音譯。
/// 理由是本站的 slug 是語系不變的（docs/05 §1：slug 在主表、跨語系共用），
/// 而 URL 一律取英文名稱產生。若中文名稱產出空字串，呼叫端必須自行處理
/// （匯入器會退回 <c>item</c> 加流水號，後台則要求編輯者手填）。
/// </para>
/// </summary>
public static partial class Slugify
{
    public static string Make(string input, string fallback = "item")
    {
        if (string.IsNullOrWhiteSpace(input)) return fallback;

        // 拆解重音字元：café → cafe
        var normalized = input.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);

        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark) continue;
            sb.Append(ch);
        }

        var s = sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();

        s = NonSlugChars().Replace(s, "-");   // 非 a-z0-9 一律轉連字號
        s = MultiDash().Replace(s, "-");
        s = s.Trim('-');

        return string.IsNullOrEmpty(s) ? fallback : s;
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonSlugChars();

    [GeneratedRegex("-{2,}")]
    private static partial Regex MultiDash();
}
