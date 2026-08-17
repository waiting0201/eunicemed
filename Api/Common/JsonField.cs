using System.Text.Json;
using System.Text.Json.Nodes;

namespace EuniceMed.Api.Common;

/// <summary>
/// <c>*Json</c> 欄位的解析。
///
/// <para>
/// 命名為 <c>JsonField</c> 而非 <c>Json</c>：後者會與 <c>System.Text.Json</c> 命名空間撞名，
/// 在同時 using 兩者的檔案裡 <c>Json.Parse</c> 會解析成命名空間而編譯失敗。
/// </para>
///
/// <para>
/// 這些欄位在 DB 是 <c>NVARCHAR(MAX)</c> 字串，**刻意不用 EF 的 <c>.ToJson()</c> owned entity
/// 或 value converter**（docs/05 §6）：驗證是靠 JSON Schema 而非 CLR 型別，
/// 而 converter 少配 <c>ValueComparer</c> 會讓變更追蹤靜默漏掉編輯。
/// 因此在對映層才解析成 <see cref="JsonNode"/> 直接放進回應。
/// </para>
/// </summary>
public static class JsonField
{
    /// <summary>資料庫存的 JSON 字串 → 可直接序列化進回應的節點。壞資料回 null 而非拋例外。</summary>
    public static JsonNode? Parse(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;

        try
        {
            return JsonNode.Parse(raw);
        }
        catch (JsonException)
        {
            // 舊資料或手改 DB 造成的壞 JSON 不該讓整個端點 500。
            // 寫入路徑有 JSON Schema 驗證把關，這裡只做防禦。
            return null;
        }
    }

    /// <summary>
    /// 把 <c>stats[].value</c> 為 "auto" 的項目換成實際數字（docs/04 §4）。
    /// 形狀為 <c>[{value,label}]</c>；非該形狀時原樣回傳。
    /// </summary>
    public static JsonNode? SubstituteAutoStats(JsonNode? stats, int actualCount)
    {
        if (stats is not JsonArray arr) return stats;

        foreach (var item in arr)
        {
            if (item is JsonObject o
                && o["value"]?.GetValue<string>() is "auto")
            {
                o["value"] = actualCount.ToString();
            }
        }

        return arr;
    }
}
