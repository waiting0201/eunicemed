import type { MediaRef } from './api';

/**
 * 圖片來源解析。
 *
 * <p>
 * 本站**不使用 Next.js 的圖片優化**（`next.config.ts` 設了 `unoptimized: true`）。
 * 原因：優化端點跑在 SWA 的 managed backend 上，圖片位元組會計入 Free 方案的
 * 100GB/月頻寬，而該額度超出後不能加購、直接中斷（docs/07 §7.1、§7.3）。
 * </p>
 *
 * <p>
 * 取而代之，所有響應式尺寸在**上傳當下**就由 API 依 preset 階梯產生成實體檔案
 * （docs/11-media-specs.md §2a），並由公開端點回傳 <c>variants</c> 清單。
 * </p>
 *
 * <p>
 * ⚠️ **不要自己拼檔名。** 初版曾照 preset 階梯推導 `-1200.webp` 這類名稱，
 * 但縮圖是「只縮不放」—— 來源圖比 preset 小的時候，1200 那階實際產出的是
 * 來源寬度的檔案，猜出來的名字必然 404。一律用 API 回的 `variants`。
 * </p>
 */

/** 由 API 回的 variants 組出 srcSet。沒有 variants 時回 undefined，瀏覽器就只用 src。 */
export function srcSetOf(media: MediaRef | null | undefined): string | undefined {
  if (!media?.variants?.length) return undefined;

  const webp = media.variants
    .filter((v) => v.format === 'webp')
    .sort((a, b) => a.width - b.width);

  if (webp.length === 0) return undefined;

  return webp.map((v) => `${v.url} ${v.width}w`).join(', ');
}

/**
 * 版位寬度提示。給瀏覽器判斷該抓 srcSet 裡的哪一張。
 * 沒有這個，瀏覽器會假設圖片佔滿視窗寬度而抓最大張。
 */
export const SIZES = {
  /** 產品格線：手機 1 欄、平板 2 欄、桌機 4 欄（max-width 1180px） */
  productGrid: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px',
  /** 分類 hero */
  hero: '(max-width: 1180px) 100vw, 1180px',
} as const;
