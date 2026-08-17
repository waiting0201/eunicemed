using Ganss.Xss;

namespace EuniceMed.Api.Services;

/// <summary>富文字的用途，決定允許的標籤集。docs/09-page-blocks.md §9.2。</summary>
public enum RichTextProfile
{
    /// <summary>一般區段 richtext</summary>
    Section,
    /// <summary>文章內文（Article.Body）</summary>
    Article,
    /// <summary>法務頁（privacy.content.body）</summary>
    Legal,
}

/// <summary>
/// 伺服器端 HTML 淨化。**白名單制**。
///
/// <para>
/// 為什麼一定要在伺服器端做：後台的 TipTap 只是編輯器，不是安全邊界 ——
/// 任何人都能繞過它直接打 <c>PUT /admin/pages/...</c>。而本站沒有 WAF
/// （docs/07 §7.4），應用層就是唯一防線。
/// </para>
///
/// <para>
/// ⚠️ **不要把 <c>svg</c> 或 <c>math</c> 加進 AllowedTags。** HtmlSanitizer 有一類
/// 已知的繞過手法建立在 foreign content 上。SVG 檔案另外走
/// <see cref="SvgSanitizer"/> 處理，兩者不要混為一談。
/// </para>
/// </summary>
public sealed class HtmlSanitizers
{
    private readonly Dictionary<RichTextProfile, HtmlSanitizer> _byProfile;

    public HtmlSanitizers()
    {
        _byProfile = new Dictionary<RichTextProfile, HtmlSanitizer>
        {
            [RichTextProfile.Section] = Build(["p", "strong", "em", "ul", "ol", "li", "a"]),

            [RichTextProfile.Article] = Build([
                "p", "h2", "h3", "strong", "em", "ul", "ol", "li",
                "blockquote", "figure", "figcaption", "img", "a",
            ]),

            [RichTextProfile.Legal] = Build([
                "p", "strong", "em", "ul", "ol", "li", "a", "h2", "h3",
            ]),
        };
    }

    public string Sanitize(string? html, RichTextProfile profile) =>
        string.IsNullOrWhiteSpace(html)
            ? string.Empty
            : _byProfile[profile].Sanitize(StripCodeElements(html));

    /// <summary>
    /// 先整棵移除 script / style / template / noscript，**連同內容**。
    ///
    /// <para>
    /// 這些元素的內容是程式碼不是文字。HtmlSanitizer 設了
    /// <c>KeepChildNodes = true</c>（我們要的：<c>&lt;h2&gt;標題&lt;/h2&gt;</c> 被移除時
    /// 「標題」兩字要留下），但那會讓 <c>&lt;script&gt;alert(1)&lt;/script&gt;</c>
    /// 變成可見的內文 "alert(1)"。安全上無害，但等於讓攻擊者把任意字串
    /// 顯示在頁面上，且編輯者會困惑。
    /// </para>
    /// </summary>
    private static readonly string[] CodeElements = ["script", "style", "template", "noscript"];

    private static string StripCodeElements(string html)
    {
        var parser = new AngleSharp.Html.Parser.HtmlParser();
        var doc = parser.ParseDocument($"<div id=\"__root\">{html}</div>");

        foreach (var name in CodeElements)
            foreach (var el in doc.QuerySelectorAll(name).ToArray())
                el.Remove();

        return doc.GetElementById("__root")?.InnerHtml ?? string.Empty;
    }

    private static HtmlSanitizer Build(string[] allowedTags)
    {
        var s = new HtmlSanitizer();

        s.AllowedTags.Clear();
        foreach (var tag in allowedTags) s.AllowedTags.Add(tag);

        s.AllowedAttributes.Clear();
        s.AllowedAttributes.Add("href");
        s.AllowedAttributes.Add("title");
        if (allowedTags.Contains("img"))
        {
            s.AllowedAttributes.Add("src");
            s.AllowedAttributes.Add("alt");
            s.AllowedAttributes.Add("width");
            s.AllowedAttributes.Add("height");
            s.AllowedAttributes.Add("loading");
        }

        // 連 class 都不留：版面由模板決定，編輯者塞進來的 class 只會製造
        // 「這頁為什麼長得不一樣」的除錯成本。
        s.AllowedCssProperties.Clear();
        s.AllowedSchemes.Clear();
        s.AllowedSchemes.Add("https");
        s.AllowedSchemes.Add("mailto");
        s.AllowedSchemes.Add("tel");

        // 站內相對連結不帶 scheme，必須放行
        s.AllowedAtRules.Clear();
        s.KeepChildNodes = true;   // 移除標籤時保留文字，不要整段消失

        // 外部連結強制加 rel/target（docs/09 §9.2）。
        // rel="noopener" 是必要的：沒有它，target="_blank" 開出去的頁面
        // 可以透過 window.opener 改寫來源分頁。
        s.PostProcessNode += (_, e) =>
        {
            if (e.Node is not AngleSharp.Html.Dom.IHtmlAnchorElement a) return;

            var href = a.GetAttribute("href");
            if (href is null) return;

            var external = href.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                        || href.StartsWith("https://", StringComparison.OrdinalIgnoreCase);

            if (!external) return;

            a.SetAttribute("rel", "noopener noreferrer");
            a.SetAttribute("target", "_blank");
        };

        return s;
    }
}

/// <summary>
/// SVG 檔案淨化。只有 <c>logo-mark</c> preset 接受 SVG。
///
/// <para>
/// **本專案沒有病毒掃描**（Defender for Storage 不在方案內，docs/03 §6），
/// 所以格式白名單與這支清洗器是唯一防線。SVG 是 XML，可以內嵌 script、
/// 外部參照與 CSS import —— 當成圖片直接存進公開容器等於開放 XSS。
/// </para>
/// </summary>
public static class SvgSanitizer
{
    private static readonly string[] ForbiddenElements =
        ["script", "foreignObject", "iframe", "embed", "object", "animate", "set", "handler"];

    public static string Sanitize(string svg)
    {
        var parser = new AngleSharp.Html.Parser.HtmlParser();
        var doc = parser.ParseDocument($"<div>{svg}</div>");

        foreach (var name in ForbiddenElements)
            foreach (var el in doc.QuerySelectorAll(name).ToArray())
                el.Remove();

        foreach (var el in doc.All.ToArray())
        {
            foreach (var attr in el.Attributes.ToArray())
            {
                var n = attr.Name.ToLowerInvariant();

                // 所有事件處理器
                if (n.StartsWith("on", StringComparison.Ordinal)) { el.RemoveAttribute(attr.Name); continue; }

                // 外部參照：只允許同文件的片段引用（#id）
                if (n is "href" or "xlink:href" && !attr.Value.StartsWith('#'))
                    el.RemoveAttribute(attr.Name);

                // style 內的 url() 與 @import
                if (n == "style" && (attr.Value.Contains("url(", StringComparison.OrdinalIgnoreCase)
                                  || attr.Value.Contains("@import", StringComparison.OrdinalIgnoreCase)))
                    el.RemoveAttribute(attr.Name);
            }

            if (el.TagName.Equals("style", StringComparison.OrdinalIgnoreCase)
                && (el.TextContent.Contains("@import", StringComparison.OrdinalIgnoreCase)
                 || el.TextContent.Contains("url(", StringComparison.OrdinalIgnoreCase)))
                el.Remove();
        }

        return doc.Body?.FirstElementChild?.InnerHtml ?? string.Empty;
    }
}
