import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { ArticleListPage } from '@/components/ArticleListPage';

type Params = { locale: string };
type Search = { category?: string };

const COPY: Record<Locale, { eyebrow: string; title: string; lead: string; empty: string }> = {
  en: {
    eyebrow: 'Insights',
    title: 'Stories & perspectives',
    lead: 'On medical innovation, sustainability and the communities we support.',
    empty: 'No articles in this category yet.',
  },
  'zh-TW': {
    eyebrow: '專欄文章',
    title: '觀點與故事',
    lead: '關於醫療創新、永續發展，以及我們支持的社群。',
    empty: '這個分類目前還沒有文章。',
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
      canonical: `${siteUrl}/${locale}/insights`,
      languages: {
        en: `${siteUrl}/en/insights`,
        'zh-TW': `${siteUrl}/zh-TW/insights`,
      },
    },
  };
}

export default async function InsightsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const q = await searchParams;
  if (!isLocale(locale)) notFound();

  const result = await api.articles(locale, 'insights', q.category);

  return (
    <ArticleListPage
      locale={locale}
      kind="insights"
      result={result}
      activeCategory={q.category}
      copy={COPY[locale]}
    />
  );
}
