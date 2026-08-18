import Link from 'next/link';
import type { FacetCount } from '@/lib/api';
import type { Locale } from '@/lib/locale';

const ALL: Record<Locale, string> = { en: 'All', 'zh-TW': '全部' };

/**
 * 側欄分類篩選。mockup4 的 FAQ 與 Downloads 兩頁共用這個版型
 * （<see cref="FilterChips"/> 是產品頁的橫向版本，兩者刻意不共用 ——
 * 一個是側欄清單、一個是橫向 chips，只有語意像）。
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
    <aside>
      <p className="mb-3 text-[0.78rem] font-bold uppercase tracking-[0.14em] text-grey">
        {label}
      </p>
      <div className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        <Row href={href()} active={!active} count={total}>
          {ALL[locale]}
        </Row>
        {facets.map((f) => (
          <Row key={f.slug} href={href(f.slug)} active={active === f.slug} count={f.count}>
            {labelOf ? labelOf(f) : f.label}
          </Row>
        ))}
      </div>
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
      className={`flex shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded-[12px] border px-4 py-2.5 text-[0.95rem] transition ${
        active
          ? 'border-brand bg-white font-semibold text-brand-deep'
          : 'border-transparent hover:border-hairline hover:bg-white'
      }`}
    >
      <span>{children}</span>
      <span className="text-[0.8rem] text-grey">{count}</span>
    </Link>
  );
}
