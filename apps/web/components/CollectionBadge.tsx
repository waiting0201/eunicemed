import type { SlugName } from '@/lib/api';
import { css } from '@/lib/css';
import { collectionFill } from '@/lib/collection';

/** 樣式逐字取自 mockup4 的產品詳情系列徽章。 */
const S = {
  badge: css`display:inline-block;color:#fff;border-radius:999px;font-size:.7rem;font-weight:700;letter-spacing:.1em;padding:4px 14px;text-transform:uppercase;`,
} as const;

/**
 * 系列徽章。三個系列各有專色（docs/08 §2：Care 7746c / Protect 5415c / Advance 5125c），
 * 對照表寫死在這裡而不是從 API 來 —— 那是品牌識別，不是可編輯內容。
 * 未知 slug 退回品牌青，不要讓一個沒見過的系列把徽章變透明。
 */
export function CollectionBadge({ collection }: { collection: SlugName }) {
  // 底色用 Pantone 原值（DESIGN.md：填色維持原值，只有當文字才壓深）
  return <span style={{ ...S.badge, ...collectionFill(collection.slug) }}>{collection.name}</span>;
}
