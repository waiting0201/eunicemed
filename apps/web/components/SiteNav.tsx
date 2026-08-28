'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { css } from '@/lib/css';
import type { Locale } from '@/lib/locale';

/**
 * 頁首的主導覽。**唯一需要 client 的理由是「目前在哪一頁」** ——
 * mockup4 的頁首把當前頁染成 `#0092A8` 並加粗到 620，那是版型的一部分，
 * 不是可有可無的裝飾。所以只把 `<nav>` 拆成 client component，
 * 其餘頁首（logo、按鈕、語系）維持 server 端渲染。
 *
 * <p>
 * ⚠️ `margin-left:auto` 在 mockup4 是掛在 `<nav>` 上（把導覽、按鈕、語系一起推到右邊），
 * 不是掛在 Where to Buy 按鈕上。
 * </p>
 */

/** 樣式逐字取自 mockup4 的頁首導覽。 */
const S = {
  nav: css`display:flex;gap:26px;margin-left:auto;font-size:.95rem;font-weight:500;color:#4B5B61;`,
  active: css`color:#0092A8;font-weight:620;`,
} as const;
export function SiteNav({
  locale,
  items,
}: {
  locale: Locale;
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav style={S.nav} data-r="hide">
      {items.map((item) => {
        const href = `/${locale}${item.href}`;
        // 前綴比對：/en/products/stockings 時 Products 仍要亮著
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={item.href}
            href={href}
            aria-current={active ? 'page' : undefined}
            style={active ? S.active : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
