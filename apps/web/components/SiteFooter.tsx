import Link from 'next/link';
import type { MenuNode, Settings } from '@/lib/api';
import type { Locale } from '@/lib/locale';

/**
 * 站台頁尾。公司資訊由 `GET /settings` 提供 —— docs/03-cms.md §3 明訂
 * Contact 頁與頁尾共用同一份設定，不重複維護。
 *
 * <p>
 * 與頁首同樣的原則：**取不到就退回內建值**。頁尾的地址與聯絡方式是
 * 法規與信任要素，空著比稍舊更糟。
 * </p>
 */
const COPY: Record<Locale, { hours: string; address: string; rights: string }> = {
  en: {
    hours: 'Mon–Fri 09:00–18:00 (UTC+8)',
    address:
      '11F, No. 123-9, Xingde Rd., Sanchong Dist., New Taipei City 24158, Taiwan',
    rights: 'All rights reserved.',
  },
  'zh-TW': {
    hours: '週一至週五 09:00–18:00（UTC+8）',
    address: '24158 新北市三重區興德路 123-9 號 11 樓',
    rights: '版權所有。',
  },
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
  const s = (key: string, fallback: string) =>
    typeof settings?.[key] === 'string' ? (settings[key] as string) : fallback;

  const address = s('company.address', c.address);
  const hours   = s('company.hours', c.hours);
  const phone   = s('company.phone', '+886 2 8511 3758');
  const email   = s('company.email', 'service@comfortplus-medical.com');

  return (
    <footer className="mt-20 border-t border-[--color-hairline] bg-[--color-tint]">
      <div className="mx-auto max-w-[--container-content] px-6 py-12 text-sm lg:px-16">
        <p className="text-base font-semibold text-[--color-ink]">
          Comfort Plus Corporation
        </p>
        <p className="mt-2">{address}</p>
        <p className="mt-1">
          {/* tel: 要去掉空白，否則部分手機撥號會失敗 */}
          <a href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a>
          {' · '}
          <a href={`mailto:${email}`}>{email}</a>
        </p>
        <p className="mt-1 text-[--color-grey]">{hours}</p>

        {menu && menu.length > 0 && (
          <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {menu.map((item) => (
              <Link key={item.url} href={`/${locale}${item.url}`}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <p className="mt-8 text-[--color-grey]">
          © {new Date().getFullYear()} Comfort Plus Corporation. {c.rights}
        </p>
      </div>
    </footer>
  );
}
