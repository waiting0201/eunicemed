import type { MediaRef } from './api';
import { section, type PageContent } from './page';

/**
 * 取一頁的頁頂圖（CMS 的 `hero.band`）。**沒傳圖就回 `null`，`PageBand` 整段不渲染。**
 *
 * <p>
 * 2026-10-25 起 10 頁一律如此（客戶要求）—— 先前 Applications／FAQ／Insights／News／
 * Downloads／Where to Buy 沒換圖時會退回寫死的品牌圖樣，那個退路已拿掉（docs/15 §11）。
 * </p>
 *
 * <p>
 * `page` 允許是 `null` —— 那 6 頁的內容主體來自各自的 API（FAQ、下載、據點…），
 * `GET /pages/{key}` 只為了一張圖，**拿不到就不該讓整頁 404**。
 * 區段沒翻譯或被停用時 <see cref="section" /> 也回 `null`。
 * </p>
 *
 * <p>
 * 判斷條件是**解析得出 `url`**，不是「欄位有值」：媒體被刪掉的引用由
 * 後端整個移除（`SectionWalker.ResolveMedia`），但值若根本不是合法 uuid，
 * 後端不會把它當成媒體欄位，於是**原字串照樣回傳**。那時 `band` 是個字串而不是
 * <see cref="MediaRef" />，直接往下傳會渲染出 `src={undefined}` 的破圖。
 * </p>
 */
export function pageBand(page: PageContent | null): MediaRef | null {
  const hero = page ? section<{ band?: unknown }>(page, 'hero') : null;
  const band = hero?.band;
  return typeof band === 'object' && band !== null && typeof (band as MediaRef).url === 'string'
    ? (band as MediaRef)
    : null;
}
