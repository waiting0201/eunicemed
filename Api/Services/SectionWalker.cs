using System.Text.Json.Nodes;

namespace EuniceMed.Api.Services;

/// <summary>在區段內容中找到的一個媒體引用。</summary>
public sealed record MediaRef(string FieldPath, Guid MediaId);

/// <summary>媒體欄位 + schema 宣告的預期 preset。</summary>
public sealed record MediaPresetRef(string FieldPath, Guid MediaId, string ExpectedPreset);

/// <summary>在區段內容中找到的一個實體引用（<c>ref:Entity</c>）。</summary>
public sealed record EntityRef(string FieldPath, string EntityType, string Identifier);

/// <summary>
/// 依 schema 與內容同步遞迴，找出媒體與實體引用。
///
/// <para>
/// ⚠️ **絕對不要用 regex 掃 GUID 形狀的字串。** 文章 HTML、`SizeChartJson` 的值、
/// 任何未來欄位都可能剛好含有 GUID，那會造出幽靈 <c>MediaUsage</c>，
/// 然後刪除媒體時被 409 擋住卻查不出原因。
/// 唯一可靠的判準是 schema 上的 <c>x-fieldType: "media"</c>。
/// </para>
///
/// <para>
/// 同一支 walker **用在兩個方向**：
/// 寫入時產生 <c>MediaUsage</c> 列；讀取時把那些節點換成解析後的 URL 物件。
/// 寫一次用兩次，也保證兩邊看到的欄位集合完全一致。
/// </para>
/// </summary>
public static class SectionWalker
{
    /// <summary>找出所有媒體引用，FieldPath 形如 <c>milestones[2].image</c>。</summary>
    public static List<MediaRef> FindMedia(JsonNode schema, JsonNode? data)
    {
        var found = new List<MediaRef>();
        Walk(schema, data, "", (path, node, fieldType, _) =>
        {
            if (fieldType != "media") return;
            if (node?.GetValue<string>() is { Length: > 0 } s && Guid.TryParse(s, out var id))
                found.Add(new MediaRef(path, id));
        });
        return found;
    }

    /// <summary>找出所有 <c>ref:Entity</c> 引用。</summary>
    public static List<EntityRef> FindRefs(JsonNode schema, JsonNode? data)
    {
        var found = new List<EntityRef>();
        Walk(schema, data, "", (path, node, fieldType, refEntity) =>
        {
            if (fieldType != "ref" || refEntity is null) return;
            if (node?.GetValue<string>() is { Length: > 0 } s)
                found.Add(new EntityRef(path, refEntity, s));
        });
        return found;
    }

    /// <summary>
    /// 把媒體節點就地換成解析後的物件（公開端點用）。
    /// 找不到對應媒體的引用會被移除 —— 回一個死的 mediaId 給前端沒有意義。
    /// </summary>
    public static void ResolveMedia(JsonNode schema, JsonNode? data, Func<Guid, JsonNode?> resolve)
    {
        foreach (var m in FindMedia(schema, data))
        {
            var parent = Locate(data, m.FieldPath, out var leaf);
            if (parent is null || leaf is null) continue;

            var resolved = resolve(m.MediaId);

            switch (parent)
            {
                case JsonObject o: if (resolved is null) o.Remove(leaf); else o[leaf] = resolved; break;
                case JsonArray a when int.TryParse(leaf, out var i) && i < a.Count: a[i] = resolved; break;
            }
        }
    }

    /// <summary>
    /// 就地淨化所有 <c>x-fieldType: "richtext"</c> 欄位。
    ///
    /// <para>
    /// 與媒體同樣由 schema 驅動 —— 這樣新增一個 richtext 欄位時**不需要**
    /// 記得去某個清單登記，漏掉一個就是一個 XSS 破口。
    /// </para>
    /// </summary>
    public static void SanitizeRichText(JsonNode schema, JsonNode? data, Func<string, string> sanitize)
    {
        var targets = new List<string>();
        Walk(schema, data, "", (path, node, fieldType, _) =>
        {
            if (fieldType == "richtext" && node is not null) targets.Add(path);
        });

        foreach (var path in targets)
        {
            var parent = Locate(data, path, out var leaf);
            if (parent is null || leaf is null) continue;

            switch (parent)
            {
                case JsonObject o when o[leaf]?.GetValue<string>() is { } html:
                    o[leaf] = sanitize(html);
                    break;
                case JsonArray a when int.TryParse(leaf, out var i) && i < a.Count
                                      && a[i]?.GetValue<string>() is { } arrHtml:
                    a[i] = sanitize(arrHtml);
                    break;
            }
        }
    }

