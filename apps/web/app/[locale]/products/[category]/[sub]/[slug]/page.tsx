import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type Download, type ProductDetail } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { CollectionBadge } from '@/components/CollectionBadge';
import { ProductCard } from '@/components/ProductCard';
import { ProductGallery } from '@/components/ProductGallery';
import { SectionHeading } from '@/components/SectionHeading';
import { SizeChart } from '@/components/SizeChart';

type Params = { locale: string; category: string; sub: string; slug: string };

const COPY: Record<
  Locale,
  {
    products: string;
    features: string;
    useCases: string;
    specsAndSizes: string;
    specs: string;
    sizeChart: (measure?: string) => string;
    certifications: string;
    downloads: string;
    related: string;
    quote: string;
    viewSpecs: string;
    fileMeta: (d: Download) => string;
  }
> = {
  en: {
    products: 'Products',
    features: 'Features',
    useCases: 'When to use it',
    specsAndSizes: 'Specifications & sizes',
    specs: 'Specifications',
    sizeChart: (m) => (m ? `Size chart (${m})` : 'Size chart'),
    certifications: 'Certifications',
    downloads: 'Downloads',
    related: 'Related products',
    quote: 'Request a quote',
    viewSpecs: 'View specifications',
    fileMeta: (d) => `${d.fileLocale} · ${d.fileExt} · ${formatSize(d.sizeBytes)}`,
  },
  'zh-TW': {
    products: '產品',
    features: '產品特色',
    useCases: '適用時機',
    specsAndSizes: '規格與尺寸',
    specs: '規格',
    sizeChart: (m) => (m ? `尺寸對照（${m}）` : '尺寸對照'),
    certifications: '認證',
    downloads: '相關下載',
    related: '相關產品',
    quote: '索取報價',
    viewSpecs: '查看規格',
    fileMeta: (d) => `${d.fileLocale} · ${d.fileExt} · ${formatSize(d.sizeBytes)}`,
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, category, sub, slug } = await params;
  if (!isLocale(locale)) return {};

  const data = await api.product(locale, category, sub, slug);
  if (!data) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';
  const path = `/products/${category}/${sub}/${slug}`;

  return {
    title: data.seo.title ?? data.name,
    description: data.seo.description ?? data.summary ?? undefined,
    alternates: {
      canonical: `${siteUrl}/${locale}${path}`,
      languages: { en: `${siteUrl}/en${path}`, 'zh-TW': `${siteUrl}/zh-TW${path}` },
    },
    openGraph: {
      title: data.seo.title ?? data.name,
      description: data.seo.description ?? data.summary ?? undefined,
      images: data.seo.ogImage ?? data.images[0]?.url,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<Params> }) {
  const { locale, category, sub, slug } = await params;
  if (!isLocale(locale)) notFound();

  // 三段歸屬由後端驗證，不符即 404 —— 前端不自己比對（同子分類頁的做法）
  const p = await api.product(locale, category, sub, slug);
  if (!p) notFound();

  const c = COPY[locale];

  // 區段序號是連續的，但區段本身會因為內容缺漏而不渲染 ——
  // 所以序號要在渲染時才發，不能寫死。
  let n = 0;
  const next = () => ++n;

  return (
    <>
      <Breadcrumb locale={locale} product={p} productsLabel={c.products} />

      {/* 01 圖庫 + 摘要 */}
      <section className="mx-auto max-w-content px-6 pb-14 pt-2 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-2">
          <ProductGallery images={p.images} productName={p.name} locale={locale} />

          <div>
            {p.collection && <CollectionBadge collection={p.collection} />}
            <h1 className="mb-1 mt-3.5 text-[clamp(2rem,3.6vw,2.7rem)] font-normal">
              {p.name}
            </h1>
            {p.sku && <p className="font-medium text-grey">{p.sku}</p>}
            {p.summary && <p className="my-5 text-[1.08rem]">{p.summary}</p>}

            <Chips product={p} />

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#inquiry"
                className="rounded-full bg-brand px-8 py-3.5 font-semibold text-white shadow-[0_10px_30px_rgba(0,181,205,.32)] transition hover:bg-brand-deep hover:text-white"
              >
                {c.quote}
              </a>
              {(p.specs?.length || p.sizeChart) && (
                <a
                  href="#specs"
                  className="rounded-full border-[1.5px] border-[rgba(0,146,168,.4)] px-7 py-3 font-semibold text-brand-deep"
                >
                  {c.viewSpecs}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 02 特色 */}
      {p.features && p.features.length > 0 && (
        <section className="bg-tint py-14">
          <div className="mx-auto max-w-content px-6 lg:px-16">
            <SectionHeading index={next()} title={c.features} className="mb-9" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {p.features.map((f, i) => (
                <div key={f.title ?? i}>
                  <div className="mb-3.5 flex h-13 w-13 items-center justify-center rounded-[14px] bg-[#e9f8fa] p-3.5 text-brand-deep">
                    <FeatureIcon />
                  </div>
                  {f.title && <h3 className="text-[1.08rem] font-semibold">{f.title}</h3>}
                  {f.body && <p className="mt-1 text-sm">{f.body}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 03 適用時機 */}
      {p.useCases && p.useCases.length > 0 && (
        <section className="mx-auto max-w-content px-6 py-14 lg:px-16">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            {p.useCaseImage ? (
              <img
                src={p.useCaseImage.url}
                srcSet={srcSetOf(p.useCaseImage)}
                sizes="(max-width: 1024px) 100vw, 560px"
                alt={p.useCaseImage.alt ?? p.name}
                loading="lazy"
                decoding="async"
                width={1200}
                height={900}
                className="aspect-[4/3] w-full rounded-[22px] object-cover"
              />
            ) : (
              <div className="aspect-[4/3] rounded-[22px] bg-tint-deep" />
            )}

            <div>
              <SectionHeading index={next()} title={c.useCases} className="mb-4" />
              {p.useCases.map((u, i) => (
                <div
                  key={u.title ?? i}
                  className="flex gap-3.5 border-b border-hairline py-3.5 last:border-0"
                >
                  <span className="font-bold text-brand-deep">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    {u.title && <h3 className="text-[1.05rem] font-semibold">{u.title}</h3>}
                    {u.body && <p className="text-[0.92rem]">{u.body}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 04 規格與尺寸 */}
      {(p.specs?.length || p.sizeChart) && (
        <section id="specs" className="bg-tint py-14">
          <div className="mx-auto max-w-content px-6 lg:px-16">
            <SectionHeading index={next()} title={c.specsAndSizes} accent className="mb-9" />
            <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
              {p.specs && p.specs.length > 0 && (
                <div>
                  <SubHeading>{c.specs}</SubHeading>
                  {p.specs.map((s, i) => (
                    <div
                      key={s.label ?? i}
                      className="flex justify-between gap-4 border-b border-hairline py-3"
                    >
                      <span>{s.label}</span>
                      <span className="font-medium text-ink">{s.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {p.sizeChart && (
                <div>
                  <SubHeading>{c.sizeChart(p.sizeChart.measureLabel)}</SubHeading>
                  <SizeChart chart={p.sizeChart} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 05 認證 + 06 下載 */}
      {(p.certifications.length > 0 || p.downloads.length > 0) && (
        <section className="mx-auto max-w-content px-6 py-14 lg:px-16">
          <div className="grid gap-14 lg:grid-cols-2">
            {p.certifications.length > 0 && (
              <div>
                <SectionHeading index={next()} title={c.certifications} className="mb-5" />
                <div className="flex flex-wrap gap-3.5">
                  {p.certifications.map((cert) => (
                    <div
                      key={cert.slug}
                      title={cert.subLabel ?? undefined}
                      className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-hairline p-2 text-center text-[0.85rem] font-semibold text-ink"
                    >
                      {cert.logo ? (
                        <img
                          src={cert.logo.url}
                          alt={cert.logo.alt ?? cert.mark}
                          loading="lazy"
                          decoding="async"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        cert.mark
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {p.downloads.length > 0 && (
              <div>
                <SectionHeading index={next()} title={c.downloads} className="mb-5" />
                {p.downloads.map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    // 檔案在 Blob 上、跨網域，download 屬性對跨來源無效 ——
                    // 用 target 讓瀏覽器自己決定開啟或下載
                    target="_blank"
                    rel="noopener"
                    className="mb-3 flex items-center justify-between gap-4 rounded-[14px] border border-hairline px-4.5 py-4 transition hover:border-brand-bright"
                  >
                    <span>
                      <span className="block font-medium text-ink">{d.title}</span>
                      <span className="text-[0.8rem] text-grey">
                        {c.fileMeta(d)}
                      </span>
                    </span>
                    <span className="font-semibold text-brand-deep">↓</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 07 相關產品 */}
      {p.relatedProducts.length > 0 && (
        <section className="bg-tint py-14">
          <div className="mx-auto max-w-content px-6 lg:px-16">
            <SectionHeading index={next()} title={c.related} className="mb-8" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {p.relatedProducts.map((r) => (
                <ProductCard
                  key={r.slug}
                  item={{
                    slug: r.slug,
                    name: r.name,
                    sku: null,
                    category: null,
                    subCategory: null,
                    collection: null,
                    bodyParts: [],
                    image: r.image,
                    featuredBlurb: null,
                    url: r.url,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 08 詢價表單 —— 待 Phase 7 的 POST /contact，見頁面說明 */}
    </>
  );
}

// ── 區塊 ────────────────────────────────────────────────────────────────────

function Breadcrumb({
  locale,
  product,
  productsLabel,
}: {
  locale: Locale;
  product: ProductDetail;
  productsLabel: string;
}) {
  const crumbs = [
    { href: `/${locale}/products`, label: productsLabel },
    product.category && {
      href: `/${locale}/products/${product.category.slug}`,
      label: product.category.name,
    },
    product.subCategory &&
      product.category && {
        href: `/${locale}/products/${product.category.slug}/${product.subCategory.slug}`,
        label: product.subCategory.name,
      },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <nav className="mx-auto max-w-content px-6 py-4 text-[0.85rem] font-medium text-[#66787f] lg:px-16">
      {crumbs.map((crumb) => (
        <span key={crumb.href}>
          <Link href={crumb.href}>{crumb.label}</Link>
          <span className="mx-2 text-[#b7c4c8]">/</span>
        </span>
      ))}
      <span className="text-ink">{product.name}</span>
    </nav>
  );
}

/** 部位 + 症狀合成一排 chips（mockup4 的 §01 就是混在一起的） */
function Chips({ product }: { product: ProductDetail }) {
  const chips = [...product.bodyParts, ...(product.conditions ?? [])].filter(
    (x): x is string => typeof x === 'string' && x.length > 0,
  );

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2.5">
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-full border border-hairline bg-tint-deep px-3.5 py-1.5 text-[0.82rem] font-medium"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3.5 text-base font-semibold uppercase tracking-[0.06em] text-brand-deep">
      {children}
    </h3>
  );
}

function FeatureIcon() {
  // mockup4 每張卡各有一個 SVG，但 features 是後台自由填的 JSON，
  // `icon` 目前沒有對應的圖示庫。先用統一的佔位圖示，
  // 等 icon 字彙定案（docs/09）再做對照表。
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
