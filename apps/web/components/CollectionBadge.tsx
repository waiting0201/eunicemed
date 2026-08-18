import type { SlugName } from '@/lib/api';

/**
 * 系列徽章。三個系列各有專色（docs/08 §2：Care 7746c / Protect 5415c / Advance 5125c），
 * 對照表寫死在這裡而不是從 API 來 —— 那是品牌識別，不是可編輯內容。
 * 未知 slug 退回品牌青，不要讓一個沒見過的系列把徽章變透明。
 */
const TONE: Record<string, string> = {
  care: 'bg-care',
  protect: 'bg-protect',
  advance: 'bg-advance',
};

export function CollectionBadge({ collection }: { collection: SlugName }) {
  return (
    <span
      className={`inline-block rounded-full px-3.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-white ${
        TONE[collection.slug] ?? 'bg-brand'
      }`}
    >
      {collection.name}
    </span>
  );
}
