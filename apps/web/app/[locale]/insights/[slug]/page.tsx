import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { pageMetadata } from '@/lib/seo';
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


  return pageMetadata({
    locale,
    path: `/insights/${slug}`,
    title: a.seo.title ?? a.title,
    description: a.seo.description ?? a.excerpt ?? a.standfirst,
    image: a.seo.ogImage ?? a.cover?.url,
    type: 'article',
    publishedTime: a.publishedAt,
  });
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
