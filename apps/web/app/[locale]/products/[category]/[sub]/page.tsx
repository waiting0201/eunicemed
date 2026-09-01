import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { CategoryHero } from '@/components/CategoryHero';
import { FilterChips } from '@/components/FilterChips';
import { Pagination } from '@/components/Pagination';
import { ProductGrid } from '@/components/ProductGrid';
import { css } from '@/lib/css';
import { pageMetadata } from '@/lib/seo';
import { Breadcrumb } from '@/components/Breadcrumb';
import { SiblingNav } from '@/components/SiblingNav';
import { CategoryOutro } from '@/components/CategoryOutro';

/** 樣式逐字取自 `mockup4/Product Category.dc.html` 的 §3 PRODUCT GRID + FILTERS。 */
const S = {
  grid: css`background:#F5FAFB;padding:clamp(48px,6vw,72px) 0;`,
  inner: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);`,
  filters: css`display:flex;flex-direction:column;gap:14px;`,
  count: css`margin-top:24px;font-size:.85rem;color:#66787F;`,
  gridWrap: css`margin-top:24px;`,
} as const;

type Params = { locale: string; category: string; sub: string };
type Search = { collection?: string; bodyPart?: string; page?: string };

const COPY: Record<
  Locale,
  { collection: string; bodyPart: string; products: string; count: (n: number) => string }
> = {
  en: {
    collection: 'Collection',
    bodyPart: 'Body part',
    products: 'Products',
    count: (n) => `${n} product${n === 1 ? '' : 's'}`,
  },
  'zh-TW': {
    collection: '系列',
    bodyPart: '適用部位',
    products: '產品',
    count: (n) => `${n} 項產品`,
  },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, category, sub } = await params;
  if (!isLocale(locale)) return {};

  const data = await api.subCategory(locale, category, sub);
  if (!data) return {};


  return pageMetadata({
    locale,
    path: `/products/${category}/${sub}`,
    title: data.seo.title ?? data.name,
    // 子分類頁有獨立 URL，SEO 敘述是必填 —— 缺的話這裡會是 undefined，
    // 屬於內容缺口而非程式問題（docs/05 §4 的 thin-page 提醒）
    description: data.seo.description ?? data.description,
    image: data.seo.ogImage ?? data.heroImage?.url ?? data.image?.url,
  });
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

  // 兄弟子分類切換列（mockup4 §2 的同層版本）。取不到就不渲染那條，不擋整頁。
  const parent = await api.category(locale, category).catch(() => null);

  const result = await api.products(locale, {
    subCategory: sub,
    collection: q.collection,
    bodyPart: q.bodyPart,
    facets: 'true',
    page: q.page,
    pageSize: '24',
  });

  const c = COPY[locale];
  const basePath = `/${locale}/products/${category}/${sub}`;
  const facets = result.facets ?? {};

  return (
    <>
      <Breadcrumb
        trail={[
          { href: `/${locale}/products`, label: c.products },
          { href: `/${locale}/products/${category}`, label: parent?.name ?? category },
        ]}
        current={data.name}
      />

      <CategoryHero data={data} locale={locale} kind="subCategory" />

      <SiblingNav
        items={(parent?.subCategories ?? []).map((s) => ({
          href: `/${locale}/products/${category}/${s.slug}`,
          label: s.name,
        }))}
        activeHref={basePath}
        tail={{
          href: `/${locale}/products/${category}`,
          label: parent?.name ?? c.products,
        }}
      />

      <section id="grid" style={S.grid}>
        <div style={S.inner}>
          <div style={S.filters}>
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

          <p style={S.count}>{c.count(result.totalCount)}</p>

          <div style={S.gridWrap}>
            <ProductGrid items={result.items} locale={locale} variant="card" />
          </div>

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            basePath={basePath}
            query={q}
            variant="catalogue"
          />
        </div>
      </section>

      <CategoryOutro supportLevels={data.supportLevels} locale={locale} />
    </>
  );
}
