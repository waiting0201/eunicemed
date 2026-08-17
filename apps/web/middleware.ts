import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE, LOCALES, negotiateLocale } from '@/lib/locale';

/**
 * 語系前綴：所有路由一律帶 `/[locale]`（docs/06-sitemap.md）。
 * 沒帶前綴的請求依 Accept-Language 導向對應語系。
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasLocale = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocale) return NextResponse.next();

  const locale = negotiateLocale(req.headers.get('accept-language')) ?? DEFAULT_LOCALE;
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * 比對所有路徑，但排除：
     * - .swa      Azure Static Web Apps 的部署驗證路徑（/.swa/health.html）
     *             ⚠️ 這一項不可拿掉。SWA 會請求該路徑確認站台起得來，
     *             被 middleware 導向就會判定部署失敗，而錯誤訊息不會指向這裡。
     *             見 docs/07-azure-deployment.md §7.2。
     * - api       Next.js 的 route handlers
     * - _next     框架資產
     * - 靜態檔    有副檔名的一律放行
     */
    '/((?!\\.swa|api|_next/static|_next/image|favicon\\.ico|.*\\.[\\w]+$).*)',
  ],
};
