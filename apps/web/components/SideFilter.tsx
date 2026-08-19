import Link from 'next/link';
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
    <aside className="flex flex-col gap-1.5 lg:sticky lg:top-[100px]">
      <p className="px-4 pb-2 text-[0.72rem] font-[620] uppercase tracking-[0.14em] text-[#8AA0A6]">
        {label}
      </p>
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
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`flex items-center justify-between gap-3 rounded-r-[12px] border-l-[3px] py-3 pr-4 pl-[13px] text-[0.95rem] leading-[1.4] ${
        active
          ? 'border-brand bg-[#E9F8FA] font-[620] text-brand-deep'
          : 'border-hairline font-medium text-body'
      }`}
    >
      <span>{children}</span>
      <span
        className={`rounded-full px-[9px] py-0.5 text-[0.72rem] font-bold ${
          active ? 'bg-brand text-white' : 'bg-[#EDF4F6] text-[#66787F]'
        }`}
      >
        {count}
      </span>
    </Link>
  );
}
