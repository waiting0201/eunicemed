import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type CategoryDetail, type MediaRef } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { section, type SectionCta } from '@/lib/page';
import { FilterChips } from '@/components/FilterChips';
import { css } from '@/lib/css';
import { pageMetadata } from '@/lib/seo';
import { PageBand } from '@/components/PageBand';
import { PageHero } from '@/components/PageHero';
import { ProductGrid } from '@/components/ProductGrid';

/** 樣式逐字取自 `mockup4/Products.dc.html`。 */
const S = {
  cats: css`max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,80px) clamp(24px,5vw,64px) 0;`,
  catGrid: css`display:grid;grid-template-columns:repeat(3,1fr);gap:24px;`,
  catCard: css`background:#FFFFFF;border:1px solid #DFE9EC;border-radius:20px;overflow:hidden;`,
  catMedia: css`position:relative;aspect-ratio:1/1;border-radius:18px;overflow:hidden;background:#F0F6F8;`,
  catImg: css`display:block;width:100%;height:100%;object-fit:cover;`,
  catBody: css`padding:20px 22px 24px;`,
  catName: css`color:#16333B;font-weight:570;font-size:1.15rem;`,
  catDesc: css`font-size:.9rem;margin-top:4px;`,

  grid: css`background:#F5FAFB;padding:clamp(56px,7vw,80px) 0;margin-top:clamp(56px,7vw,80px);`,
  gridInner: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);`,
  // mockup4 只有一列篩選；本站有三個維度（分類／系列／部位），列距沿用同一個 12px
  filters: css`display:flex;flex-direction:column;gap:12px;margin-bottom:36px;`,
  count: css`margin-top:24px;font-size:.85rem;color:#66787F;`,
  gridWrap: css`margin-top:24px;`,

  cta: css`position:relative;overflow:hidden;color:#fff;padding:clamp(72px,9vw,110px) 0;`,
  ctaImg: css`position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;`,
  ctaFallback: css`position:absolute;inset:0;background:#14262C;`,
  ctaScrim: css`position:absolute;inset:0;background:linear-gradient(90deg,rgba(9,36,45,.74) 0%,rgba(9,36,45,.5) 52%,rgba(9,36,45,.14) 100%);`,
  ctaInner: css`position:relative;max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);text-align:center;`,
  ctaTitle: css`color:#fff;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.4rem);`,
  ctaLead: css`color:rgba(255,255,255,.82);max-width:52ch;margin:14px auto 0;font-size:1.05rem;`,
  ctaRow: css`display:flex;gap:12px;justify-content:center;margin-top:30px;flex-wrap:wrap;`,
  ctaPrimary: css`display:inline-block;background:#00B5CD;color:#fff;font-weight:620;padding:13px 30px;border-radius:999px;`,
  ctaOutline: css`display:inline-block;border:1.5px solid rgba(255,255,255,.55);color:#fff;font-weight:620;padding:12px 28px;border-radius:999px;`,
} as const;

type Params = { locale: string };
type Search = { category?: string; collection?: string; bodyPart?: string };

type HeroSection = { band?: MediaRef };
type CtaSection = { background?: MediaRef };

/**
 * 版面文案 —— 頁首與頁尾 CTA 帶**刻意寫死，不走 CMS**（決議見 docs/15-cms-scope.md）。
 * 英文逐字取自 `mockup4/Products.dc.html`；篩選列的標籤本來就在這裡。
 */
const COPY: Record<
  Locale,
  {
    hero: { eyebrow: string; title: string; lead: string };
    cta: { title: string; body: string; primary: string; secondary: string };
    category: string;
    collection: string;
    bodyPart: string;
    count: (n: number) => string;
  }