    /// <summary>
    /// 找出媒體欄位以及 schema 宣告的預期 preset（<c>x-mediaPreset</c>）。
    ///
    /// <para>
    /// 用來擋「把 square 的圖放進 16:9 的版位」——
    /// schema 一直有宣告該欄位要哪個 preset，但沒有人比對過，
    /// 存得下去、然後在前台被裁切或拉伸，而編輯者只會覺得「圖怎麼怪怪的」。
    /// </para>
    /// </summary>
    public static List<MediaPresetRef> FindMediaPresets(JsonNode schema, JsonNode? data)
    {
        var found = new List<MediaPresetRef>();
        WalkCore(schema, data, "", (path, value, schemaNode, _) =>
        {
            if (schemaNode?["x-fieldType"]?.GetValue<string>() != "media") return;
            if (schemaNode["x-mediaPreset"]?.GetValue<string>() is not { Length: > 0 } preset) return;
            if (value?.GetValue<string>() is { Length: > 0 } raw && Guid.TryParse(raw, out var id))
                found.Add(new MediaPresetRef(path, id, preset));
        });
        return found;
    }

    /// <summary>找出所有標了 <c>x-localeInvariant</c> 的欄位路徑（跨語系同步用）。</summary>
    public static List<string> FindLocaleInvariantPaths(JsonNode schema, JsonNode? data)
    {
        var paths = new List<string>();
        WalkCore(schema, data, "", (path, _, node, __) =>
        {
            if (node?["x-localeInvariant"]?.GetValue<bool>() == true) paths.Add(path);
        });
        return paths;
    }

    // ── 遞迴核心 ───────────────────────────────────────────────────────────

    private static void Walk(
        JsonNode schema, JsonNode? data, string path,
        Action<string, JsonNode?, string?, string?> onLeaf)
    {
        WalkCore(schema, data, path, (p, value, schemaNode, _) =>
        {
            var fieldType = schemaNode?["x-fieldType"]?.GetValue<string>();
            var refEntity = schemaNode?["x-refEntity"]?.GetValue<string>();
            if (fieldType is not null) onLeaf(p, value, fieldType, refEntity);
        });
    }

    /// <summary>
    /// schema 與 instance 同步遞迴。回呼帶：路徑、實例節點、schema 節點、是否為陣列項。
    /// </summary>
    private static void WalkCore(
        JsonNode? schemaNode, JsonNode? data, string path,
        Action<string, JsonNode?, JsonNode?, bool> visit)
    {
        if (schemaNode is null) return;

        visit(path, data, schemaNode, false);

        // 物件：逐個 properties 往下
        if (schemaNode["properties"] is JsonObject props)
        {
            foreach (var (name, child) in props)
            {
                var childData = data is JsonObject o ? o[name] : null;
                var childPath = path.Length == 0 ? name : $"{path}.{name}";
                WalkCore(child, childData, childPath, visit);
            }
        }

        // 陣列：schema 只有一份 items，實例有 N 個 —— 逐項套用同一份 schema
        if (schemaNode["items"] is { } itemSchema && data is JsonArray arr)
        {
            for (var i = 0; i < arr.Count; i++)
                WalkCore(itemSchema, arr[i], $"{path}[{i}]", visit);
        }
    }

    /// <summary>依 <c>a.b[2].c</c> 形式的路徑找到父節點與最後一段。</summary>
    private static JsonNode? Locate(JsonNode? root, string path, out string? leaf)
    {
        leaf = null;
        if (root is null || path.Length == 0) return null;

        var segments = Tokenize(path);
        JsonNode? current = root;

        for (var i = 0; i < segments.Count - 1; i++)
        {
            current = segments[i] is var seg && int.TryParse(seg, out var idx)
                ? (current as JsonArray)?[idx]
                : (current as JsonObject)?[seg];

            if (current is null) return null;
        }

        leaf = segments[^1];
        return current;
    }

    private static List<string> Tokenize(string path)
    {
        var parts = new List<string>();
        foreach (var chunk in path.Split('.'))
        {
            var name = chunk;
            while (name.IndexOf('[') is var open && open >= 0)
            {
                var close = name.IndexOf(']', open);
                if (close < 0) break;

                if (open > 0) parts.Add(name[..open]);
                parts.Add(name[(open + 1)..close]);
                name = name[(close + 1)..];
            }
            if (name.Length > 0) parts.Add(name);
        }
        return parts;
    }
}
