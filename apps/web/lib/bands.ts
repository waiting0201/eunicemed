import type { MediaRef } from './api';

/**
 * 頁頂 band 的靜態品牌圖樣。
 *
 * <p>
 * mockup4 有 10 頁在頁首放同一條 16:3 的 band，但其中 6 頁
 * （Applications／FAQ／Insights／News／Downloads／Where to Buy）沒有 CMS 區段 ——
 * 版面文案已定案寫死在前端（docs/15 §2），band 也一起寫死。
 * about／products／partnership／privacy 的 band 仍由後台換圖（docs/15 §3B），
 * 那四頁走 `hero.band`，不用這裡的常數。
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
