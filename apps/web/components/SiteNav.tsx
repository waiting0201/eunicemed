'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/locale';

/**
 * 頁首的主導覽。**唯一需要 client 的理由是「目前在哪一頁」** ——
 * mockup4 的頁首把當前頁染成 `#0092A8` 並加粗到 620，那是版型的一部分，
 * 不是可有可無的裝飾。所以只把 `<nav>` 拆成 client component，
 * 其餘頁首（logo、按鈕、語系）維持 server 端渲染。
 */
export function SiteNav({
  locale,
  items,
}: {
  locale: Locale;
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="ml-auto hidden items-center gap-[26px] text-[0.95rem] font-medium text-[#4B5B61] md:flex">
      {items.map((item) => {
        const href = `/${locale}${item.href}`;
        // 前綴比對：/en/products/stockings 時 Products 仍要亮著
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={item.href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={active ? 'font-[620] text-brand-deep' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
