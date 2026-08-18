import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { CategoryHero } from '@/components/CategoryHero';
import { FilterChips } from '@/components/FilterChips';
import { ProductGrid } from '@/components/ProductGrid';

type Params = { locale: string; category: string; sub: string };
type Search = { collection?: string; bodyPart?: string };

const COPY: Record<Locale, { collection: string; bodyPart: string; back: string; count: (n: number) => string }> = {
  en: {
    collection: 'Collection',
    bodyPart: 'Body part',
    back: 'Back to',
    count: (n) => `${n} product${n === 1 ? '' : 's'}`,
  },
  'zh-TW': {
    collection: '系列',
    bodyPart: '適用部位',
    back: '返回',
    count: (n) => `${n} 項產品`,
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, category, sub } = await params;
  if (!isLocale(locale)) return {};

  const data = await api.subCategory(locale, category, sub);
  if (!data) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';
  const path = `/products/${category}/${sub}`;

  return {
    title: data.seo.title ?? data.name,
    // 子分類頁有獨立 URL，SEO 敘述是必填 —— 缺的話這裡會是 undefined，
    // 屬於內容缺口而非程式問題（docs/05 §4 的 thin-page 提醒）
    description: data.seo.description ?? data.description ?? undefined,
    alternates: {
      canonical: `${siteUrl}/${locale}${path}`,
      languages: { en: `${siteUrl}/en${path}`, 'zh-TW': `${siteUrl}/zh-TW${path}` },
    },
  };
}

export default async function SubCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { locale, category, sub } = await params;
  const q = await searchParams;

  if (!isLocale(locale)) notFound();

  // 後端會驗證 category 與 sub 的歸屬，不符即 404 —— 前端不需要也不該自己比對
  const data = await api.subCategory(locale, category, sub);
  if (!data) notFound();

  const result = await api.products(locale, {
    subCategory: sub,
    collection: q.collection,
    bodyPart: q.bodyPart,
    facets: 'true',
    pageSize: '24',
  });

  const c = COPY[locale];
  const basePath = `/${locale}/products/${category}/${sub}`;
  const facets = result.facets ?? {};

  return (
    <>
      <div className="mx-auto max-w-content px-6 pt-6 text-sm lg:px-16">
        <Link href={`/${locale}/products/${category}`} className="text-grey">
          ← {c.back} {category}
        </Link>
      </div>

      <CategoryHero data={data} locale={locale} kind="subCategory" />

      <section id="grid" className="bg-tint py-14">
        <div className="mx-auto max-w-content px-6 lg:px-16">
          <div className="space-y-3">
            <FilterChips
              label={c.collection}
              param="collection"
              facets={facets.collections ?? []}
              active={q.collection}
              basePath={basePath}
              query={q}
              locale={locale}
            />
            <FilterChips
              label={c.bodyPart}
              param="bodyPart"
              facets={facets.bodyParts ?? []}
              active={q.bodyPart}
              basePath={basePath}
              query={q}
              locale={locale}
            />
          </div>

          <p className="mt-6 text-sm text-grey">{c.count(result.totalCount)}</p>

          <div className="mt-5">
            <ProductGrid items={result.items} locale={locale} />
          </div>
        </div>
      </section>
    </>
  );
}
