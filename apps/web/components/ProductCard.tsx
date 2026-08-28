import Link from 'next/link';
import type { ProductListItem } from '@/lib/api';
import { css } from '@/lib/css';
import { collectionColor } from '@/lib/collection';

/**
 * 樣式逐字取自 mockup4 的產品格子。
 *
 * <p>
 * mockup4 有**兩種**產品卡，不是一種：
 * `tile` 是**無框裸磚**（Products 頁、產品詳情的相關產品），文字直接排在圖下 12px；
 * `card` 是**白底細框卡**（分類／子分類頁、應用方案詳情、首頁 01 瀑布流），
 * 內距 `16px 18px 20px`，並帶上浮加陰影的 hover。
 * </p>
 */
const S = {
  tile: css`display:block;`,
  card: css`display:block;background:#FFFFFF;border:1px solid #DFE9EC;border-radius:20px;overflow:hidden;`,
  cardBody: css`padding:16px 18px 20px;`,
  media: css`position:relative;aspect-ratio:1/1;border-radius:18px;overflow:hidden;background:#F0F6F8;`,
  img: css`display:block;width:100%;height:100%;object-fit:cover;`,
  placeholder: css`width:100%;height:100%;`,
  body: css`margin-top:12px;`,
  eyebrow: css`font-weight:700;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;`,
  name: css`color:#16333B;font-weight:570;font-size:1.08rem;margin:3px 0 2px;`,
  sub: css`font-size:.85rem;color:#66787F;`,
} as const;
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
export type ProductCardVariant = 'tile' | 'card';

export function ProductCard({
  item,
  variant = 'tile',
}: {
  item: ProductListItem;
  variant?: ProductCardVariant;
}) {
  const boxed = variant === 'card';
  // mockup4 的副標在型號與子分類之間擺盪（那是佔位資料）；有型號就用型號
  const sub = item.sku ?? item.subCategory?.name ?? null;

  return (
    <Link
      href={item.url}
      style={boxed ? S.card : S.tile}
      data-hover={boxed ? 'lift-shadow' : undefined}
    >
      <div style={S.media}>
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
            style={S.img}
          />
        ) : (
          <div style={S.placeholder} />
        )}
      </div>

      <div style={boxed ? S.cardBody : S.body}>
        {item.collection && (
          <span style={{ ...S.eyebrow, ...collectionColor(item.collection.slug) }}>
            {item.collection.name}
          </span>
        )}
        <h3 style={S.name}>{item.name}</h3>
        {sub && <p style={S.sub}>{sub}</p>}
      </div>
    </Link>
  );
}
