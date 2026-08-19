import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { CategoryHero } from '@/components/CategoryHero';
import { FilterChips, LinkChips } from '@/components/FilterChips';
import { ProductGrid } from '@/components/ProductGrid';
import { Breadcrumb } from '@/components/Breadcrumb';
import { SiblingNav } from '@/components/SiblingNav';
import { CategoryOutro } from '@/components/CategoryOutro';

type Params = { locale: string; category: string };
type Search = { collection?: string; bodyPart?: string; subCategory?: string };

const COPY: Record<
  Locale,
  {
    collection: string;
    bodyPart: string;
    subCategory: string;
    products: string;
    allProducts: string;
    all: string;
    count: (n: number) => string;
  }
> = {
  en: {
    collection: 'Collection',
    bodyPart: 'Body part',
    subCategory: 'Sub-category',
    products: 'Products',
    allProducts: 'All products',
    all: 'All',
    count: (n) => `${n} product${n === 1 ? '' : 's'}`,
  },
  'zh-TW': {
    collection: '系列',
    bodyPart: '適用部位',
    subCategory: '子分類',
    products: '產品',
    allProducts: '全部產品',
    all: '全部',
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

  // 兄弟分類切換列（mockup4 §2）。取不到就不渲染那條，不擋整頁。
  const siblings = await api.categories(locale).catch(() => []);

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
      <Breadcrumb
        trail={[{ href: `/${locale}/products`, label: c.products }]}
        current={data.name}
      />

      <CategoryHero data={data} locale={locale} kind="category" />

      <SiblingNav
        items={siblings.map((s) => ({
          href: `/${locale}/products/${s.slug}`,
          label: s.name,
        }))}
        activeHref={basePath}
        tail={{ href: `/${locale}/products`, label: c.allProducts }}
      />

      <section id="grid" className="bg-tint py-[clamp(48px,6vw,72px)]">
        <div className="mx-auto max-w-content px-gutter">
          <div className="space-y-3.5">
            {/* 子分類是唯一有獨立 URL 的產品維度（docs/06 §2），所以是連結而非 query 篩選 */}
            {data.subCategories.length > 0 && (
              <LinkChips
                label={c.subCategory}
                items={data.subCategories.map((s) => ({
                  href: `${basePath}/${s.slug}`,
                  label: s.name,
                  count: s.count,
                }))}
                allHref={basePath}
                allLabel={c.all}
              />
            )}
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

          <p className="mt-6 text-[0.85rem] text-[#66787F]">{c.count(result.totalCount)}</p>

          <div className="mt-6">
            <ProductGrid items={result.items} locale={locale} />
          </div>
        </div>
      </section>

      <CategoryOutro supportLevels={data.supportLevels} locale={locale} />
    </>
  );
}
