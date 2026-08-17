import type { Locale } from '@/lib/locale';

/**
 * 站台頁尾。公司資訊暫時寫死 —— 正式版應由 `GET /settings` 取得（Phase 7），
 * docs/03-cms.md §3 明訂 Contact 頁與頁尾共用同一份設定，不重複維護。
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

export function SiteFooter({ locale }: { locale: Locale }) {
  const c = COPY[locale];

  return (
    <footer className="mt-20 border-t border-[--color-hairline] bg-[--color-tint]">
      <div className="mx-auto max-w-[--container-content] px-6 py-12 text-sm lg:px-16">
        <p className="text-base font-semibold text-[--color-ink]">
          Comfort Plus Corporation
        </p>
        <p className="mt-2">{c.address}</p>
        <p className="mt-1">
          <a href="tel:+886285113758">+886 2 8511 3758</a>
          {' · '}
          <a href="mailto:service@comfortplus-medical.com">
            service@comfortplus-medical.com
          </a>
        </p>
        <p className="mt-1 text-[--color-grey]">{c.hours}</p>

        <p className="mt-8 text-[--color-grey]">
          © {new Date().getFullYear()} Comfort Plus Corporation. {c.rights}
        </p>
      </div>
    </footer>
  );
}
