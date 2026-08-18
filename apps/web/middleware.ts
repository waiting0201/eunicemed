import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE, LOCALES, negotiateLocale } from '@/lib/locale';
import { getRedirects, normalize } from '@/lib/redirects';

/**
 * 語系前綴 + 舊網址轉址。
 *
 * <p>
 * 順序是**先轉址再補語系前綴**：轉址規則存的是完整路徑（含語系前綴），
 * 因為舊站的網址結構不一定與新站的語系規則相同（docs/10-legacy-content.md）。
 * 反過來做的話，`/find-your-product` 會先被補成 `/en/find-your-product`
 * 再去比對，而規則裡存的可能是不帶前綴的那一份。
 * </p>
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const rule = (await getRedirects()).get(normalize(pathname));
  if (rule) {
    const target = req.nextUrl.clone();
    target.pathname = rule.to;
    return NextResponse.redirect(target, rule.status);
  }

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
