import Link from 'next/link';
import type { SectionCta } from '@/lib/page';

/**
 * 區段 CTA 的共用連結。`external` 由編輯者決定：
 * 外部用 `<a>` 加 `noopener`，站內走 `<Link>` 才有預先載入 —— 兩者不能混用。
 *
 * 沒有 `url` 就不渲染：那表示編輯者只填了標籤，點下去會是死連結。
 */
const STYLES = {
  primary:
    'inline-block rounded-full bg-brand px-7 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(0,181,205,.32)] transition hover:bg-brand-deep hover:text-white',
  outline:
    'inline-block rounded-full border-[1.5px] border-[rgba(0,146,168,.4)] px-6 py-[11px] font-semibold text-brand-deep',
  onDark:
    'inline-block rounded-full bg-white px-7 py-3 font-semibold text-brand-deep transition hover:bg-white/90',
  text: 'font-semibold text-brand-deep',
} as const;

export function SectionCtaLink({
  cta,
  variant = 'primary',
  label,
  className = '',
}: {
  cta: SectionCta | undefined;
  variant?: keyof typeof STYLES;
  /** 覆寫標籤（例如卡片用 `ctaLabel` 而非 `link.label`）*/
  label?: string;
  className?: string;
}) {
  if (!cta?.url) return null;

  const text = label ?? cta.label ?? cta.url;
  const cls = `${STYLES[variant]} ${className}`.trim();
  const suffix = variant === 'text' ? ' →' : '';

  return cta.external ? (
    <a href={cta.url} target="_blank" rel="noopener" className={cls}>
      {text}
      {suffix}
    </a>
  ) : (
    <Link href={cta.url} className={cls}>
      {text}
      {suffix}
    </Link>
  );
}
