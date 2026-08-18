import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { ArticleListPage } from '@/components/ArticleListPage';

type Params = { locale: string };
type Search = { category?: string };

const COPY: Record<Locale, { eyebrow: string; title: string; lead: string; empty: string }> = {
  en: {
    eyebrow: 'News',
    title: 'The latest at EuniceMed',
    lead: 'Announcements, events and milestones from our team.',
    empty: 'No news in this category yet.',
  },
  'zh-TW': {
    eyebrow: '最新消息',
    title: 'EuniceMed 動態',
    lead: '公司公告、展會活動與重要里程碑。',
    empty: '這個分類目前還沒有消息。',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';
  const c = COPY[locale];

  return {
    title: c.title,
    description: c.lead,
    alternates: {
      canonical: `${siteUrl}/${locale}/news`,
      languages: {
        en: `${siteUrl}/en/news`,
        'zh-TW': `${siteUrl}/zh-TW/news`,
      },
    },
  };
}

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const q = await searchParams;
  if (!isLocale(locale)) notFound();

  const result = await api.articles(locale, 'news', q.category);

  return (
    <ArticleListPage
      locale={locale}
      kind="news"
      result={result}
      activeCategory={q.category}
      copy={COPY[locale]}
    />
  );
}
