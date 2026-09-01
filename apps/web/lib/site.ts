import type { Locale } from './locale';

/**
 * 站台絕對網址。**唯一真相來源** —— 在這之前 19 個頁面各自寫了一次
 * `process.env.NEXT_PUBLIC_SITE_URL ?? '...'`，改網域要改 19 個地方。
 *
 * <p>
 * 這一支刻意**不加 `server-only`**：`NEXT_PUBLIC_` 前綴的值本來就會進 client bundle，
 * 而 JSON-LD 的組裝（lib/schema.ts）與麵包屑元件都要用到絕對網址。
 * </p>
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';

/** 這一份部署是不是正式站。robots.txt 與 llms.txt 用它決定要不要露出。 */
export const IS_PRODUCTION_SITE = SITE_URL === 'https://www.eunicemed.com';

/**
 * 內容沒有自己的圖時共用的 OG 圖（1200×630）。
 * 由 `tools/og-image/build.py` 產生，見該檔說明。
 */
export const OG_IMAGE_DEFAULT = `${SITE_URL}/brand/og-default.png`;

/** 品牌 logo 的絕對網址。JSON-LD 的 `Organization.logo` 要絕對路徑。 */
export const BRAND_LOGO_URL = `${SITE_URL}/brand/eunicemed-logo.png`;

/**
 * 語系無關的路徑（首頁是 `''`）組成絕對網址。
 *
 * <p>
 * 路徑一律不帶尾斜線 —— canonical 與 sitemap 必須逐字相同，
 * 多一條斜線在 Search Console 會被當成另一個網址。
 * </p>
 */
export function absoluteUrl(locale: Locale | string, path = ''): string {
  return `${SITE_URL}/${locale}${path}`;
}

/** 相對路徑補成絕對；已經是絕對網址（Blob 上的圖）就原樣回傳。 */
export function toAbsolute(url: string): string {
  return url.startsWith('http') ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
