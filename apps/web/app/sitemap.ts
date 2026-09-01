import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { DEFAULT_LOCALE } from '@/lib/locale';
import { SITE_URL as SITE } from '@/lib/site';

/**
 * sitemap.xml。資料來自 `GET /sitemap`（docs/06 §3）。
 *
 * <p>
 * ⚠️ **hreflang 只列該路徑真的有內容的語系。** API 的 `locales` 已經算好了 ——
 * 前端不可以自己補滿 en + zh-TW：語言純度會讓缺翻譯的頁面回 404，
 * 那等於向搜尋引擎宣告一堆 404，並在 alternates 裡互指到不存在的頁面。
 * </p>
 *
 * <p>
 * 純 SSR、不使用 ISR，所以這支每次被抓都是最新的。
 * </p>
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await api.sitemap();

  return entries.flatMap((entry) =>
    entry.locales.map((locale) => ({
      url: `${SITE}/${locale}${entry.path}`,
      lastModified: new Date(entry.lastModified),
      changeFrequency: entry.changeFreq as MetadataRoute.Sitemap[number]['changeFrequency'],
      priority: entry.priority,
      alternates: {
        languages: {
          ...Object.fromEntries(entry.locales.map((l) => [l, `${SITE}/${l}${entry.path}`])),
          // x-default 指向預設語系；該路徑沒有 en 版本時就不宣告，
          // 而不是硬指過去產生 404
          ...(entry.locales.includes(DEFAULT_LOCALE)
            ? { 'x-default': `${SITE}/${DEFAULT_LOCALE}${entry.path}` }
            : {}),
        },
      },
    })),
  );
}
