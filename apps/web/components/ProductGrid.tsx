import type { ProductListItem } from '@/lib/api';
import type { Locale } from '@/lib/locale';
import { css } from '@/lib/css';
import { ProductCard } from './ProductCard';

/** display:grid;grid-template-columns:repeat(4,1fr);gap:24px;（mockup4） */
const S = {
  grid: css`display:grid;grid-template-columns:repeat(4,1fr);gap:24px;`,
} as const;

const EMPTY: Record<Locale, string> = {
  en: 'No products match this combination.',
  'zh-TW': '沒有符合這個組合的產品。',
};

export function ProductGrid({ items, locale }: { items: ProductListItem[]; locale: Locale }) {
  if (items.length === 0) {
    return <p className="py-16 text-center text-[#8AA0A6]">{EMPTY[locale]}</p>;
  }

  return (
    <div style={S.grid} data-r="cols-2">
      {items.map((item) => (
        <ProductCard key={item.slug} item={item} />
      ))}
    </div>
  );
}
