using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Schema;

namespace EuniceMed.Api.Services;

/// <summary>一個區段的 schema 與其原始 JSON（後台要原始的來生成表單）。</summary>
public sealed record SectionSchema(string PageKey, string SectionKey, JsonSchema Schema, JsonNode Raw);

/// <summary>
/// 頁面區段的 JSON Schema 目錄。docs/09-page-blocks.md §9.1。
///
/// <para>
/// **registry 在程式碼裡，不在資料庫**：版面變更要走 PR，不是編輯者按一按就能改。
/// 檔名即 <c>{pageKey}.{sectionKey}.json</c>，以 EmbeddedResource 內嵌。
/// </para>
///
/// <para>
/// ⚠️ **啟動時只讀資源名稱清單，不 parse 任何 schema。**
/// Flex Consumption 的 app init 有 30 秒硬上限且不可調整（docs/07 §5.1）；
/// 60 個 Draft 2020-12 schema 全部 parse 會吃掉可觀的一塊，而多數請求只用到其中一頁。
/// 因此每個 key 各自 <see cref="Lazy{T}"/>，用到才 parse。
/// </para>
/// </summary>
// 命名為 PageSchemaRegistry 而非 SchemaRegistry：後者與 JsonSchema.Net 的
// Json.Schema.SchemaRegistry 同名，同時 using 兩者會產生模稜兩可的參考。
public sealed class PageSchemaRegistry
{
    private const string Marker = ".PageSchemas.";

    private readonly Dictionary<string, Lazy<SectionSchema>> _byFullKey;

    /// <summary>pageKey → 該頁所有 sectionKey（依檔名排序，即後台側欄順序）。</summary>
    public IReadOnlyDictionary<string, string[]> SectionsByPage { get; }

    public PageSchemaRegistry()
    {
        var asm = Assembly.GetExecutingAssembly();

        // 只是字串操作，沒有 I/O 也沒有 parse
        var resources = asm.GetManifestResourceNames()
            .Where(n => n.Contains(Marker, StringComparison.Ordinal)
                     && n.EndsWith(".json", StringComparison.Ordinal))
            .ToArray();

        _byFullKey = new Dictionary<string, Lazy<SectionSchema>>(StringComparer.Ordinal);
        var byPage = new Dictionary<string, List<string>>(StringComparer.Ordinal);

        foreach (var resource in resources)
        {
            // EuniceMed.Api.PageSchemas.about.milestones.json → about / milestones
            var tail = resource[(resource.IndexOf(Marker, StringComparison.Ordinal) + Marker.Length)..];
            var parts = tail[..^".json".Length].Split('.');
            if (parts.Length != 2) continue;

            var (pageKey, sectionKey) = (parts[0], parts[1]);
            var full = $"{pageKey}.{sectionKey}";

            _byFullKey[full] = new Lazy<SectionSchema>(
                () => Parse(asm, resource, pageKey, sectionKey), isThreadSafe: true);

            if (!byPage.TryGetValue(pageKey, out var list)) byPage[pageKey] = list = [];
            list.Add(sectionKey);
        }

        SectionsByPage = byPage.ToDictionary(
            kv => kv.Key,
            kv => kv.Value.OrderBy(s => s, StringComparer.Ordinal).ToArray(),
            StringComparer.Ordinal);
    }

    public bool TryGet(string pageKey, string sectionKey, out SectionSchema schema)
    {
        schema = default!;
        if (!_byFullKey.TryGetValue($"{pageKey}.{sectionKey}", out var lazy)) return false;
        schema = lazy.Value;
        return true;
    }

    public IEnumerable<SectionSchema> ForPage(string pageKey) =>
        SectionsByPage.TryGetValue(pageKey, out var keys)
            ? keys.Select(k => _byFullKey[$"{pageKey}.{k}"].Value)
            : [];

    private static SectionSchema Parse(Assembly asm, string resource, string pageKey, string sectionKey)
    {
        using var stream = asm.GetManifestResourceStream(resource)!;
        using var reader = new StreamReader(stream);
        var text = reader.ReadToEnd();

        var raw = JsonNode.Parse(text)
            ?? throw new InvalidOperationException($"{resource} 無法解析為 JSON。");

        var schema = JsonSerializer.Deserialize<JsonSchema>(text)
            ?? throw new InvalidOperationException($"{resource} 不是有效的 JSON Schema。");

        return new SectionSchema(pageKey, sectionKey, schema, raw);
    }
}
