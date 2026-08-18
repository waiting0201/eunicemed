import Link from 'next/link';
import type { Locale } from '@/lib/locale';

/**
 * 資源中心的子導覽。mockup4 的 FAQ / Insights / Downloads / News 四頁共用同一條。
 *
 * 項目寫死 —— 它是 IA 的一部分（docs/06-sitemap.md），不是可編輯內容。
 * 正式的主選單另由 `GET /menus` 提供（Phase 7），兩者不是同一件事。
 */
const ITEMS: Record<Locale, { href: string; label: string }[]> = {
  en: [
    { href: '/resources', label: 'Overview' },
    { href: '/faq', label: 'FAQ' },
    { href: '/insights', label: 'Insights' },
    { href: '/downloads', label: 'Downloads' },
    { href: '/news', label: 'News' },
  ],
  'zh-TW': [
    { href: '/resources', label: '總覽' },
    { href: '/faq', label: '常見問題' },
    { href: '/insights', label: '專欄文章' },
    { href: '/downloads', label: '資料下載' },
    { href: '/news', label: '最新消息' },
  ],
};

export function ResourcesSubnav({ locale, active }: { locale: Locale; active: string }) {
  return (
    <div className="border-b border-[--color-hairline] bg-[--color-tint]">
      <nav className="mx-auto flex max-w-[--container-content] gap-6 overflow-x-auto px-6 py-3 text-[0.92rem] lg:px-16">
        {ITEMS[locale].map((item) => (
          <Link
            key={item.href}
            href={`/${locale}${item.href}`}
            aria-current={item.href === active ? 'page' : undefined}
            className={`whitespace-nowrap ${
              item.href === active
                ? 'font-semibold text-[--color-brand-deep]'
                : 'text-[--color-body]'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
