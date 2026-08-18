import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';

/**
 * robots.txt（docs/06 §4）。
 *
 * <p>
 * **非正式環境整站 Disallow**：SWA 的 PR 預覽環境有自己的網址，被索引的話
 * 會與正式站互相稀釋。判準是 `NEXT_PUBLIC_SITE_URL` 是否為正式網域 ——
 * 用環境變數而非 `NODE_ENV`，因為預覽環境也是 production build。
 * </p>
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction = SITE === 'https://www.eunicemed.com';

  if (!isProduction) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /admin 是同一個 app 的一部分（SWA 單一 app），/api 是 Function App 的代理路徑
        disallow: ['/api/', '/admin'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
