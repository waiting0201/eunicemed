import Link from 'next/link';
import { Logo } from './Logo';
import { SiteNav } from './SiteNav';
import type { MenuNode } from '@/lib/api';
import type { Locale } from '@/lib/locale';
import { LOCALES, LOCALE_SHORT_LABELS } from '@/lib/locale';

/**
 * 站台頁首。版型逐項照 mockup4：**整條滿版**（不套 1180px 容器）、
 * 高 76px、左右 `clamp(24px,5vw,64px)`、白底九成透明加 10px 毛玻璃。
 *
 * <p>
 * 導覽由 `GET /menus` 提供（後台可維護）。
 * **選單為空時退回內建清單**：導覽是每一頁都看得到的東西，
 * 資料還沒建、或後端暫時取不到時，整條導覽消失比顯示一份稍舊的清單糟得多。
 * </p>
 *
 * <p>
 * **Where to Buy 不在導覽列裡** —— mockup4 把它做成導覽右側獨立的青底藥丸鈕。
 * 後台若把它排進 header 選單，這裡會把它抽出來當按鈕，而不是多印一次。
 * </p>
 *
 * 品牌名 EuniceMed 是品牌符號，兩種語系都不翻譯。
 */
const WHERE_TO_BUY = '/where-to-buy';

const FALLBACK: Record<Locale, { href: string; label: string }[]> = {
  en: [
    { href: '/about', label: 'About' },
    { href: '/products', label: 'Products' },
    { href: '/applications', label: 'Applications' },
    { href: '/partnership', label: 'Partnership' },
    { href: '/resources', label: 'Resources' },
    { href: WHERE_TO_BUY, label: 'Where to Buy' },
  ],
  'zh-TW': [
    { href: '/about', label: '關於我們' },
    { href: '/products', label: '產品' },
    { href: '/applications', label: '應用方案' },
    { href: '/partnership', label: '合作夥伴' },
    { href: '/resources', label: '資源中心' },
    { href: WHERE_TO_BUY, label: '銷售據點' },
  ],
};

export function SiteHeader({ locale, menu }: { locale: Locale; menu?: MenuNode[] }) {
  const all =
    menu && menu.length > 0
      ? menu.map((m) => ({ href: m.url, label: m.label }))
      : FALLBACK[locale];

  const buy = all.find((item) => item.href === WHERE_TO_BUY);
  const items = all.filter((item) => item.href !== WHERE_TO_BUY);

  return (
    <header className="sticky top-0 z-50 flex h-[76px] items-center gap-7 border-b border-hairline bg-white/90 px-gutter backdrop-blur-[10px]">
      <Link href={`/${locale}`}>
        <Logo />
      </Link>

      <SiteNav locale={locale} items={items} />

      {buy && (
        <Link
          href={`/${locale}${buy.href}`}
          className="ml-auto shrink-0 rounded-full bg-brand px-[22px] py-[9px] text-[0.9rem] font-[620] text-white hover:text-white md:ml-0"
        >
          {buy.label}
        </Link>
      )}

      {/* 語系切換：mockup4 是「**EN** · 中」，現用語系用 ink 加粗，其餘維持次要灰 */}
      <span className="shrink-0 border-l border-hairline pl-[18px] text-[0.9rem] text-[#7A8B90]">
        {LOCALES.map((l, i) => (
          <span key={l}>
            {i > 0 && <span className="px-1">·</span>}
            {l === locale ? (
              <b className="font-bold text-ink">{LOCALE_SHORT_LABELS[l]}</b>
            ) : (
              <Link href={`/${l}`}>{LOCALE_SHORT_LABELS[l]}</Link>
            )}
          </span>
        ))}
      </span>
    </header>
  );
}
