import Link from 'next/link';
import type { ProductListItem } from '@/lib/api';
import { SIZES, srcSetOf } from '@/lib/image';

/**
 * 產品卡。圖片一律 1:1（preset `square`，docs/11 §2 —— 全站產品圖的唯一規格）。
 *
 * ⚠️ 用原生 `<img>` 而非 `next/image`。不是疏漏：`next/image` 即使設了
 * `unoptimized` 仍會走它自己的載入路徑，而本站需要的是完全掌握 srcSet
 * 以指向 Blob 上已產生的尺寸變體。見 lib/image.ts 的說明。
 */
export function ProductCard({ item }: { item: ProductListItem }) {
  return (
    <Link
      href={item.url}
      className="group block overflow-hidden rounded-lg border border-[--color-hairline] bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="aspect-square overflow-hidden bg-[--color-tint]">
        {item.image ? (
          <img
            src={item.image.url}
            srcSet={srcSetOf(item.image)}
            sizes={SIZES.productGrid}
            alt={item.image.alt ?? item.name}
            loading="lazy"
            decoding="async"
            width={1200}
            height={1200}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[--color-grey]">
            1:1
          </div>
        )}
      </div>

      <div className="p-4">
        {item.collection && (
          <p className="text-xs uppercase tracking-wide text-[--color-brand-deep]">
            {item.collection.name}
          </p>
        )}
        <h3 className="mt-1 text-base font-semibold">{item.name}</h3>
        {item.sku && <p className="mt-1 text-xs text-[--color-grey]">{item.sku}</p>}
        {item.featuredBlurb && (
          <p className="mt-2 line-clamp-2 text-sm">{item.featuredBlurb}</p>
        )}
      </div>
    </Link>
  );
}
