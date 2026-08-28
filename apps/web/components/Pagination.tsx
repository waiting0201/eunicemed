import Link from 'next/link';
import { css } from '@/lib/css';

/** 樣式逐字取自 mockup4 的分頁（Insights／News）。 */
const S = {
  row: css`display:flex;justify-content:center;gap:8px;margin-top:52px;`,
  current: css`width:40px;height:40px;border-radius:10px;background:#16333B;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;`,
  other: css`width:40px;height:40px;border-radius:10px;border:1px solid #DFE9EC;color:#44565D;display:flex;align-items:center;justify-content:center;font-weight:500;`,
} as const;

/**
 * 分頁器。版型照 mockup4 Insights 頁尾：40×40 的方鈕、10px 圓角，
 * 現在這一頁是 ink 底白字，其餘是白底細框。
 *
 * <p>
 * 只有一頁時不渲染 —— mockup4 的 News 頁沒有畫分頁器，
 * 是因為那頁的資料剛好一頁放得下，不是版型上不要。
 * </p>
 *
 * 頁碼走 query string，維持純 SSR 且可分享網址。
 */
export function Pagination({
  page,
  totalPages,
  basePath,
  query = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  /** 目前的其他 query（分類篩選等），換頁時要保留 */
  query?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v && k !== 'page') q.set(k, v);
    if (n > 1) q.set('page', String(n));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div style={S.row}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <Link
          key={n}
          href={href(n)}
          aria-current={n === page ? 'page' : undefined}
          style={n === page ? S.current : S.other}
          className={n === page ? 'hover:text-white' : undefined}
        >
          {n}
        </Link>
      ))}
    </div>
  );
}
