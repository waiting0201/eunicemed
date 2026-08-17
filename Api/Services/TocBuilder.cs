using EuniceMed.Api.Common;
using EuniceMed.Api.Models.Dtos;

namespace EuniceMed.Api.Services;

/// <summary>
/// 由文章內文的 H2 產生側欄目錄，**並把 anchor id 回填進 HTML**。
///
/// <para>
/// 為什麼在伺服器端做而不是存成欄位（docs/04 §4）：目錄必須與內文永遠一致。
/// 存成欄位就有兩份真相 —— 編輯者改了一個標題卻沒重存目錄，錨點就死了，
/// 而這種壞掉不會有任何錯誤訊息。從內文推導則不可能不一致。
/// </para>
///
/// <para>
/// ⚠️ 回填是必要的一半。只回傳 <c>[{id,text}]</c> 而不改 HTML 的話，
/// 前端點目錄會跳到一個不存在的錨點。兩件事必須同一個函式做。
/// </para>
/// </summary>
public static class TocBuilder
{
    public sealed record Result(string Html, TocItemDto[] Toc);

    public static Result Build(string? html)
    {
        if (string.IsNullOrWhiteSpace(html)) return new Result(string.Empty, []);

        var parser = new AngleSharp.Html.Parser.HtmlParser();
        var doc    = parser.ParseDocument($"<div id=\"__root\">{html}</div>");

        var used  = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var items = new List<TocItemDto>();
        var index = 0;

        foreach (var h2 in doc.QuerySelectorAll("h2"))
        {
            index++;
            var text = h2.TextContent.Trim();
            if (text.Length == 0) continue;

            // 既有 id 優先沿用 —— 外部連結可能已經指著它，改掉會讓那些連結失效。
            var id = string.IsNullOrWhiteSpace(h2.Id) ? Anchor(text, index) : h2.Id.Trim();

            // 同名標題在同一篇文章內是常見的（例如兩個「注意事項」），
            // 不去重的話兩個錨點會指到同一處。
            var unique = id;
            for (var n = 2; !used.Add(unique); n++) unique = $"{id}-{n}";

            h2.Id = unique;
            items.Add(new TocItemDto(unique, text));
        }

        var root = doc.GetElementById("__root");
        return new Result(root?.InnerHtml ?? html, [.. items]);
    }

    /// <summary>
    /// Slugify 會把 CJK 整段濾掉並退回 "item"，中文站的每個標題都會撞在一起。
    /// 這種情況直接改用序號 —— 錨點只需要穩定與唯一，不需要好看。
    /// </summary>
    private static string Anchor(string text, int index)
    {
        var slug = Slugify.Make(text, fallback: "");
        return slug.Length == 0 ? $"section-{index}" : slug;
    }
}
