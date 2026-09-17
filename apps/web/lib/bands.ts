import type { MediaRef } from './api';
import { section, type PageContent } from './page';

/**
 * 頁頂 band 的品牌圖樣**預設圖**。
 *
 * <p>
 * mockup4 有 10 頁在頁首放同一條 16:3 的 band，10 頁的圖來源都是 CMS 的
 * `hero.band`（docs/15 §10）。這裡的常數是**沒換圖時的退路** ——
 * about／products／partnership／privacy 那四頁是形象照的版位，編輯者本來就會放自己的圖；
 * 這 6 頁（Applications／FAQ／Insights／News／Downloads／Where to Buy）的版位是品牌圖樣，
 * 多數時候不會去動它，所以預設圖要直接是對的那一張，而不是一條空白。
 * </p>
 *
 * <p>
 * 圖樣取自 mockup4 的 A4 母檔（`brand-pattern-src` / `pattern-02-src` /
 * `pattern-08-src`，皆 2480×3508）置中裁 16:3。mockup4 是拿 1200 寬的直式圖
 * 交給 `object-fit:cover` 現場裁，可視範圍與這裡的裁切相同、解析度更高
 * —— `mockup4/IMAGES.md` 也註明「若嫌 band 放大糊可換更寬版」。
 * </p>
 *
 * <p>
 * 階梯照 `page-band` preset 的 webp 輸出（2560/1600/1200/800）。**只縮不放**，
 * 所以最上一階是母檔裁切後的實際寬度 2480 而不是 2560 —— 與 API 產變體的規則
 * 一致（docs/11 §2a）。形狀刻意做成 `MediaRef`，`PageBand` 因此不必知道
 * 圖是後台上傳的還是這裡寫死的。
 * </p>
 */
const WIDTHS = [800, 1200, 1600, 2480] as const;

function band(name: string): MediaRef {
  const base = `/brand/bands/${name}`;
  return {
    url: `${base}.jpg`,
    // 純裝飾的品牌圖樣，不承載資訊 —— alt 留空字串讓螢幕閱讀器略過。
    // `PageBand` 對 null 會退回 `alt=""`，這裡寫明是為了讓意圖看得出來。
    alt: '',
    variants: WIDTHS.map((width) => ({ format: 'webp', width, url: `${base}-${width}.webp` })),
  };
}

/** key 即 mockup4 的檔名，方便逐頁對照 `mockup4/IMAGES.md`。 */
export const BRAND_BANDS = {
  /** About／FAQ／Privacy */
  pattern01: band('brand-pattern'),
  /** Products／Applications／News／Insights */
  pattern02: band('brand-pattern-02'),
  /** Partnership／Downloads／Where to Buy */
  pattern08: band('brand-pattern-08'),
} as const;

/**
 * 取一頁的頁頂圖：編輯者換過就用他換的，沒換就用品牌圖樣預設圖。
 *
 * <p>
 * `page` 允許是 `null` —— 這 6 頁的內容主體來自各自的 API（FAQ、下載、據點…），
 * `GET /pages/{key}` 只為了一張圖，**拿不到就不該讓整頁 404**。
 * 區段沒翻譯或被停用時 <see cref="section" /> 也回 `null`，一樣落到預設圖。
 * </p>
 *
 * <p>
 * 退回預設圖的條件是**解析得出 `url`**，不是「欄位有值」：媒體被刪掉的引用由
 * 後端整個移除（`SectionWalker.ResolveMedia`），但值若根本不是合法 uuid，
 * 後端不會把它當成媒體欄位，於是**原字串照樣回傳**。那時 `band` 是個字串而不是
 * <see cref="MediaRef" />，直接往下傳會渲染出 `src={undefined}` 的破圖。
 * </p>
 */
export function pageBand(page: PageContent | null, fallback: MediaRef): MediaRef {
  const hero = page ? section<{ band?: unknown }>(page, 'hero') : null;
  const band = hero?.band;
  return typeof band === 'object' && band !== null && typeof (band as MediaRef).url === 'string'
    ? (band as MediaRef)
    : fallback;
}
