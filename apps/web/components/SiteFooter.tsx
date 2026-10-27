import Link from 'next/link';
import { css } from '@/lib/css';
import { Logo } from './Logo';
import { COMPANY } from '@/lib/company';
import type { Locale } from '@/lib/locale';

/**
 * 站台頁尾。**全站唯一的深色面**（`#14262C`），版型照 mockup4：
 * 上排是 logo 與連結左右分置，下排一條 `#2C3E44` 細線隔開版權與品牌主張。
 *
 * <p>
 * 連結與頁首同樣**寫在程式碼裡，不進 CMS**（docs/15 §2）。
 * </p>
 *
 * <p>
 * mockup4 的頁尾**沒有**印公司地址與電話 —— 它們在 Contact 頁，
 * 這裡只有一條 LinkedIn。
 * </p>
 */
/**
 * 樣式逐字取自 mockup4 的頁尾 —— 全站唯一的深色面，18 頁完全相同。
 * ⚠️ 字串要與 mockup4 的 `style="…"` 逐字相同，改動前先改 mockup4。
 */
const S = {
  footer: css`background:#14262C;color:#9FAFB5;padding:56px clamp(24px,5vw,64px) 36px;font-size:.92rem;`,
  inner: css`max-width:1180px;margin:0 auto;`,
  top: css`display:flex;flex-wrap:wrap;gap:40px;justify-content:space-between;align-items:center;`,
  brand: css`display:inline-flex;align-items:center;line-height:0;`,
  nav: css`display:flex;gap:26px;flex-wrap:wrap;font-weight:500;`,
  rule: css`border-top:1px solid #2C3E44;margin-top:36px;padding-top:22px;font-size:.8rem;color:#74868C;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;`,
} as const;

/** 版權列整句由語系決定：中文不加英文的句點分隔（中文文案定稿：「© 2026 康譜企業有限公司 版權所有」） */
const COPYRIGHT: Record<Locale, (year: number) => string> = {
  en: (year) => `© ${year} Comfort Plus Corporation. All rights reserved.`,
  'zh-TW': (year) => `© ${year} 康譜企業有限公司 版權所有`,
};

const NAV: Record<Locale, { href: string; label: string }[]> = {
  en: [
    { href: '/contact', label: 'Contact Us' },
    { href: '/news', label: 'Latest News' },
    { href: '/privacy', label: 'Privacy & Legal' },
    { href: '/where-to-buy', label: 'Where to Buy' },
  ],
  'zh-TW': [
    { href: '/contact', label: '聯絡我們' },
    { href: '/news', label: '最新消息' },
    { href: '/privacy', label: '隱私權與法律聲明' },
    { href: '/where-to-buy', label: '銷售據點' },
  ],
};

export function SiteFooter({ locale }: { locale: Locale }) {
  const items = NAV[locale];

  return (
    <footer style={S.footer}>
      <div style={S.inner}>
        <div style={S.top}>
          <Link href={`/${locale}`} style={S.brand}>
            <Logo onDark />
          </Link>

          <nav style={S.nav}>
            {items.map((item) => (
              <Link key={item.href} href={`/${locale}${item.href}`}>
                {item.label}
              </Link>
            ))}
            {/* LinkedIn 是外站連結，沒設定就不印空殼 */}
            <a href={COMPANY.linkedIn} target="_blank" rel="noreferrer noopener">
              LinkedIn
            </a>
          </nav>
        </div>

        <div style={S.rule}>
          <span>{COPYRIGHT[locale](new Date().getFullYear())}</span>
          {/* 品牌主張是品牌符號，兩種語系都不翻譯（docs/08 §5.2 例外清單） */}
          <span>Support feels personal</span>
        </div>
      </div>
    </footer>
  );
}
