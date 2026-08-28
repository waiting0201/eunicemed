import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type Download, type ProductDetail } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { CollectionBadge } from '@/components/CollectionBadge';
import { ProductCard } from '@/components/ProductCard';
import { ProductInquiry } from '@/components/ProductInquiry';
import { ProductGallery } from '@/components/ProductGallery';
import { css } from '@/lib/css';
import { NUMERAL, SectionHeading } from '@/components/SectionHeading';
import { SizeChart } from '@/components/SizeChart';

/** 樣式逐字取自 `mockup4/Product Detail.dc.html`。 */
const S = {
  breadcrumb: css`max-width:1180px;margin:0 auto;padding:18px clamp(24px,5vw,64px);font-size:.85rem;color:#66787F;font-weight:500;`,
  sep: css`margin:0 8px;color:#B7C4C8;`,

  // 1 GALLERY + SUMMARY
  top: css`max-width:1180px;margin:0 auto;padding:8px clamp(24px,5vw,64px) clamp(56px,7vw,80px);`,
  topGrid: css`display:grid;grid-template-columns:1fr 1fr;gap:48px;`,
  title: css`color:#16333B;font-weight:400;font-size:clamp(2rem,3.6vw,2.7rem);margin:14px 0 4px;`,
  sku: css`color:#66787F;font-weight:500;`,
  summary: css`font-size:1.08rem;margin:18px 0 24px;`,
  chips: css`display:flex;gap:10px;flex-wrap:wrap;margin-bottom:28px;`,
  chip: css`background:#F0F6F8;border:1px solid #DFE9EC;border-radius:999px;font-size:.82rem;font-weight:500;padding:6px 14px;`,
  buy: css`display:inline-block;background:#00B5CD;color:#fff;font-weight:620;padding:14px 32px;border-radius:999px;box-shadow:0 10px 30px rgba(0,181,205,.32);`,
  ask: css`display:inline-block;margin-left:12px;border:1.5px solid rgba(0,146,168,.4);color:#0092A8;font-weight:620;padding:13px 30px;border-radius:999px;`,

  // 2 FEATURES
  tinted: css`background:#F5FAFB;padding:clamp(56px,7vw,80px) 0;`,
  tintedInner: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);`,
  plain: css`max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,80px) clamp(24px,5vw,64px);`,
  h2: css`color:#16333B;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.3rem);margin:8px 0 36px;`,
  h2Tight: css`color:#16333B;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.3rem);margin:8px 0 20px;`,
  h2Specs: css`color:#16333B;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.3rem);margin:8px 0 32px;`,
  cards4: css`display:grid;grid-template-columns:repeat(4,1fr);gap:24px;`,
  featureIcon: css`width:52px;height:52px;border-radius:14px;background:#E9F8FA;display:flex;align-items:center;justify-content:center;color:#0092A8;margin-bottom:14px;`,
  featureTitle: css`color:#16333B;font-weight:570;font-size:1.08rem;`,
  featureBody: css`font-size:.92rem;`,

  // 3 USE CASES
  useGrid: css`display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;`,
  useRow: css`display:flex;gap:14px;padding:14px 0;border-bottom:1px solid #DFE9EC;`,
  useRowLast: css`display:flex;gap:14px;padding:14px 0;`,
  useNo: css`color:#0092A8;font-weight:700;`,
  useTitle: css`color:#16333B;font-weight:570;font-size:1.05rem;`,
  useBody: css`font-size:.9rem;`,

  // 4 SPECS & SIZES
  specsBand: css`background:#F5FAFB;color:#44565D;padding:clamp(56px,7vw,80px) 0;`,
  specsGrid: css`display:grid;grid-template-columns:1fr 1.3fr;gap:48px;`,
  specsLabel: css`color:#0092A8;font-weight:570;font-size:1rem;letter-spacing:.06em;text-transform:uppercase;margin-bottom:14px;`,
  specRow: css`display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #DFE9EC;`,
  specKey: css`color:#44565D;`,
  specValue: css`color:#16333B;font-weight:500;`,
  sizeWrap: css`display:flex;align-items:center;gap:28px;flex-wrap:wrap;`,
  sizeTable: css`flex:1;min-width:280px;`,
  sizeGrid: css`display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:#EDF4F6;border:1px solid #DFE9EC;border-radius:14px;overflow:hidden;`,
  sizeHead: css`background:#F0F6F8;padding:14px;text-align:center;color:#0092A8;font-weight:620;`,
  sizeCell: css`background:#F0F6F8;padding:14px;text-align:center;color:#4B5B61;font-size:.9rem;`,
  sizeNote: css`color:#66787F;font-size:.82rem;margin-top:12px;`,
  diagram: css`flex:none;width:152px;`,
  diagramFrame: css`aspect-ratio:1/1;border-radius:22px;background:#E9F8FA;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;`,
  diagramImg: css`display:block;max-width:100%;max-height:100%;object-fit:contain;`,
  diagramCaption: css`color:#66787F;font-size:.78rem;text-align:center;margin-top:10px;`,

  // 5 CERTS + 6 DOWNLOADS
  certsGrid: css`display:grid;grid-template-columns:1fr 1fr;gap:56px;`,
  h3: css`color:#16333B;font-weight:400;font-size:clamp(1.6rem,3vw,2rem);margin:8px 0 22px;`,
  certs: css`display:flex;gap:14px;flex-wrap:wrap;`,
  cert: css`width:96px;height:96px;border:1px solid #DFE9EC;border-radius:16px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:620;color:#16333B;font-size:.85rem;`,
  download: css`display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border:1px solid #DFE9EC;border-radius:14px;margin-bottom:12px;`,
  downloadName: css`font-weight:500;color:#16333B;`,
  downloadCta: css`color:#0092A8;font-weight:620;`,

  // 7 RELATED
  relatedName: css`color:#16333B;font-weight:570;font-size:1.05rem;margin-top:3px;`,

  // 8 INQUIRY
  inquiry: css`background:linear-gradient(135deg,#00B5CD 0%,#009DB6 55%,#0092A8 100%);border-radius:26px;padding:clamp(36px,5vw,56px);color:#fff;`,
  inquiryGrid: css`display:grid;grid-template-columns:1fr 1.2fr;gap:48px;align-items:center;`,
  inquiryTitle: css`color:#fff;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.3rem);`,
  inquiryBody: css`color:rgba(255,255,255,.88);margin-top:14px;max-width:36ch;`,
} as const;

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
    measureDiagram: (measure?: string) => string;
    whereToMeasure: string;
    certifications: string;
    downloads: string;
    related: string;
    quote: string;
    viewSpecs: string;
    inquiryTitle: string;
    inquiryBody: string;
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
    measureDiagram: (m) => (m ? `Where to measure: ${m}` : 'Where to measure'),
    whereToMeasure: 'Where to measure',
    certifications: 'Certifications',
    downloads: 'Downloads',
    related: 'Related products',
    quote: 'Request a quote',
    viewSpecs: 'View specifications',
    inquiryTitle: 'Interested in this product?',
    inquiryBody:
      'Send us an inquiry and our team will reply with pricing, availability and fitting guidance.',
    fileMeta: (d) => `${d.fileLocale} · ${d.fileExt} · ${formatSize(d.sizeBytes)}`,
  },
  'zh-TW': {
    products: '產品',
    features: '產品特色',
    useCases: '適用時機',
    specsAndSizes: '規格與尺寸',
    specs: '規格',
    sizeChart: (m) => (m ? `尺寸對照（${m}）` : '尺寸對照'),
    measureDiagram: (m) => (m ? `量測部位：${m}` : '量測部位'),
    whereToMeasure: '量測部位',
    certifications: '認證',
    downloads: '相關下載',
    related: '相關產品',
    quote: '索取報價',
    viewSpecs: '查看規格',
    inquiryTitle: '對這項產品有興趣嗎？',
    inquiryBody: '留下訊息，我們會回覆價格、供貨狀況與穿戴建議。',
    fileMeta: (d) => `${d.fileLocale} · ${d.fileExt} · ${formatSize(d.sizeBytes)}`,
  },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
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
      <section style={S.top}>
        <div style={S.topGrid} data-r="stack">
          <ProductGallery images={p.images} productName={p.name} locale={locale} />

          <div>
            {p.collection && <CollectionBadge collection={p.collection} />}
            <h1 style={S.title}>{p.name}</h1>
            {p.sku && <p style={S.sku}>{p.sku}</p>}
            {p.summary && <p style={S.summary}>{p.summary}</p>}

            <Chips product={p} />

            <div>
              <a href="#inquiry" style={S.buy} className="hover:text-white">
                {c.quote}
              </a>
              {(p.specs?.length || p.sizeChart) && (
                <a href="#specs" style={S.ask}>
                  {c.viewSpecs}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 02 特色 */}
      {p.features && p.features.length > 0 && (
        <section style={S.tinted}>
          <div style={S.tintedInner}>
            <SectionHeading index={next()} title={c.features} titleStyle={S.h2} />
            <div style={S.cards4} data-r="cols-2">
              {p.features.map((f, i) => (
                <div key={f.title ?? i}>
                  <div style={S.featureIcon}>
                    <FeatureIcon />
                  </div>
                  {f.title && <h3 style={S.featureTitle}>{f.title}</h3>}
                  {f.body && <p style={S.featureBody}>{f.body}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 03 適用時機 */}
      {p.useCases && p.useCases.length > 0 && (
        <section style={S.plain}>
          <div style={S.useGrid} data-r="stack">
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
                style={{ ...S.diagramFrame, ...S.diagramImg }}
              />
            ) : (
              <div style={S.diagramFrame} />
            )}

            <div>
              <SectionHeading index={next()} title={c.useCases} titleStyle={S.h2Tight} />
              {p.useCases.map((u, i) => (
                <div
                  key={u.title ?? i}
                  style={i === (p.useCases?.length ?? 0) - 1 ? S.useRowLast : S.useRow}
                >
                  <span style={S.useNo}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    {u.title && <h3 style={S.useTitle}>{u.title}</h3>}
                    {u.body && <p style={S.useBody}>{u.body}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 04 規格與尺寸 */}
      {(p.specs?.length || p.sizeChart) && (
        <section id="specs" style={S.specsBand}>
          <div style={S.tintedInner}>
            <SectionHeading
              index={next()}
              title={c.specsAndSizes}
              numeralStyle={NUMERAL.accent}
              titleStyle={S.h2Specs}
            />
            <div style={S.specsGrid} data-r="stack">
              {p.specs && p.specs.length > 0 && (
                <div>
                  <SubHeading>{c.specs}</SubHeading>
                  {p.specs.map((s, i) => (
                    <div key={s.label ?? i} style={S.specRow}>
                      <span style={S.specKey}>{s.label}</span>
                      <span style={S.specValue}>{s.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {p.sizeChart && (
                <div>
                  <SubHeading>{c.sizeChart(p.sizeChart.measureLabel)}</SubHeading>
                  <div style={p.sizeChartDiagram ? S.sizeWrap : undefined} data-r="stack">
                    <div style={S.sizeTable}>
                      <SizeChart chart={p.sizeChart} />
                    </div>

                    {/* 量測部位線稿：後台逐產品上傳（400×400 透明底 PNG/SVG），沒掛圖就整欄不出現
                        （表格自動吃滿寬度，不留破圖佔位框）。housing 沿用 Features icon 同一套
                        teal-tint 底（bg-[#E9F8FA]），讓線稿讀作「品牌插圖」而不是載入失敗；
                        圖本身無文字、跨語系共用，下方的「測量位置」短標籤才是可翻譯的說明文字。 */}
                    {p.sizeChartDiagram && (
                      <div style={S.diagram}>
                        <div style={S.diagramFrame}>
                          <img
                            src={p.sizeChartDiagram.url}
                            srcSet={srcSetOf(p.sizeChartDiagram)}
                            sizes="152px"
                            alt={
                              p.sizeChartDiagram.alt ?? c.measureDiagram(p.sizeChart.measureLabel)
                            }
                            loading="lazy"
                            decoding="async"
                            width={400}
                            height={400}
                            style={S.diagramImg}
                          />
                        </div>
                        <p style={S.diagramCaption}>{c.whereToMeasure}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 05 認證 + 06 下載 */}
      {(p.certifications.length > 0 || p.downloads.length > 0) && (
        <section style={S.plain}>
          <div style={S.certsGrid} data-r="stack">
            {p.certifications.length > 0 && (
              <div>
                <SectionHeading index={next()} title={c.certifications} titleStyle={S.h3} />
                <div style={S.certs}>
                  {p.certifications.map((cert) => (
                    <div key={cert.slug} title={cert.subLabel ?? undefined} style={S.cert}>
                      {cert.logo ? (
                        <img
                          src={cert.logo.url}
                          alt={cert.logo.alt ?? cert.mark}
                          loading="lazy"
                          decoding="async"
                          style={S.diagramImg}
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
                <SectionHeading index={next()} title={c.downloads} titleStyle={S.h3} />
                {p.downloads.map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    // 檔案在 Blob 上、跨網域，download 屬性對跨來源無效 ——
                    // 用 target 讓瀏覽器自己決定開啟或下載
                    target="_blank"
                    rel="noopener"
                    style={S.download}
                    data-hover="edge"
                  >
                    <span>
                      <span style={S.downloadName}>{d.title}</span>
                      <span style={S.sizeNote}>{c.fileMeta(d)}</span>
                    </span>
                    <span style={S.downloadCta}>↓</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 07 相關產品 */}
      {p.relatedProducts.length > 0 && (
        <section style={S.tinted}>
          <div style={S.tintedInner}>
            <SectionHeading index={next()} title={c.related} titleStyle={S.h2Specs} />
            <div style={S.cards4} data-r="cols-2">
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

      {/* 08 詢價 —— 送件走 `POST /contact`（type=product，帶型號快照）。
       **該端點尚未實作**（擋於 SMTP 帳密），上線前送出會顯示失敗訊息。 */}
      <ProductInquiry
        locale={locale}
        title={c.inquiryTitle}
        body={c.inquiryBody}
        productName={p.name}
        productSku={p.sku}
      />
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
    <nav style={S.breadcrumb}>
      {crumbs.map((crumb) => (
        <span key={crumb.href}>
          <Link href={crumb.href}>{crumb.label}</Link>
          <span style={S.sep}>/</span>
        </span>
      ))}
      {/* mockup4 的最後一節沒有自己的樣式，直接繼承容器的 #66787F */}
      <span>{product.name}</span>
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
    <div style={S.chips}>
      {chips.map((chip) => (
        <span key={chip} style={S.chip}>
          {chip}
        </span>
      ))}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 style={S.specsLabel}>{children}</h3>;
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
