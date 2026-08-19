/**
 * 系列專色（Care 7746c / Protect 5415c / Advance 5125c）的 class 對照。
 *
 * <p>
 * 值定義在 `app/globals.css` 的 `@theme`，取自 mockup4 —— 版型拿它們當
 * **白底上的文字色**，所以比印刷專色暗一階。這份對照寫死在前端而不是從 API 來：
 * 那是品牌識別，不是可編輯內容。
 * </p>
 *
 * 未知 slug 退回品牌青，不要讓一個沒見過的系列變成看不見的文字。
 */
export const COLLECTION_TEXT: Record<string, string> = {
  care: 'text-care',
  protect: 'text-protect',
  advance: 'text-advance',
};

export const COLLECTION_BG: Record<string, string> = {
  care: 'bg-care',
  protect: 'bg-protect',
  advance: 'bg-advance',
};

export function collectionText(slug: string | undefined): string {
  return (slug && COLLECTION_TEXT[slug]) || 'text-brand-deep';
}

export function collectionBg(slug: string | undefined): string {
  return (slug && COLLECTION_BG[slug]) || 'bg-brand';
}

/**
 * 系列的**填色**（Pantone 原值）。DESIGN.md：填色維持原值，只有當文字時才壓深。
 * mockup4 的支撐強度卡片頂線、色帶用這一組。
 */
export const COLLECTION_BORDER: Record<string, string> = {
  care: 'border-t-care-fill',
  protect: 'border-t-protect-fill',
  advance: 'border-t-advance-fill',
};

export function collectionBorder(slug: string | undefined): string {
  return (slug && COLLECTION_BORDER[slug]) || 'border-t-brand';
}
