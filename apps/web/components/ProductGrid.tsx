import type { ProductListItem } from '@/lib/api';
import type { Locale } from '@/lib/locale';
import { css } from '@/lib/css';
import { ProductCard, type ProductCardVariant } from './ProductCard';

/** display:grid;grid-template-columns:repeat(4,1fr);gap:24px;（mockup4） */
const S = {
  grid: css`display:grid;grid-template-columns:repeat(4,1fr);gap:24px;`,
  /** 空狀態是本站的補充（mockup4 是靜態稿，永遠有貨） */
  empty: css`padding:64px 0;text-align:center;color:#8AA0A6;`,
} as const;

const EMPTY: Record<Locale, string> = {
  en: 'No products match this combination.',
  'zh-TW': '沒有符合這個組合的產品。',
};

export function ProductGrid({
  items,
  locale,
  variant = 'tile',
}: {
  items: ProductListItem[];
  locale: Locale;
  variant?: ProductCardVariant;
}) {
  if (items.length === 0) {
    return <p style={S.empty}>{EMPTY[locale]}</p>;
  }

  return (
    <div style={S.grid} data-r="cols-2">
      {items.map((item) => (
        <ProductCard key={item.slug} item={item} variant={variant} />
      ))}
    </div>
  );
}
