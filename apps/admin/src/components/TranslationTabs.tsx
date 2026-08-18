import { useState, type ReactNode } from 'react';
import { LocaleTabs, LOCALES, type Locale } from './LocaleTabs';
import { levelOf, type LocaleLevels } from '@/lib/completeness';

/**
 * 編輯對話框裡的語系分頁。
 *
 * <p>
 * 分頁上的儀表判準統一為「有名稱／必填欄位」—— 與後端決定內容會不會在
 * 該語系消失的那條線一致。呼叫端用 `hasContent` 指定什麼算「有」。
 * </p>
 *
 * <p>
 * 「移除這個語系的內容」也在這裡 —— 送出時值為 null 代表刪除
 * （後端的慣例，見 docs/13 的踩坑）。少了這顆按鈕，加錯語系就再也拿不掉。
 * </p>
 */
export function TranslationTabs<T>({
  translations,
  hasContent,
  onRemove,
  children,
}: {
  translations: Record<string, T | null>;
  hasContent: (value: T | null | undefined) => boolean;
  onRemove: (locale: Locale) => void;
  children: (locale: Locale) => ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>('zh-TW');

  const levels = Object.fromEntries(
    LOCALES.map((l) => [l, levelOf([hasContent(translations[l]), false, false])]),
  ) as LocaleLevels;

  const present = LOCALES.filter((l) => translations[l] != null);

  return (
    <>
      <LocaleTabs active={locale} onChange={setLocale} levels={levels} />

      <div className="pt-4">
        {translations[locale] != null ? (
          present.length > 1 && (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--red)' }}
                onClick={() => onRemove(locale)}
              >
                移除這個語系
              </button>
            </div>
          )
        ) : (
          <p className="form-hint mb-3">
            這個語系還沒有內容。填寫並儲存後，前台的該語系才會顯示。
          </p>
        )}

        {children(locale)}
      </div>
    </>
  );
}
