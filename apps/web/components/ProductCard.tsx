import Link from 'next/link';
import type { ProductListItem } from '@/lib/api';
import { collectionText } from '@/lib/collection';
import { SIZES, srcSetOf } from '@/lib/image';

/**
 * 產品卡。版型照 mockup4 的產品格：**沒有卡片外框、沒有白底、沒有內距** ——
 * 只有一張 18px 圓角的 1:1 圖磚，文字直接排在圖磚下方 12px 處。
 *
 * <p>
 * 系列名用**該系列的專色**（mockup4 的格子裡 Care 是 `#7A8022`、
 * Protect `#4B6B7E`、Advance `#7A4D6F`），不是一律品牌青。
 * </p>
 *
 * 圖片一律 1:1（preset `square`，docs/11 §2 —— 全站產品圖的唯一規格）。
 *
 * ⚠️ 用原生 `<img>` 而非 `next/image`。不是疏漏：`next/image` 即使設了
 * `unoptimized` 仍會走它自己的載入路徑，而本站需要的是完全掌握 srcSet
 * 以指向 Blob 上已產生的尺寸變體。見 lib/image.ts 的說明。
 */
export function ProductCard({ item }: { item: ProductListItem }) {
  // mockup4 的副標在型號與子分類之間擺盪（那是佔位資料）；有型號就用型號
  const sub = item.sku ?? item.subCategory?.name ?? null;

  return (
    <Link href={item.url} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-[18px] bg-tint-deep">
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
            className="block h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#8AA0A6]">
            1:1
          </div>
        )}
      </div>

      <div className="mt-3">
        {item.collection && (
          <span
            className={`text-[0.72rem] font-bold uppercase tracking-[0.1em] ${collectionText(
              item.collection.slug,
            )}`}
          >
            {item.collection.name}
          </span>
        )}
        <h3 className="mt-[3px] mb-0.5 text-[1.08rem] font-[570]">{item.name}</h3>
        {sub && <p className="text-[0.85rem] text-[#66787F]">{sub}</p>}
      </div>
    </Link>
  );
}
