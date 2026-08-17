/**
 * 支援的語系。與後端 `Api/Common/Constants.cs` 的 `Locales` 必須一致。
 */
export const LOCALES = ['en', 'zh-TW'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

/**
 * 從 Accept-Language 挑一個支援的語系。挑不到就回預設值。
 * 只做前綴比對（`zh-TW`、`zh-Hant-TW`、`zh` 都算 zh-TW），不引外部套件。
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const wanted = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of wanted) {
    if (tag.startsWith('zh')) return 'zh-TW';
    if (tag.startsWith('en')) return 'en';
  }

  return DEFAULT_LOCALE;
}

/** 語系顯示名稱（各自以該語言書寫）。 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  'zh-TW': '繁體中文',
};
