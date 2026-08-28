import type { MediaRef } from '@/lib/api';
import { css } from '@/lib/css';
import { srcSetOf } from '@/lib/image';

/**
 * 頁頂的品牌圖樣帶。mockup4 有 10 頁用同一組：一個 `position:relative;overflow:hidden`
 * 的區段包一張滿版圖，高度 `clamp(160px,18.75vw,360px)`（即 16:3 的 2560×480 版位）。
 *
 * <p>
 * 圖是編輯者換的，沒設就整段不渲染 —— 一條空的 360px 灰帶比沒有更糟。
 * </p>
 */
const S = {
  section: css`position:relative;overflow:hidden;`,
  img: css`display:block;width:100%;height:clamp(160px,18.75vw,360px);object-fit:cover;object-position:center;`,
} as const;

export function PageBand({ image }: { image: MediaRef | undefined | null }) {
  if (!image) return null;

  return (
    <section style={S.section}>
      <img
        src={image.url}
        srcSet={srcSetOf(image)}
        sizes="100vw"
        alt={image.alt ?? ''}
        width={2560}
        height={480}
        decoding="async"
        style={S.img}
      />
    </section>
  );
}
