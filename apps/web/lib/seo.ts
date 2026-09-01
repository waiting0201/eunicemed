import 'server-only';
import type { Metadata } from 'next';
import { DEFAULT_LOCALE, type Locale } from './locale';
import { localesOf } from './hreflang';
import { absoluteUrl, OG_IMAGE_DEFAULT, toAbsolute } from './site';

/**
 * 每一頁的 metadata 產生器（docs/06 §5）。
 *
 * <p>
 * 收斂前 19 個頁面各自手寫 canonical / hreflang，且**只有 3 頁有 Open Graph、
 * 全站沒有 Twitter Card、也沒有預設 OG 圖** —— 分享列表頁到社群是一片空白。
 * 這一支把 §5 要求的六項（title / description / canonical / hreflang / OG /
 * Twitter）綁在一起，新頁面不會再漏掉其中幾項。
 * </p>
 */
export type PageMetaInput = {
  locale: Locale;
  /** **不含語系前綴**的路徑，首頁傳 `''`。與 sitemap 的 `path` 同一個格式。 */
  path?: string;
  title: string;
  description?: string | null;
  /** 內容自己的圖（CMS 的 ogImage 或封面）。沒有就用全站預設 OG 圖。 */
  image?: string | null;
  /** 文章頁傳 `article`，其餘不用傳。 */
  type?: 'website' | 'article';
  /** `type: 'article'` 時的發布時間（ISO 8601）。 */
  publishedTime?: string | null;
  /**
   * 覆寫 hreflang 的語系清單。
   * 只有**不在 sitemap 裡**的頁面需要傳（目前只有 contact，見 `SiteHandler.StaticPaths`）。
   */
  locales?: Locale[];
};

/**
 * Open Graph 的 `og:locale` 要 `語言_地區` 的形式，光給 `en` 不合規格。
 * 這是社群平台的格式要求，與站內語系代碼（`en` / `zh-TW`）是兩回事。
 */
const OG_LOCALE: Record<Locale, string> = { en: 'en_US', 'zh-TW': 'zh_TW' };

export async function pageMetadata(input: PageMetaInput): Promise<Metadata> {
  const { locale, path = '', title, type = 'website' } = input;

  const url = absoluteUrl(locale, path);
  const description = input.description ?? undefined;

  // 只印真的有內容的語系；查不到就只印自己這一個（見 lib/hreflang.ts）
  const locales = input.locales ?? (await localesOf(path)) ?? [locale];

  const languages: Record<string, string> = Object.fromEntries(
    locales.map((l) => [l, absoluteUrl(l, path)]),
  );
  // x-default 指向預設語系；該路徑沒有預設語系版本時就不宣告（同 app/sitemap.ts）
  if (locales.includes(DEFAULT_LOCALE)) {
    languages['x-default'] = absoluteUrl(DEFAULT_LOCALE, path);
  }

  const image = input.image ? toAbsolute(input.image) : OG_IMAGE_DEFAULT;

  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type,
      url,
      siteName: 'EuniceMed',
      locale: OG_LOCALE[locale],
      title,
      description,
      // 尺寸只在用預設圖時宣告 —— CMS 上傳的圖比例不固定，寫死會讓預覽被裁錯
      images: input.image
        ? [{ url: image }]
        : [{ url: image, width: 1200, height: 630 }],
      ...(type === 'article' && input.publishedTime
        ? { publishedTime: input.publishedTime }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
