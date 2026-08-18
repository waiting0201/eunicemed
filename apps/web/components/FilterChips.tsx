import Link from 'next/link';
import type { FacetCount } from '@/lib/api';
import type { Locale } from '@/lib/locale';

const ALL: Record<Locale, string> = { en: 'All', 'zh-TW': '全部' };

/**
 * 篩選 chips。版型照 mockup4「Product Category」的 `#grid` 區塊。
 *
 * <p>
 * **篩選一律走 query string，不產生可索引 URL**（docs/02-frontend.md §7）——
 * 子分類是唯一有獨立 URL 的產品維度。所以這裡用 `<Link>` 改 query 而非改 path。
 * </p>
 *
 * <p>
 * 每個 chip 的數字來自 API 的 facet。注意這些數字**不受同維度篩選影響** ——
 * 選了 Care 之後 Protect 仍顯示它自己的總數，這樣使用者才知道切過去有沒有東西
 * （docs/04 §4）。看起來「沒有跟著變」是正確行為。
 * </p>
 */
export function FilterChips({
  label,
  param,
  facets,
  active,
  basePath,
  query,
  locale,
}: {
  label: string;
  param: string;
  facets: FacetCount[];
  active: string | undefined;
  basePath: string;
  query: Record<string, string | undefined>;
  locale: Locale;
}) {
  if (facets.length === 0) return null;

  const href = (value?: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v && k !== param) q.set(k, v);
    if (value) q.set(param, value);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-grey">
        {label}
      </span>

      <Chip href={href()} active={!active}>
        {ALL[locale]}
      </Chip>

      {facets.map((f) => (
        <Chip key={f.slug} href={href(f.slug)} active={active === f.slug}>
          {f.label}
          <span className="ml-1.5 text-xs opacity-60">{f.count}</span>
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={
        active
          ? 'rounded-full bg-brand-deep px-3.5 py-1.5 text-sm text-white'
          : 'rounded-full border border-hairline px-3.5 py-1.5 text-sm hover:border-brand'
      }
    >
      {children}
    </Link>
  );
}
