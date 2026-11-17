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
    articles: Record<string, ArticleRefEntry>;
    downloads: Record<string, DownloadRefEntry>;
  };
};

export type CertificationRef = {
  mark: string;
  subLabel: string | null;
  description: string | null;
  logo: MediaRef | null;
};

/** `ref:Article` 解析後的內容。未翻譯的文章**不會出現在 refs 裡**（語言純度）。 */
export type ArticleRefEntry = {
  title: string;
  excerpt: string | null;
  /** 'news' | 'insight' */
  kind: string;
  publishedAt: string | null;
  cover: string | null;
  url: string;
};

/** `ref:Download` 解析後的內容。識別字串是 Id —— Download 沒有 slug。 */
export type DownloadRefEntry = {
  title: string;
  description: string | null;
  type: string;
  fileLocale: string;
  fileExt: string;
  sizeBytes: number;
  url: string | null;
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

/**
 * 後台可覆寫的版面文案：有填（去掉空白後非空）就用後台的，否則退回程式碼裡的定稿。
 *
 * <p>
 * 2026-11-17 起首頁／About／Products 的標題、引言與 SEO 開放後台編輯（docs/15 §14）。
 * 程式碼裡的 `COPY` 從「唯一來源」降為預設值 —— 編輯者清空一格，前台回到定稿，
 * 而不是一行空白；某語系沒有那一列也一樣（語言純度：預設值本身就是該語系的）。
 * </p>
 */
export function copyText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

/**
 * 依位置覆寫一組固定數量的項目（四個部位格子、三項核心價值…）。
 * 數量以預設值為準 —— 版型就是那幾欄；後台每一格各自覆寫，沒填的格子沿用定稿。
 */
export function copyItems<T extends Record<string, unknown>>(
  value: unknown,
  fallback: readonly T[],
  fields: readonly (keyof T & string)[],
): T[] {
  const cms = Array.isArray(value) ? value : [];
  return fallback.map((base, i) => {
    const row = (cms[i] ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...base };
    for (const f of fields) merged[f] = copyText(row[f], base[f] as string);
    return merged as T;
  });
}
