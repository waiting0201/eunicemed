import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, LOCALES } from '@/lib/locale';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { FloatingContact } from '@/components/FloatingContact';
import '../globals.css';

export const viewport: Viewport = {
  themeColor: '#00B5CD',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: 'EuniceMed',
      template: '%s · EuniceMed',
    },
    // 品牌 slogan 是品牌符號，不翻譯（docs/08 §5.2 的例外清單）
    description: 'Not Just a Motion — enhancing your quality of life',
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [l, `${siteUrl}/${l}`])),
    },
    openGraph: { locale, siteName: 'EuniceMed' },
  };
}

/**
 * **純 SSR，不做任何預先產生**（docs/02-frontend.md §1）。
 *
 * 不要加 `generateStaticParams` —— 加了之後 Next 會在 build 時把該語系的頁面
 * 預先渲染成靜態 HTML（build 輸出會標成 ● SSG），於是後台發布的內容要等下一次
 * 部署才看得到。本站沒有 revalidation webhook（也刻意不做），一旦被靜態化就永遠不更新。
 */
export const dynamic = 'force-dynamic';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 未支援的語系直接 404 —— 不 fallback 到 en。
  // 這與後端「缺翻譯就 404」是同一條語言純度原則（docs/08 §5.2）。
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader locale={locale} />
        <main className="flex-1">{children}</main>
        <SiteFooter locale={locale} />
        <FloatingContact locale={locale} />
      </body>
    </html>
  );
}
