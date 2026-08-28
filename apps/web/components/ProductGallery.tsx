'use client';

import { css } from '@/lib/css';

import { useState } from 'react';
import type { ProductImage } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import type { Locale } from '@/lib/locale';

/**
 * 產品圖庫。主圖 + 縮圖列，點縮圖換主圖 —— 這是整頁唯一需要互動的部分，
 * 所以只有它是 client component（docs/02 §「client component 僅在需要互動時使用」）。
 *
 * ⚠️ 圖片一律 1:1（preset `square`）。用原生 `<img>` 而非 `next/image`，
 * 理由見 lib/image.ts。
 */
const SIZES_MAIN = '(max-width: 1024px) 100vw, 560px';
const SIZES_THUMB = '140px';

// 文案留在元件內而非由頁面傳入：**函式不能跨 server → client 邊界**
// （會得到 "Functions cannot be passed directly to Client Components"）。
// 傳 locale 進來、在這裡查表，比把每個標籤攤平成字串 prop 乾淨。
const THUMB_LABEL: Record<Locale, (n: number) => string> = {
  en: (n) => `View image ${n}`,
  'zh-TW': (n) => `查看第 ${n} 張圖`,
};

/** 樣式逐字取自 `mockup4/Product Detail.dc.html` §1 的圖庫。 */
const S = {
  main: css`position:relative;aspect-ratio:1/1;border-radius:22px;overflow:hidden;background:#F0F6F8;`,
  img: css`display:block;width:100%;height:100%;object-fit:cover;`,
  thumbs: css`display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px;`,
  thumb: css`position:relative;aspect-ratio:1/1;border-radius:12px;overflow:hidden;background:#F0F6F8;`,
  thumbOn: css`position:relative;aspect-ratio:1/1;border-radius:12px;overflow:hidden;background:#F0F6F8;border:2px solid #00B5CD;`,
} as const;

export function ProductGallery({
  images,
  productName,
  locale,
}: {
  images: ProductImage[];
  productName: string;
  locale: Locale;
}) {
  const [active, setActive] = useState(0);
  const thumbLabel = THUMB_LABEL[locale];

  if (images.length === 0) {
    return <div style={S.main}>1:1</div>;
  }

  const main = images[active] ?? images[0];

  return (
    <div>
      <div style={S.main}>
        <img
          src={main.url}
          srcSet={srcSetOf(main)}
          sizes={SIZES_MAIN}
          alt={main.alt ?? productName}
          // 主圖是首屏內容，不 lazy —— 它就是這頁的 LCP 元素
          decoding="async"
          width={1200}
          height={1200}
          style={S.img}
        />
      </div>

      {images.length > 1 && (
        <div style={S.thumbs}>
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={thumbLabel(i + 1)}
              aria-current={i === active ? 'true' : undefined}
              style={i === active ? S.thumbOn : S.thumb}
            >
              <img
                src={img.url}
                srcSet={srcSetOf(img)}
                sizes={SIZES_THUMB}
                alt=""
                loading="lazy"
                decoding="async"
                width={1200}
                height={1200}
                style={S.img}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
