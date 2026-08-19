import Link from 'next/link';

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
    <nav className="mx-auto max-w-content px-gutter py-[18px] text-[0.85rem] font-medium text-[#66787F]">
      {trail.map((crumb) => (
        <span key={crumb.href}>
          <Link href={crumb.href}>{crumb.label}</Link>
          <span className="mx-2 text-[#B7C4C8]">/</span>
        </span>
      ))}
      <span className="text-ink">{current}</span>
    </nav>
  );
}
