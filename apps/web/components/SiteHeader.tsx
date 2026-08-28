import Link from 'next/link';
import { css } from '@/lib/css';
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

/**
 * 樣式逐字取自 mockup4 的頁首 —— 18 頁完全相同，只有目前頁的連結多一組色。
 * ⚠️ 字串要與 mockup4 的 `style="…"` 逐字相同，改動前先改 mockup4。
 */
const S = {
  header: css`position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:28px;height:76px;padding:0 clamp(24px,5vw,64px);background:rgba(255,255,255,.9);backdrop-filter:blur(10px);border-bottom:1px solid #DFE9EC;`,
  brand: css`display:inline-flex;align-items:center;line-height:0;`,
  buy: css`background:#00B5CD;color:#fff;font-weight:620;font-size:.9rem;padding:9px 22px;border-radius:999px;`,
  locale: css`color:#7A8B90;font-size:.9rem;border-left:1px solid #DFE9EC;padding-left:18px;`,
  localeCurrent: css`color:#16333B;`,
} as const;

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
    menu && menu.length > 0 ? menu.map((m) => ({ href: m.url, label: m.label })) : FALLBACK[locale];

  const buy = all.find((item) => item.href === WHERE_TO_BUY);
  const items = all.filter((item) => item.href !== WHERE_TO_BUY);

  // Safari 需要 -webkit- 前綴；mockup4 只在 Chromium 跑過所以沒寫（見 allow.json）
  return (
    <header style={{ ...S.header, WebkitBackdropFilter: 'blur(10px)' }}>
      <Link href={`/${locale}`} style={S.brand}>
        <Logo />
      </Link>

      <SiteNav locale={locale} items={items} />

      {buy && (
        <Link href={`/${locale}${buy.href}`} style={S.buy} className="hover:text-white">
          {buy.label}
        </Link>
      )}

      {/* 語系切換：mockup4 是「**EN** · 中」，現用語系用 ink 加粗，其餘維持次要灰 */}
      <span style={S.locale}>
        {LOCALES.map((l, i) => (
          <span key={l}>
            {/* mockup4 是「EN · 中」，分隔就是前後各一個空白的間隔號 */}
            {i > 0 && ' · '}
            {l === locale ? (
              <b style={S.localeCurrent}>{LOCALE_SHORT_LABELS[l]}</b>
            ) : (
              <Link href={`/${l}`}>{LOCALE_SHORT_LABELS[l]}</Link>
            )}
          </span>
        ))}
      </span>
    </header>
  );
}
