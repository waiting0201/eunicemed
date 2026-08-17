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
 * （docs/11-media-specs.md §2a）。前端只負責挑對的那一張，位元組直接從 Blob 出。
 * </p>
 *
 * <p>
 * 目前 API 回的 media 只有 master 的 `url`。等 Phase 3 的媒體管線完成、
 * 公開端點開始回 variant 清單之後，<see cref="srcSetFor"/> 才會真的產出多個候選；
 * 在那之前它退化成單一來源，行為正確但沒有響應式效益。
 * </p>
 */

/** 各 preset 的 WebP 階梯，與 Api/Media/media-presets.json 的 output.webp 一致。 */
const LADDER: Record<string, number[]> = {
  'hero-slide': [2560, 1600, 1200, 800],
  'page-band': [2560, 1600, 1200, 800],
  'section-bg': [2560, 1600, 1200, 800],
  'wide-16x9': [1600, 1200, 800],
  'wide-16x10': [1200, 800, 400],
  'photo-4x3': [1200, 800, 400],
  'content-16x9': [1200, 800, 400],
  'portrait-4x5': [1000, 800, 400],
  square: [1200, 800, 400],
  'card-16x10': [800, 400],
  'logo-mark': [400],
  'og-image': [],
};

/**
 * 由 master 網址推導同一張圖各寬度的 srcSet。
 *
 * 命名慣例需與 API 的 ImageService 產出一致（Phase 3 實作時定案）：
 * `name-{hash}.jpg` → `name-{hash}-800.webp`
 *
 * ⚠️ 這個函式與後端的檔名產生規則是**隱含耦合**的。Phase 3 決定命名後，
 * 兩邊要一起改，並在 docs/11 §2a 記下格式。
 */
export function srcSetFor(masterUrl: string, presetKey: string): string | undefined {
  const widths = LADDER[presetKey];
  if (!widths || widths.length === 0) return undefined;

  const dot = masterUrl.lastIndexOf('.');
  if (dot < 0) return undefined;

  const stem = masterUrl.slice(0, dot);
  return widths.map((w) => `${stem}-${w}.webp ${w}w`).join(', ');
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
