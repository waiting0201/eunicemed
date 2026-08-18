import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { CategoryHero } from '@/components/CategoryHero';
import { FilterChips } from '@/components/FilterChips';
import { ProductGrid } from '@/components/ProductGrid';

type Params = { locale: string; category: string };
type Search = { collection?: string; bodyPart?: string; subCategory?: string };

const COPY: Record<Locale, { collection: string; bodyPart: string; subCategory: string; count: (n: number) => string }> = {
  en: {
    collection: 'Collection',
    bodyPart: 'Body part',
    subCategory: 'Sub-category',
    count: (n) => `${n} product${n === 1 ? '' : 's'}`,
  },
  'zh-TW': {
    collection: '系列',
    bodyPart: '適用部位',
    subCategory: '子分類',
    count: (n) => `${n} 項產品`,
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  if (!isLocale(locale)) return {};

  const data = await api.category(locale, category);
  if (!data) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';
  const path = `/products/${category}`;

  return {
    title: data.seo.title ?? data.name,
    description: data.seo.description ?? data.description ?? undefined,
    alternates: {
      canonical: `${siteUrl}/${locale}${path}`,
      // 缺該語系時後端會 404，hreflang 仍照列 —— 由對方語系頁自行回 404，
      // 這比在這裡臆測哪個語系有內容更誠實
      languages: { en: `${siteUrl}/en${path}`, 'zh-TW': `${siteUrl}/zh-TW${path}` },
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { locale, category } = await params;
  const q = await searchParams;

  if (!isLocale(locale)) notFound();

  // 缺該語系翻譯時後端回 404 → 這裡就是 404，**不退回英文**（docs/08 §5.2）
  const data = await api.category(locale, category);
  if (!data) notFound();

  const result = await api.products(locale, {
    category,
    subCategory: q.subCategory,
    collection: q.collection,
    bodyPart: q.bodyPart,
    facets: 'true',
    pageSize: '24',
  });

  const c = COPY[locale];
  const basePath = `/${locale}/products/${category}`;
  const facets = result.facets ?? {};

  return (
    <>
      <CategoryHero data={data} locale={locale} kind="category" />

      {/* 子分類：唯一有獨立 URL 的產品維度（docs/06 §2），因此用連結而非 chip 篩選 */}
      {data.subCategories.length > 0 && (
        <section className="border-y border-hairline bg-tint-deep">
          <div className="mx-auto flex max-w-content flex-wrap gap-x-6 gap-y-2 px-6 py-4 text-sm lg:px-16">
            {data.subCategories.map((s) => (
              <Link key={s.slug} href={`${basePath}/${s.slug}`} className="hover:underline">
                {s.name}
                <span className="ml-1.5 text-grey">{s.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

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
