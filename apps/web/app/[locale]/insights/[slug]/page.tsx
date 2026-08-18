import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { ArticleDetailPage } from '@/components/ArticleDetailPage';

type Params = { locale: string; slug: string };

const LIST_LABEL: Record<Locale, string> = { en: 'Insights', 'zh-TW': '專欄文章' };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const a = await api.article(locale, 'insights', slug);
  if (!a) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';
  const path = `/insights/${slug}`;

  return {
    title: a.seo.title ?? a.title,
    description: a.seo.description ?? a.excerpt ?? a.standfirst ?? undefined,
    alternates: {
      canonical: `${siteUrl}/${locale}${path}`,
      languages: { en: `${siteUrl}/en${path}`, 'zh-TW': `${siteUrl}/zh-TW${path}` },
    },
    openGraph: {
      type: 'article',
      title: a.seo.title ?? a.title,
      description: a.seo.description ?? a.excerpt ?? undefined,
      images: a.seo.ogImage ?? a.cover?.url,
      publishedTime: a.publishedAt ?? undefined,
    },
  };
}

export default async function InsightDetailPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  // 排程發布（PublishedAt 為未來時間）與缺該語系翻譯，後端都回 404
  const a = await api.article(locale, 'insights', slug);
  if (!a) notFound();

  return (
    <ArticleDetailPage
      article={a}
      locale={locale}
      kind="insights"
      listLabel={LIST_LABEL[locale]}
    />
  );
}
