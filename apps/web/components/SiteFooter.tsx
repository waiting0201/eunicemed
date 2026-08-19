import Link from 'next/link';
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
    menu && menu.length > 0
      ? menu.map((m) => ({ href: m.url, label: m.label }))
      : FALLBACK[locale];

  const linkedIn =
    typeof settings?.['social.linkedin'] === 'string'
      ? (settings['social.linkedin'] as string)
      : null;

  return (
    <footer className="bg-[#14262C] px-gutter pt-14 pb-9 text-[0.92rem] text-[#9FAFB5]">
      <div className="mx-auto max-w-content">
        <div className="flex flex-wrap items-center justify-between gap-10">
          <Link href={`/${locale}`}>
            <Logo onDark />
          </Link>

          <nav className="flex flex-wrap gap-[26px] font-medium">
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

        <div className="mt-9 flex flex-wrap justify-between gap-3 border-t border-[#2C3E44] pt-[22px] text-[0.8rem] text-[#74868C]">
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
