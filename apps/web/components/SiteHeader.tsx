import Link from 'next/link';
import type { MenuNode } from '@/lib/api';
import type { Locale } from '@/lib/locale';
import { LOCALES, LOCALE_LABELS } from '@/lib/locale';

/**
 * 站台頁首。導覽由 `GET /menus` 提供（後台可維護）。
 *
 * <p>
 * **選單為空時退回內建清單**：導覽是每一頁都看得到的東西，
 * 資料還沒建、或後端暫時取不到時，整條導覽消失比顯示一份稍舊的清單糟得多。
 * </p>
 *
 * 品牌名 EuniceMed 是品牌符號，兩種語系都不翻譯。
 */
const FALLBACK: Record<Locale, { href: string; label: string }[]> = {
  en: [
    { href: '/products', label: 'Products' },
    { href: '/applications', label: 'Applications' },
    { href: '/about', label: 'About' },
    { href: '/partnership', label: 'Partnership' },
    { href: '/resources', label: 'Resources' },
    { href: '/where-to-buy', label: 'Where to Buy' },
  ],
  'zh-TW': [
    { href: '/products', label: '產品' },
    { href: '/applications', label: '應用方案' },
    { href: '/about', label: '關於我們' },
    { href: '/partnership', label: '合作夥伴' },
    { href: '/resources', label: '資源中心' },
    { href: '/where-to-buy', label: '銷售據點' },
  ],
};

export function SiteHeader({ locale, menu }: { locale: Locale; menu?: MenuNode[] }) {
  const items =
    menu && menu.length > 0
      ? menu.map((m) => ({ href: m.url, label: m.label }))
      : FALLBACK[locale];

  return (
    <header className="sticky top-0 z-50 border-b border-[--color-hairline] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[--container-content] items-center gap-8 px-6 py-4 lg:px-16">
        <Link
          href={`/${locale}`}
          className="text-lg font-semibold tracking-tight text-[--color-ink]"
        >
          EuniceMed
        </Link>

        <nav className="hidden flex-1 items-center gap-6 text-sm md:flex">
          {items.map((item) => (
            <Link key={item.href} href={`/${locale}${item.href}`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 text-sm md:ml-0">
          {LOCALES.map((l) => (
            <Link
              key={l}
              href={`/${l}`}
              aria-current={l === locale ? 'true' : undefined}
              className={
                l === locale
                  ? 'font-semibold text-[--color-brand-deep]'
                  : 'text-[--color-grey]'
              }
            >
              {LOCALE_LABELS[l]}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
