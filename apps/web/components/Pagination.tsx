import Link from 'next/link';
import { css } from '@/lib/css';

/**
 * 樣式逐字取自 mockup4。**分頁在 mockup4 有兩種樣子**，不是一種：
 *
 * <ul>
 *   <li>`article`（Insights／News）：ink 底白字、10px 圓角、上距 52px、沒有箭頭。</li>
 *   <li>`catalogue`（產品分類／子分類）：品牌青底白字、12px 圓角、上距 44px，
 *       而且**前後各有一顆箭頭**。</li>
 * </ul>
 */
const A = {
  row: css`display:flex;justify-content:center;gap:8px;margin-top:52px;`,
  current: css`width:40px;height:40px;border-radius:10px;background:#16333B;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;`,
  other: css`width:40px;height:40px;border-radius:10px;border:1px solid #DFE9EC;color:#44565D;display:flex;align-items:center;justify-content:center;font-weight:500;`,
} as const;

const C = {
  row: css`display:flex;justify-content:center;align-items:center;gap:8px;margin-top:44px;`,
  current: css`width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:#00B5CD;color:#fff;font-weight:620;`,
  other: css`width:40px;height:40px;display:flex;align-items:center;justify-content:center;border:1px solid #DFE9EC;border-radius:12px;background:#FFFFFF;font-weight:500;`,
  arrow: css`width:40px;height:40px;display:flex;align-items:center;justify-content:center;border:1px solid #DFE9EC;border-radius:12px;background:#FFFFFF;color:#B7C4C8;`,
} as const;

export type PaginationVariant = 'article' | 'catalogue';

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
  variant = 'article',
}: {
  page: number;
  totalPages: number;
  basePath: string;
  /** 目前的其他 query（分類篩選等），換頁時要保留 */
  query?: Record<string, string | undefined>;
  variant?: PaginationVariant;
}) {
  if (totalPages <= 1) return null;

  const S = variant === 'catalogue' ? C : A;

  const href = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v && k !== 'page') q.set(k, v);
    if (n > 1) q.set('page', String(n));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const arrows = variant === 'catalogue';

  return (
    <div style={S.row}>
      {/* mockup4 的型錄分頁前後各有一顆箭頭；到頭時是淺灰的靜態格，不是連結 */}
      {arrows &&
        (page > 1 ? (
          <Link href={href(page - 1)} aria-label="Previous page" style={C.other}>
            ←
          </Link>
        ) : (
          <span style={C.arrow} aria-hidden>
            ←
          </span>
        ))}

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

      {arrows &&
        (page < totalPages ? (
          <Link href={href(page + 1)} aria-label="Next page" style={C.other}>
            →
          </Link>
        ) : (
          <span style={C.arrow} aria-hidden>
            →
          </span>
        ))}
    </div>
  );
}
