import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type CategoryDetail, type MediaRef } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { section, type SectionCta } from '@/lib/page';
import { FilterChips } from '@/components/FilterChips';
import { PageHero } from '@/components/PageHero';
import { ProductGrid } from '@/components/ProductGrid';

type Params = { locale: string };
type Search = { category?: string; collection?: string; bodyPart?: string };

type HeroSection = { band?: MediaRef; eyebrow?: string; title?: string; lead?: string };
type CtaSection = {
  background?: MediaRef;
  title?: string;
  body?: string;
  primaryCta?: SectionCta;
  secondaryCta?: SectionCta;
};

const COPY: Record<
  Locale,
  { fallbackTitle: string; category: string; collection: string; bodyPart: string; count: (n: number) => string }
> = {
  en: {
    fallbackTitle: 'Products',
    category: 'Category',
    collection: 'Collection',
    bodyPart: 'Body part',
    count: (n) => `${n} product${n === 1 ? '' : 's'}`,
  },
  'zh-TW': {
    fallbackTitle: '產品',
    category: '分類',
    collection: '系列',
    bodyPart: '適用部位',
    count: (n) => `${n} 項產品`,
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const page = await api.page(locale, 'products');
  const hero = page ? section<HeroSection>(page, 'hero') : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';

  return {
    title: hero?.title ?? COPY[locale].fallbackTitle,
    description: hero?.lead,
    alternates: {
      canonical: `${siteUrl}/${locale}/products`,
      languages: { en: `${siteUrl}/en/products`, 'zh-TW': `${siteUrl}/zh-TW/products` },
    },
  };
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const q = await searchParams;
  if (!isLocale(locale)) notFound();

  // 三個來源並行。分類卡與產品格都是動態的（docs/09 §4.1）——
  // 這頁的 CMS 內容只有頁首與頁尾 CTA 兩段。
  const [page, categories, result] = await Promise.all([
    api.page(locale, 'products'),
    api.categories(locale),
    api.products(locale, {
      category: q.category,
      collection: q.collection,
      bodyPart: q.bodyPart,
      facets: 'true',
      pageSize: '24',
    }),
  ]);

  const hero = page ? section<HeroSection>(page, 'hero') : null;
  const cta = page ? section<CtaSection>(page, 'cta') : null;

  const c = COPY[locale];
  const basePath = `/${locale}/products`;
  const facets = result.facets ?? {};

  return (
    <>
      {hero?.band && (
        <img
          src={hero.band.url}
          srcSet={srcSetOf(hero.band)}
          sizes="100vw"
          alt={hero.band.alt ?? ''}
          width={2560}
          height={480}
          decoding="async"
          className="h-[clamp(160px,18.75vw,360px)] w-full object-cover"
        />
      )}

      <PageHero
        eyebrow={hero?.eyebrow ?? c.fallbackTitle}
        title={hero?.title ?? c.fallbackTitle}
        lead={hero?.lead}
      />

      {/* 三大分類卡 —— 動態取自 GET /categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-content px-6 py-14 lg:px-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <CategoryCard key={cat.slug} category={cat} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* 篩選 + 產品格 */}
      <section id="grid" className="bg-tint py-14">
        <div className="mx-auto max-w-content px-6 lg:px-16">
          <div className="space-y-3">
            <FilterChips
              label={c.category}
              param="category"
              facets={facets.categories ?? []}
              active={q.category}
              basePath={basePath}
              query={q}
              locale={locale}
            />
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

      {/* 頁尾 CTA 帶 */}
      {cta && (
        <section className="relative overflow-hidden py-16">
          {cta.background ? (
            <>
              <img
                src={cta.background.url}
                srcSet={srcSetOf(cta.background)}
                sizes="100vw"
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[rgba(10,38,46,.74)]" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[#12333c]" />
          )}

          <div className="relative mx-auto max-w-content px-6 text-center lg:px-16">
            {cta.title && (
              <h2 className="mx-auto max-w-[24ch] text-[clamp(1.8rem,3.4vw,2.3rem)] font-normal text-white">
                {cta.title}
              </h2>
            )}
            {cta.body && (
              <p className="mx-auto mt-4 max-w-[52ch] text-white/80">{cta.body}</p>
            )}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {cta.primaryCta?.url && <CtaLink cta={cta.primaryCta} primary />}
              {cta.secondaryCta?.url && <CtaLink cta={cta.secondaryCta} />}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/**
 * 分類卡。圖與文都在 `Category` 實體上（docs/09 §4.1），不是區段內容 ——
 * 所以改分類名稱只要改一個地方，總覽頁與分類頁會一起變。
 */
function CategoryCard({
  category,
  locale,
}: {
  category: CategoryDetail;
  locale: Locale;
}) {
  return (
    <Link
      href={`/${locale}/products/${category.slug}`}
      className="group overflow-hidden rounded-[20px] border border-hairline bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(10,60,72,.10)]"
    >
      <div className="aspect-[4/3] overflow-hidden bg-tint-deep">
        {category.heroImage && (
          <img
            src={category.heroImage.url}
            srcSet={srcSetOf(category.heroImage)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
            alt={category.heroImage.alt ?? category.name}
            loading="lazy"
            decoding="async"
            width={1200}
            height={900}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="px-5 pb-6 pt-5">
        <h3 className="text-[1.15rem] font-semibold">{category.name}</h3>
        {category.description && <p className="mt-1.5 text-[0.92rem]">{category.description}</p>}
      </div>
    </Link>
  );
}

function CtaLink({ cta, primary = false }: { cta: SectionCta; primary?: boolean }) {
  const className = primary
    ? 'rounded-full bg-white px-7 py-3 font-semibold text-brand-deep transition hover:bg-white/90'
    : 'rounded-full border-[1.5px] border-white/50 px-7 py-3 font-semibold text-white transition hover:border-white';

  const label = cta.label ?? cta.url!;

  return cta.external ? (
    <a href={cta.url} target="_blank" rel="noopener" className={className}>
      {label}
    </a>
  ) : (
    <Link href={cta.url!} className={className}>
      {label}
    </Link>
  );
}
