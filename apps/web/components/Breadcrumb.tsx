import Link from 'next/link';
import { css } from '@/lib/css';

/** 樣式逐字取自 mockup4 的麵包屑（產品分類／詳情頁）。 */
const S = {
  nav: css`max-width:1180px;margin:0 auto;padding:18px clamp(24px,5vw,64px);font-size:.85rem;color:#66787F;font-weight:500;`,
  sep: css`margin:0 8px;color:#B7C4C8;`,
} as const;

/**
 * 麵包屑。mockup4 的分類／子分類／產品詳情／應用方案詳情四種頁面共用同一條：
 * `.85rem`、`#66787F`、上下 18px，分隔斜線用更淡的 `#B7C4C8`，最後一段是 ink 且不是連結。
 */
export function Breadcrumb({
  trail,
  current,
}: {
  trail: { href: string; label: string }[];
  current: string;
}) {
  return (
    <nav style={S.nav}>
      {trail.map((crumb) => (
        <span key={crumb.href}>
          <Link href={crumb.href}>{crumb.label}</Link>
          <span style={S.sep}>/</span>
        </span>
      ))}
      {/* mockup4 的最後一節沒有自己的樣式，直接繼承容器的 #66787F */}
      <span>{current}</span>
    </nav>
  );
}
