import type { CSSProperties } from 'react';
import { css } from './css';

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

/**
 * 同一組系列色，給已照抄 mockup4、改用 inline style 的元件用。
 * 值逐字取自 mockup4 的產品卡系列標籤 —— 白底上的文字色。
 */
export const COLLECTION_COLOR: Record<string, CSSProperties> = {
  care: css`color:#7A8022;`,
  protect: css`color:#4B6B7E;`,
  advance: css`color:#7A4D6F;`,
};

/** 未知 slug 退回品牌青（`#0092A8`，不是 `#00B5CD` —— 後者當文字對比不足）。 */
export function collectionColor(slug: string | undefined): CSSProperties {
  return (slug && COLLECTION_COLOR[slug]) || FALLBACK_COLOR;
}

const FALLBACK_COLOR = css`color:#0092A8;`;

/**
 * 系列的**填色**（Pantone 原值）。DESIGN.md 講得很清楚：
 * 「填色（chip、色帶）維持 Pantone 原值」，只有當成小級數文字時才壓深。
 * 徽章、色帶用這一組，**不是**上面那組文字色。
 */
export const COLLECTION_FILL: Record<string, CSSProperties> = {
  care: css`background:#A8AD3C;`,
  protect: css`background:#5B7F95;`,
  advance: css`background:#7A4D6F;`,
};

export function collectionFill(slug: string | undefined): CSSProperties {
  return (slug && COLLECTION_FILL[slug]) || FALLBACK_FILL;
}

const FALLBACK_FILL = css`background:#00B5CD;`;

/**
 * 支撐強度卡的頂線（分類頁 §4、應用方案詳情）。同樣是**填色**，用 Pantone 原值。
 * mockup4：`border-top:4px solid #A8AD3C` / `#5B7F95` / `#7A4D6F`。
 */
export const COLLECTION_RULE: Record<string, CSSProperties> = {
  care: css`border-top:4px solid #A8AD3C;`,
  protect: css`border-top:4px solid #5B7F95;`,
  advance: css`border-top:4px solid #7A4D6F;`,
};

export function collectionRule(slug: string | undefined): CSSProperties {
  return (slug && COLLECTION_RULE[slug]) || FALLBACK_RULE;
}

const FALLBACK_RULE = css`border-top:4px solid #00B5CD;`;

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
