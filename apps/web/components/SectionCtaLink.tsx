import type { CSSProperties } from 'react';
import { css } from '@/lib/css';
import Link from 'next/link';
import type { SectionCta } from '@/lib/page';

/**
 * 區段 CTA 的共用連結。`external` 由編輯者決定：
 * 外部用 `<a>` 加 `noopener`，站內走 `<Link>` 才有預先載入 —— 兩者不能混用。
 *
 * 沒有 `url` 就不渲染：那表示編輯者只填了標籤，點下去會是死連結。
 */
/**
 * 連結本身的樣式由呼叫端給（`style`），因為 mockup4 每一處的按鈕尺寸都不同 ——
 * 這裡只保留「純文字連結」這一種，它在全站是同一組值。
 */
const TEXT = css`color:#0092A8;font-weight:620;`;

export function SectionCtaLink({
  cta,
  variant = 'text',
  label,
  style,
}: {
  cta: SectionCta | undefined;
  variant?: 'text' | 'button';
  /** 覆寫標籤（例如卡片用 `ctaLabel` 而非 `link.label`）*/
  label?: string;
  /** 逐處不同的按鈕樣式，由呼叫端以 css`…` 給 */
  style?: CSSProperties;
}) {
  if (!cta?.url) return null;

  const raw = label ?? cta.label ?? cta.url;
  const text = variant === 'text' ? withArrow(raw) : raw;
  const resolved = { ...(variant === 'text' ? TEXT : null), ...style };

  return cta.external ? (
    <a href={cta.url} target="_blank" rel="noopener" style={resolved}>
      {text}
    </a>
  ) : (
    <Link href={cta.url} style={resolved}>
      {text}
    </Link>
  );
}

/** 標籤若已自帶箭頭就不再補一個 —— 後台的文案常常已經寫成「All news →」。 */
function withArrow(label: string): string {
  return /[→>›»]\s*$/.test(label) ? label : `${label} →`;
}
