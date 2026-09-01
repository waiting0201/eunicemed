import type { JsonLdNode } from '@/lib/schema';

/**
 * 輸出一段 JSON-LD。
 *
 * <p>
 * `</script>` 會提早關掉標籤，所以序列化後一律把 `<` 轉成 `\u003c` ——
 * 內容來自 CMS（產品敘述、FAQ 答案裡本來就有 HTML），這不是理論上的風險。
 * </p>
 *
 * <p>
 * 用 `dangerouslySetInnerHTML` 而不是把物件塞進 children：React 會把 children
 * 裡的字串做 HTML 逃逸，`&quot;` 進到 JSON-LD 就解析失敗。
 * </p>
 */
export function JsonLd({ data }: { data: JsonLdNode | null }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
