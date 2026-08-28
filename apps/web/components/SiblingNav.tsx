import Link from 'next/link';
import { css } from '@/lib/css';

/** 樣式逐字取自 mockup4 分類頁的兄弟分類列（黏在頁首下方 76px 處）。 */
const S = {
  bar: css`background:#F0F6F8;border-top:1px solid #DFE9EC;border-bottom:1px solid #DFE9EC;padding:0 clamp(24px,5vw,64px);position:sticky;top:76px;z-index:40;`,
  inner: css`max-width:1180px;margin:0 auto;display:flex;gap:28px;font-size:.92rem;font-weight:500;overflow-x:auto;`,
  active: css`color:#16333B;padding:16px 0;border-bottom:2px solid #00B5CD;white-space:nowrap;`,
  idle: css`color:#44565D;padding:16px 0;border-bottom:2px solid transparent;white-space:nowrap;`,
  tail: css`color:#44565D;padding:16px 0;border-bottom:2px solid transparent;white-space:nowrap;margin-left:auto;`,
} as const;

/**
 * 同層切換列。mockup4「Product Category」的第 2 段：
 * `#F0F6F8` 底、上下細線、**黏在頁首下方**（`top:76px`，剛好是頁首高度），
 * 現在這一項是 ink 字加品牌青底線，其餘 `#44565D`。
 *
 * <p>
 * 最後一項（「All products」）用 `margin-left:auto` 推到最右。
 * </p>
 */
export function SiblingNav({
  items,
  activeHref,
  tail,
}: {
  items: { href: string; label: string }[];
  activeHref: string;
  /** 推到最右的收尾項，如「All products」 */
  tail?: { href: string; label: string };
}) {
  if (items.length === 0) return null;

  return (
    <div style={S.bar}>
      <nav style={S.inner}>
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              style={active ? S.active : S.idle}
            >
              {item.label}
            </Link>
          );
        })}
        {tail && (
          <Link href={tail.href} style={S.tail}>
            {tail.label}
          </Link>
        )}
      </nav>
    </div>
  );
}
