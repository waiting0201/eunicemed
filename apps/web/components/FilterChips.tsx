import Link from 'next/link';
import { css } from '@/lib/css';

/** 樣式逐字取自 mockup4 的篩選 chips 列。 */
const S = {
  row: css`display:flex;flex-wrap:wrap;gap:12px;align-items:center;`,
  label: css`font-weight:620;color:#16333B;margin-right:8px;`,
  chipActive: css`color:#fff;font-weight:600;font-size:.85rem;padding:7px 16px;border-radius:999px;`,
  chipIdle: css`background:#FFFFFF;border:1px solid #DFE9EC;color:#44565D;font-weight:500;font-size:.85rem;padding:7px 16px;border-radius:999px;`,
  count: css`margin-left:6px;font-size:.75rem;opacity:.6;`,
} as const;
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
  tone = 'brand',
}: {
  label: string;
  param: string;
  facets: FacetCount[];
  active: string | undefined;
  basePath: string;
  query: Record<string, string | undefined>;
  locale: Locale;
  /**
   * 選中狀態的顏色。mockup4 兩頁不同：Products 總覽是 ink 底、
   * 分類／子分類頁是品牌青底加陰影。
   */
  tone?: Tone;
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
    <div style={S.row}>
      <span style={S.label}>{label}</span>

      <Chip href={href()} active={!active} tone={tone}>
        {ALL[locale]}
      </Chip>

      {facets.map((f) => (
        <Chip key={f.slug} href={href(f.slug)} active={active === f.slug} tone={tone}>
          {f.label}
          <span style={S.count}>{f.count}</span>
        </Chip>
      ))}
    </div>
  );
}

export type Tone = 'ink' | 'brand';

/** 作用中 chip 的底色。mockup4 的產品格用 ink，分類頁的次要列用品牌青。 */
const ACTIVE: Record<Tone, React.CSSProperties> = {
  ink: css`background:#16333B;`,
  brand: css`background:#00B5CD;box-shadow:0 6px 16px rgba(0,150,170,.24);`,
};

function Chip({
  href,
  active,
  tone,
  children,
}: {
  href: string;
  active: boolean;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      style={active ? { ...S.chipActive, ...ACTIVE[tone] } : S.chipIdle}
      className={active ? 'hover:text-white' : undefined}
      data-hover={active ? undefined : 'edge'}
    >
      {children}
    </Link>
  );
}

/**
 * 連結版的 chips 列。外觀與 <see cref="FilterChips"/> 完全相同，
 * 但每一項是**真的頁面**而不是 query 篩選 —— 子分類是唯一有獨立 URL 的
 * 產品維度（docs/06 §2），拿 query 表示它會失去 SEO 落地頁。
 */
export function LinkChips({
  label,
  items,
  allHref,
  allLabel,
  activeHref,
  tone = 'brand',
}: {
  label: string;
  items: { href: string; label: string; count?: number }[];
  allHref: string;
  allLabel: string;
  activeHref?: string;
  tone?: Tone;
}) {
  if (items.length === 0) return null;

  return (
    <div style={S.row}>
      <span style={S.label}>{label}</span>

      <Chip href={allHref} active={!activeHref} tone={tone}>
        {allLabel}
      </Chip>

      {items.map((item) => (
        <Chip key={item.href} href={item.href} active={activeHref === item.href} tone={tone}>
          {item.label}
          {typeof item.count === 'number' && <span style={S.count}>{item.count}</span>}
        </Chip>
      ))}
    </div>
  );
}
