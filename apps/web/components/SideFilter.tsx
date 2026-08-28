import Link from 'next/link';
import { css } from '@/lib/css';

/** 樣式逐字取自 mockup4 FAQ 的分類側欄（News／Insights／Downloads 共用同一組）。 */
const S = {
  rail: css`position:sticky;top:100px;display:flex;flex-direction:column;gap:6px;`,
  label: css`color:#8AA0A6;font-weight:620;letter-spacing:.14em;text-transform:uppercase;font-size:.72rem;padding:0 16px 8px;`,
  active: css`display:flex;justify-content:space-between;align-items:center;gap:12px;background:#E9F8FA;color:#0092A8;border-left:3px solid #00B5CD;font-weight:620;font-size:.95rem;line-height:1.4;padding:12px 16px 12px 13px;border-radius:0 12px 12px 0;`,
  idle: css`display:flex;justify-content:space-between;align-items:center;gap:12px;background:transparent;color:#44565D;border-left:3px solid #DFE9EC;font-weight:500;font-size:.95rem;line-height:1.4;padding:12px 16px 12px 13px;border-radius:0 12px 12px 0;`,
  countActive: css`background:#00B5CD;color:#fff;font-size:.72rem;font-weight:700;border-radius:999px;padding:2px 9px;`,
  countIdle: css`background:#EDF4F6;color:#66787F;font-size:.72rem;font-weight:700;border-radius:999px;padding:2px 9px;`,
} as const;
import type { FacetCount } from '@/lib/api';
import type { Locale } from '@/lib/locale';

const ALL: Record<Locale, string> = { en: 'All', 'zh-TW': '全部' };

/**
 * 側欄分類篩選。版型照 mockup4 的 News / Insights / FAQ / Downloads 側欄：
 * 240px 寬、`top:100px` 黏頂，每列左側一條 3px 色條，右上與右下圓角
 * （`border-radius:0 12px 12px 0`），右端一顆計數藥丸。
 *
 * <p>
 * <see cref="FilterChips"/> 是產品頁的橫向版本，兩者刻意不共用 ——
 * 一個是側欄清單、一個是橫向 chips，只有語意像。
 * </p>
 *
 * 篩選走 query string，維持純 SSR 且可分享網址。
 */
export function SideFilter({
  label,
  param,
  facets,
  active,
  basePath,
  locale,
  labelOf,
}: {
  label: string;
  param: string;
  facets: FacetCount[];
  active: string | undefined;
  basePath: string;
  locale: Locale;
  /** facet 的 label 是固定字彙時（如下載類型）由呼叫端翻譯 */
  labelOf?: (facet: FacetCount) => string;
}) {
  if (facets.length === 0) return null;

  const href = (value?: string) => (value ? `${basePath}?${param}=${value}` : basePath);
  const total = facets.reduce((sum, f) => sum + f.count, 0);

  return (
    <aside style={S.rail}>
      <p style={S.label}>{label}</p>
      <Row href={href()} active={!active} count={total}>
        {ALL[locale]}
      </Row>
      {facets.map((f) => (
        <Row key={f.slug} href={href(f.slug)} active={active === f.slug} count={f.count}>
          {labelOf ? labelOf(f) : f.label}
        </Row>
      ))}
    </aside>
  );
}

function Row({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} aria-current={active ? 'true' : undefined} style={active ? S.active : S.idle}>
      <span>{children}</span>
      <span style={active ? S.countActive : S.countIdle}>{count}</span>
    </Link>
  );
}
