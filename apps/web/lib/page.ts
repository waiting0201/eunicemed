import type { MediaRef } from './api';

/**
 * 頁面區段內容（`GET /pages/{key}`）。
 *
 * <p>
 * 每個區段的欄位形狀由後端的 JSON Schema 決定（`Api/PageSchemas/`），
 * 前端拿到的是**已解析過的**資料：媒體 UUID 已換成 <see cref="MediaRef"/>，
 * 引用（認證／產品／文章／下載）放在 `refs` 供查表。
 * </p>
 *
 * <p>
 * ⚠️ **未翻譯的區段整個不會出現在 `sections`**（語言純度，docs/08 §5.2）。
 * 而 `_enabled: false` 的區段**仍然回傳**，供後台預覽用 —— 模板要自己略過。
 * 兩者是不同的情況，都得處理。
 * </p>
 */
export type PageContent = {
  key: string;
  sections: Record<string, Record<string, unknown> | undefined>;
  refs: {
    certifications: Record<string, CertificationRef>;
    products: Record<string, unknown>;
    articles: Record<string, unknown>;
    downloads: Record<string, unknown>;
  };
};

export type CertificationRef = {
  mark: string;
  subLabel: string | null;
  description: string | null;
  logo: MediaRef | null;
};

export type SectionCta = { label?: string; url?: string; external?: boolean };

/**
 * 取一個區段，順便處理「沒翻譯」與「已停用」兩種缺席。
 *
 * <p>
 * 回傳型別交由呼叫端指定 —— schema 是後端的真相來源，前端重複宣告一次
 * 只會多一份會漂移的定義。**呼叫端要假設每個欄位都可能缺**。
 * </p>
 */
export function section<T extends object>(page: PageContent, key: string): T | null {
  const data = page.sections[key];
  if (!data) return null;
  if (data._enabled === false) return null;
  return data as T;
}