> = {
  en: {
    hero: {
      eyebrow: 'Products',
      title: 'Three ways to support motion',
      lead:
        'Specialists in smart support: compression stockings, orthopedic supports and ' +
        'silicone footcare — every product graded Care · Protect · Advance.',
    },
    cta: {
      title: 'Not sure which support you need?',
      body: 'Explore by body part on our interactive map, or ask our team for a recommendation.',
      primary: 'Find by body part',
      secondary: 'Contact us',
    },
    category: 'Category',
    collection: 'Collection',
    bodyPart: 'Body part',
    count: (n) => `${n} product${n === 1 ? '' : 's'}`,
  },
  'zh-TW': {
    hero: {
      eyebrow: '產品',
      title: '支撐動作的三種方式',
      lead:
        '我們專注於智慧支撐：醫療彈性襪、矯型護具與矽膠足部照護 —— ' +
        '每一件產品都標示 Care · Protect · Advance 強度。',
    },
    cta: {
      title: '不確定自己需要哪一種支撐？',
      body: '在互動人體圖上依部位探索，或直接詢問我們的團隊。',
      primary: '依部位尋找',
      secondary: '聯絡我們',
    },
    category: '分類',
    collection: '系列',
    bodyPart: '適用部位',
    count: (n) => `${n} 項產品`,
  },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};


  return pageMetadata({
    locale,
    path: '/products',
    title: COPY[locale].hero.title,
    description: COPY[locale].hero.lead,
  });
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
      <PageBand image={hero?.band} />

      <PageHero
        eyebrow={c.hero.eyebrow}
        title={c.hero.title}
        lead={c.hero.lead}
      />

      {/* 三大分類卡 —— 動態取自 GET /categories */}
      {categories.length > 0 && (
        <section style={S.cats}>
          <div style={S.catGrid} data-r="cols-2">
            {categories.map((cat) => (
              <CategoryCard key={cat.slug} category={cat} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* 篩選 + 產品格 */}
      <section id="grid" style={S.grid}>
        <div style={S.gridInner}>
          <div style={S.filters}>
            <FilterChips
              label={c.category}
              param="category"
              facets={facets.categories ?? []}
              active={q.category}
              basePath={basePath}
              query={q}
              locale={locale}
              tone="ink"
            />
            <FilterChips
              label={c.collection}
              param="collection"
              facets={facets.collections ?? []}
              active={q.collection}
              basePath={basePath}
              query={q}
              locale={locale}
              tone="ink"
            />
            <FilterChips
              label={c.bodyPart}
              param="bodyPart"
              facets={facets.bodyParts ?? []}
              active={q.bodyPart}
              basePath={basePath}
              query={q}
              locale={locale}
              tone="ink"
            />
          </div>

          <p style={S.count}>{c.count(result.totalCount)}</p>

          <div style={S.gridWrap}>
            <ProductGrid items={result.items} locale={locale} />
          </div>
        </div>
      </section>

      {/* 頁尾 CTA 帶 —— 文案是常數，CMS 只管背景圖，所以整段無條件渲染 */}
      <section style={S.cta}>
          {cta?.background ? (
            <>
              <img
                src={cta.background.url}
                srcSet={srcSetOf(cta.background)}
                sizes="100vw"
                alt=""
                loading="lazy"
                decoding="async"
                style={S.ctaImg}
              />
              {/* 由左至右的深青遮罩：左側文字讀得到、右側照片保持乾淨（DESIGN.md） */}
              <div style={S.ctaScrim} />
            </>
          ) : (
            /* 編輯者沒放背景圖時的底色。mockup4 一定有圖，這裡取全站唯一的深色面 */
            <div style={S.ctaFallback} />
          )}

          <div style={S.ctaInner}>
            <h2 style={S.ctaTitle}>{c.cta.title}</h2>
            <p style={S.ctaLead}>{c.cta.body}</p>
            <div style={S.ctaRow}>
              <CtaLink
                cta={{ label: c.cta.primary, url: `/${locale}/applications` }}
                primary
              />
              <CtaLink cta={{ label: c.cta.secondary, url: `/${locale}/contact` }} />
            </div>
          </div>
        </section>
    </>
  );
}

/**
 * 分類卡。圖與文都在 `Category` 實體上（docs/09 §4.1），不是區段內容 ——
 * 所以改分類名稱只要改一個地方，總覽頁與分類頁會一起變。
 *
 * 圖是**卡片圖**（`Category.ImageMediaId`，preset `square`），不是落地頁的
 * `heroImage`（16:10）—— 這格是 1:1，拿 hero 來裁會把構圖切掉兩側。
 */
function CategoryCard({ category, locale }: { category: CategoryDetail; locale: Locale }) {
  return (
    <Link href={`/${locale}/products/${category.slug}`} style={S.catCard} data-hover="lift-shadow">
      <div style={S.catMedia}>
        {category.image && (
          <img
            src={category.image.url}
            srcSet={srcSetOf(category.image)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
            /* 卡圖與產品共用同一筆媒體，alt 是產品名 —— 這裡要的是分類名，
               與 mockup4 的 `alt` 一致 */
            alt={category.name}
            loading="lazy"
            decoding="async"
            width={1200}
            height={1200}
            style={S.catImg}
          />
        )}
      </div>
      <div style={S.catBody}>
        <h3 style={S.catName}>{category.name}</h3>
        {category.description && <p style={S.catDesc}>{category.description}</p>}
      </div>
    </Link>
  );
}

function CtaLink({ cta, primary = false }: { cta: SectionCta; primary?: boolean }) {
  const style = primary ? S.ctaPrimary : S.ctaOutline;

  const label = cta.label ?? cta.url!;

  return cta.external ? (
    <a href={cta.url} target="_blank" rel="noopener" style={style} className="hover:text-white">
      {label}
    </a>
  ) : (
    <Link href={cta.url!} style={style} className="hover:text-white">
      {label}
    </Link>
  );
}
