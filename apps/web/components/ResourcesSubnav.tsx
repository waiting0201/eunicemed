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
    <div className="bg-tint-deep px-gutter">
      <nav className="mx-auto flex max-w-content gap-7 overflow-x-auto text-[0.92rem] font-medium">
        {ITEMS[locale].map((item) => (
          <Link
            key={item.href}
            href={`/${locale}${item.href}`}
            aria-current={item.href === active ? 'page' : undefined}
            /* 現在頁是 ink 字 + 品牌青底線，不是青字加粗（mockup4） */
            className={`whitespace-nowrap border-b-2 py-4 ${
              item.href === active
                ? 'border-brand text-ink'
                : 'border-transparent text-body'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
