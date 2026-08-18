import type { ProductListItem } from '@/lib/api';
import type { Locale } from '@/lib/locale';
import { ProductCard } from './ProductCard';

const EMPTY: Record<Locale, string> = {
  en: 'No products match this combination.',
  'zh-TW': '沒有符合這個組合的產品。',
};

export function ProductGrid({
  items,
  locale,
}: {
  items: ProductListItem[];
  locale: Locale;
}) {
  if (items.length === 0) {
    return <p className="py-16 text-center text-grey">{EMPTY[locale]}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <ProductCard key={item.slug} item={item} />
      ))}
    </div>
  );
}
