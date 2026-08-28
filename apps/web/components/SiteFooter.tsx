import Link from 'next/link';
import { css } from '@/lib/css';
import { Logo } from './Logo';
import type { MenuNode, Settings } from '@/lib/api';
import type { Locale } from '@/lib/locale';

/**
 * 站台頁尾。**全站唯一的深色面**（`#14262C`），版型照 mockup4：
 * 上排是 logo 與連結左右分置，下排一條 `#2C3E44` 細線隔開版權與品牌主張。
 *
 * <p>
 * 連結由 `GET /menus` 的 `footer` 提供；與頁首同樣的原則：
 * **取不到就退回內建值**。
 * </p>
 *
 * <p>
 * 公司地址／電話／營業時間由 `GET /settings` 提供（docs/03-cms.md §3 明訂
 * Contact 頁與頁尾共用同一份設定）。mockup4 的頁尾**沒有**印這些 ——
 * 它們在 Contact 頁。這裡只留 `settings` 參數不再輸出，避免頁尾與版型不符。
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

const COPY: Record<Locale, { rights: string; company: string }> = {
  en: {
    rights: 'All rights reserved.',
    company: 'Comfort Plus Corporation',
  },
  'zh-TW': {
    rights: '版權所有。',
    company: '康得適股份有限公司',
  },
};

const FALLBACK: Record<Locale, { href: string; label: string }[]> = {
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

export function SiteFooter({
  locale,
  menu,
  settings,
}: {
  locale: Locale;
  menu?: MenuNode[];
  settings?: Settings;
}) {
  const c = COPY[locale];
  const items =
    menu && menu.length > 0 ? menu.map((m) => ({ href: m.url, label: m.label })) : FALLBACK[locale];

  const linkedIn =
    typeof settings?.['social.linkedin'] === 'string'
      ? (settings['social.linkedin'] as string)
      : null;

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
            {linkedIn && (
              <a href={linkedIn} target="_blank" rel="noreferrer noopener">
                LinkedIn
              </a>
            )}
          </nav>
        </div>

        <div style={S.rule}>
          <span>
            © {new Date().getFullYear()} {c.company}. {c.rights}
          </span>
          {/* 品牌主張是品牌符號，兩種語系都不翻譯（docs/08 §5.2 例外清單） */}
          <span>Not Just a Motion</span>
        </div>
      </div>
    </footer>
  );
}
