import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type ApplicationDetail } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { ProductCard } from '@/components/ProductCard';
import { SectionHeading } from '@/components/SectionHeading';

type Params = { locale: string; slug: string };

const COPY: Record<
  Locale,
  {
    applications: string;
    byBodyPart: string;
    specialCare: string;
    concerns: string;
    supportLevels: string;
    recommended: (name: string) => string;
    allProducts: (n: number, name: string) => string;
    howTo: string;
    related: string;
    seeSolutions: string;
    ask: string;
    moreFaq: string;
    bestFor: string;
    view: (name: string) => string;
  }
> = {
  en: {
    applications: 'Applications',
    byBodyPart: 'By body part',
    specialCare: 'By special needs care',
    concerns: 'Common concerns we hear',
    supportLevels: 'Match the support level',
    recommended: (name) => `Recommended for ${name}`,
    allProducts: (n, name) => `All ${n} ${name} products →`,
    howTo: 'How to choose & wear',
    related: 'Related applications',
    seeSolutions: 'See solutions',
    ask: 'Ask a specialist',
    moreFaq: 'More sizing & care questions →',
    bestFor: 'Best for',
    view: (name) => `View ${name} products →`,
  },
  'zh-TW': {
    applications: '應用方案',
    byBodyPart: '依部位',
    specialCare: '特殊照護需求',
    concerns: '常見困擾',
    supportLevels: '選擇合適的支撐強度',
    recommended: (name) => `${name}推薦產品`,
    allProducts: (n, name) => `查看全部 ${n} 項${name}產品 →`,
    howTo: '如何選擇與穿戴',
    related: '相關應用方案',
    seeSolutions: '查看解決方案',
    ask: '諮詢專業建議',
    moreFaq: '更多尺寸與保養問題 →',
    bestFor: '適合',
    view: (name) => `查看 ${name} 系列產品 →`,
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const data = await api.application(locale, slug);
  if (!data) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';
  const path = `/applications/${slug}`;

  return {
    title: data.seo.title ?? data.name,
    description: data.seo.description ?? data.lead ?? undefined,
    alternates: {
      canonical: `${siteUrl}/${locale}${path}`,
      languages: { en: `${siteUrl}/en${path}`, 'zh-TW': `${siteUrl}/zh-TW${path}` },
    },
  };
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const a = await api.application(locale, slug);
  if (!a) notFound();

  const c = COPY[locale];
  const kind = a.type === 'special-care' ? c.specialCare : c.byBodyPart;

  let n = 0;
  const next = () => ++n;

  return (
    <>
      <nav className="mx-auto max-w-[--container-content] px-6 py-4 text-[0.85rem] font-medium text-[#66787f] lg:px-16">
        <Link href={`/${locale}/applications`}>{c.applications}</Link>
        <span className="mx-2 text-[#b7c4c8]">/</span>
        <span className="text-[--color-ink]">{a.name}</span>
      </nav>

      {/* 01 導言 */}
      <section className="mx-auto max-w-[--container-content] px-6 pb-14 lg:px-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-[--color-brand-deep]">
              {kind}
            </p>
            <h1 className="mt-2.5 text-[clamp(2rem,3.6vw,2.8rem)] font-normal">{a.name}</h1>
            {a.lead && <p className="mt-3.5 text-[1.1rem]">{a.lead}</p>}

            {a.stats && a.stats.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {a.stats.map((s, i) => (
                  <span
                    key={s.label ?? i}
                    className="rounded-full border border-[--color-hairline] bg-[--color-tint-deep] px-4 py-2 text-[0.9rem]"
                  >
                    <b className="text-[--color-ink]">{s.value}</b> {s.label}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              {a.recommendedProducts.length > 0 && (
                <a
                  href="#products"
                  className="rounded-full bg-[--color-brand] px-7 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(0,181,205,.32)] transition hover:bg-[--color-brand-deep] hover:text-white"
                >
                  {c.seeSolutions}
                </a>
              )}
              <Link
                href={`/${locale}/contact`}
                className="rounded-full border-[1.5px] border-[rgba(0,146,168,.4)] px-6 py-[11px] font-semibold text-[--color-brand-deep]"
              >
                {c.ask}
              </Link>
            </div>
          </div>

          {a.heroImage ? (
            <img
              src={a.heroImage.url}
              srcSet={srcSetOf(a.heroImage)}
              sizes="(max-width: 1024px) 100vw, 480px"
              alt={a.heroImage.alt ?? a.name}
              width={1000}
              height={1250}
              decoding="async"
              className="aspect-[4/5] w-full rounded-[22px] object-cover"
            />
          ) : (
            <div className="aspect-[4/5] rounded-[22px] bg-[--color-tint-deep]" />
          )}
        </div>

        {a.body && (
          <div
            className="mt-10 max-w-[68ch] [&_a]:text-[--color-brand-deep] [&_li]:mt-1 [&_p]:mt-4 [&_ul]:list-disc [&_ul]:pl-5"
            // API 已在寫入時以白名單淨化（Services/HtmlSanitizers.cs）。
            // 前端不再淨化一次 —— 兩套規則會互相漂移，安全邊界只留伺服器端一道。
            dangerouslySetInnerHTML={{ __html: a.body }}
          />
        )}
      </section>

      {/* 02 常見困擾 */}
      {a.concerns && a.concerns.length > 0 && (
        <section className="bg-[--color-tint] py-14">
          <div className="mx-auto max-w-[--container-content] px-6 lg:px-16">
            <SectionHeading index={next()} title={c.concerns} className="mb-8" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {a.concerns.map((x, i) => (
                <div
                  key={x.title ?? i}
                  className="rounded-[16px] border border-[--color-hairline] bg-white p-5"
                >
                  {x.title && <h3 className="text-[1.05rem] font-semibold">{x.title}</h3>}
                  {x.body && <p className="mt-1.5 text-[0.9rem]">{x.body}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 03 支撐強度 */}
      {a.supportLevels && a.supportLevels.length > 0 && (
        <section className="mx-auto max-w-[--container-content] px-6 py-14 lg:px-16">
          <SectionHeading index={next()} title={c.supportLevels} className="mb-8" />
          <div className="grid gap-6 lg:grid-cols-3">
            {a.supportLevels.map((lv, i) => (
              <div
                key={lv.collection?.slug ?? i}
                className="rounded-[18px] border border-[--color-hairline] p-6"
              >
                {lv.collection && (
                  <h3
                    className="text-[1.2rem] font-semibold"
                    style={{ color: COLLECTION_TONE[lv.collection.slug] ?? 'var(--color-brand-deep)' }}
                  >
                    {lv.collection.name}
                  </h3>
                )}
                {lv.body && <p className="mt-2">{lv.body}</p>}
                {lv.bestFor && (
                  <p className="mt-3 text-[0.9rem] text-[--color-grey]">
                    {c.bestFor}：{lv.bestFor}
                  </p>
                )}
                {lv.linkUrl && lv.collection && (
                  <Link
                    href={lv.linkUrl}
                    className="mt-4 inline-block font-semibold text-[--color-brand-deep]"
                  >
                    {c.view(lv.collection.name)}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 04 推薦產品 */}
      {a.recommendedProducts.length > 0 && (
        <section id="products" className="bg-[--color-tint] py-14">
          <div className="mx-auto max-w-[--container-content] px-6 lg:px-16">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <SectionHeading index={next()} title={c.recommended(a.name)} />
              {a.type !== 'special-care' && (
                <Link
                  href={`/${locale}/products?bodyPart=${a.slug}`}
                  className="font-semibold text-[--color-brand-deep]"
                >
                  {c.allProducts(productTotal(a), a.name)}
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {a.recommendedProducts.map((p) => (
                <ProductCard key={p.slug} item={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 05 如何選擇 */}
      {a.howTo && a.howTo.length > 0 && (
        <section className="mx-auto max-w-[--container-content] px-6 py-14 lg:px-16">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <SectionHeading index={next()} title={c.howTo} className="mb-4" />
              {a.howTo.map((h, i) => (
                <div
                  key={h.title ?? i}
                  className="flex gap-3.5 border-b border-[--color-hairline] py-3.5 last:border-0"
                >
                  <span className="font-bold text-[--color-brand-deep]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    {h.title && <h3 className="text-[1.05rem] font-semibold">{h.title}</h3>}
                    {h.body && <p className="text-[0.92rem]">{h.body}</p>}
                  </div>
                </div>
              ))}
              <Link
                href={`/${locale}/faq`}
                className="mt-5 inline-block font-semibold text-[--color-brand-deep]"
              >
                {c.moreFaq}
              </Link>
            </div>

            {a.fittingImage ? (
              <img
                src={a.fittingImage.url}
                srcSet={srcSetOf(a.fittingImage)}
                sizes="(max-width: 1024px) 100vw, 560px"
                alt={a.fittingImage.alt ?? a.name}
                loading="lazy"
                decoding="async"
                width={1200}
                height={750}
                className="aspect-[16/10] w-full rounded-[22px] object-cover"
              />
            ) : (
              <div className="aspect-[16/10] rounded-[22px] bg-[--color-tint-deep]" />
            )}
          </div>
        </section>
      )}

      {/* 醫療免責。**刻意放在區段之外**：它一開始寫在「如何選擇」裡，
          結果該區沒內容時整段免責跟著消失 —— 中文頁就完全看不到。
          這是法務要求的固定文字，未填時用模板預設（docs/09 §應用方案）。 */}
      <section className="mx-auto max-w-[--container-content] px-6 pb-4 lg:px-16">
        <p className="text-[0.85rem] text-[--color-grey]">
          {a.disclaimer ?? DEFAULT_DISCLAIMER[locale]}
        </p>
      </section>

      {/* 06 相關應用方案 */}
      {a.related.length > 0 && (
        <section className="bg-[--color-tint] py-14">
          <div className="mx-auto max-w-[--container-content] px-6 lg:px-16">
            <SectionHeading index={next()} title={c.related} className="mb-8" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {a.related.map((r) => (
                <Link
                  key={r.slug}
                  href={r.url}
                  className="rounded-[14px] border border-[--color-hairline] bg-white p-5 transition hover:border-[--color-brand-bright]"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[1.05rem] font-semibold text-[--color-ink]">
                      {r.name}
                    </span>
                    <small className="text-[0.8rem] font-bold text-[--color-brand-deep]">
                      {r.productCount}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/** 系列專色（docs/08 §2）。與 CollectionBadge 同一組，但這裡吃的是文字色。 */
const COLLECTION_TONE: Record<string, string> = {
  care: 'var(--color-care)',
  protect: 'var(--color-protect)',
  advance: 'var(--color-advance)',
};

const DEFAULT_DISCLAIMER: Record<Locale, string> = {
  en: 'This page is general product information, not medical advice. For persistent pain, injury or post-operative care, consult a qualified healthcare professional.',
  'zh-TW':
    '本頁為一般產品資訊，非醫療建議。持續疼痛、受傷或術後照護請諮詢合格醫療專業人員。',
};

/**
 * 「全部 N 項產品」的 N。
 * `stats` 的第一項在 seed 與後台慣例上就是產品數（`value` 可填 "auto" 由 API 代入），
 * 取不到就退回推薦產品數 —— 寧可少算也不要顯示 NaN。
 */
function productTotal(a: ApplicationDetail): number {
  const fromStats = Number(a.stats?.[0]?.value);
  return Number.isFinite(fromStats) ? fromStats : a.recommendedProducts.length;
}
