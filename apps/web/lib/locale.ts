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

/**
 * 頁首用的短標籤。mockup4 的頁首是「EN · 中」——
 * 76px 高的單行版型放不下 `English` / `繁體中文`，那會把 Where to Buy 擠掉。
 */
export const LOCALE_SHORT_LABELS: Record<Locale, string> = {
  en: 'EN',
  'zh-TW': '中',
};

/**
 * 目前這一頁在另一個語系的網址。
 *
 * <p>
 * 換掉語系前綴就好，**不需要查表**：全站的 slug 都是語系無關的
 * （`Slug` 掛在實體上而不是翻譯表，見 `Api/Models/Entities/`），
 * 所以 `/en/products/knee-support` 的中文版就是 `/zh-TW/products/knee-support`。
 * </p>
 *
 * <p>
 * ⚠️ 那一頁在目標語系缺翻譯時會 404 —— 這是刻意的，與後端「缺翻譯就 404」
 * 是同一條語言純度原則（docs/08 §5.2），不要在這裡退回首頁或退回另一個語系。
 * </p>
 */
export function switchLocalePath(pathname: string, target: Locale): string {
  const segments = pathname.split('/');

  // 前綴一定在（middleware 會把沒帶前綴的請求先導走），這是防呆
  if (!isLocale(segments[1])) return `/${target}`;

  segments[1] = target;
  return segments.join('/');
}

/**
 * 把後台存的站內連結校正成目前這個語系。站外網址與 `#`、`mailto:` 原樣回傳。
 *
 * <p>
 * 區段裡的連結欄位是**跨語系共用**的（`x-localeInvariant`）—— 兩個語系存的是
 * 同一個字串。編輯者在中文分頁填 `/zh-TW/products`，英文頁拿到的也是它，
 * 於是英文首頁的型錄卡跳到中文頁（正式站 2026-11 實測）。
 * 所以存什麼前綴都不算數：`/zh-TW/products`、`/en/products`、`/products`
 * 一律改成 `/{locale}/products`。
 * </p>
 */
export function localizeHref(url: string, locale: Locale): string {
  // 只處理站內的絕對路徑；`//host` 是協定相對網址，屬站外
  if (!url.startsWith('/') || url.startsWith('//')) return url;

  const segments = url.split('/');
  if (isLocale(segments[1])) segments.splice(1, 1);

  const rest = segments.slice(1).join('/');
  return rest ? `/${locale}/${rest}` : `/${locale}`;
}
