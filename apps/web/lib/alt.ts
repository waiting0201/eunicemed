import { isLocale, type Locale } from './locale';

/**
 * 產品圖的 alt，格式由文案定稿指定：`EuniceMed {產品名}, made in Taiwan`。
 *
 * <p>
 * 刻意**不用 `Media.AltText`**：那個欄位一張圖只有一個值、不分語系，
 * 中文頁會拿到英文 alt（違反語言純度，docs/08 §5.2）。產品名本身已分語系，
 * 在這裡組句兩個語系都對。
 * </p>
 */
export function productImageAlt(name: string, locale: Locale): string {
  return locale === 'en' ? `EuniceMed ${name}, made in Taiwan` : `EuniceMed ${name}，台灣製造`;
}

/**
 * 從 API 回傳的站內網址（一律 `/{locale}/…`）取出語系。
 * 給拿不到 `locale` prop 的共用元件用（如 `ProductCard`）。
 */
export function localeOfUrl(url: string): Locale | null {
  const seg = url.split('/')[1];
  return seg && isLocale(seg) ? seg : null;
}
