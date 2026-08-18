import type { GaugeLevel } from './Gauge';
import { Gauge } from './Gauge';

/**
 * 語系分頁。
 *
 * <p>
 * 每個分頁上帶該語系的完整度儀表 —— 編輯者在切過去之前就知道那邊還缺什麼。
 * 後台的內容欄位一律同時提供 en / zh-TW（docs/03 §8.1），
 * 而語言純度會讓缺翻譯的內容在前台整個消失，所以「另一個語系的狀態」
 * 必須在畫面上看得到，不能只在切過去之後才發現。
 * </p>
 */
export const LOCALES = ['en', 'zh-TW'] as const;
export type Locale = (typeof LOCALES)[number];

const LABEL: Record<Locale, string> = { en: 'English', 'zh-TW': '繁體中文' };

export function LocaleTabs({
  active,
  onChange,
  levels,
}: {
  active: Locale;
  onChange: (locale: Locale) => void;
  levels: Record<string, GaugeLevel>;
}) {
  return (
    <div
      className="flex gap-1 border-b"
      style={{ borderColor: 'var(--border)' }}
      role="tablist"
    >
      {LOCALES.map((locale) => {
        const on = locale === active;
        return (
          <button
            key={locale}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(locale)}
            className="flex items-center gap-2 px-4 py-2 text-[0.9rem]"
            style={{
              borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
              color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: on ? 600 : 400,
              marginBottom: '-1px',
            }}
          >
            {LABEL[locale]}
            <Gauge
              level={levels[locale] ?? 0}
              label={`${LABEL[locale]} 的內容完整度`}
              width="w-7"
            />
          </button>
        );
      })}
    </div>
  );
}
