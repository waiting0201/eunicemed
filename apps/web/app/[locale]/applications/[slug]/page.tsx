import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type ApplicationDetail } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { ProductCard } from '@/components/ProductCard';
import { css } from '@/lib/css';
import { collectionColor, collectionRule } from '@/lib/collection';
import { NUMERAL, SectionHeading } from '@/components/SectionHeading';

/** 樣式逐字取自 `mockup4/Application Detail.dc.html`。 */
const S = {
  breadcrumb: css`max-width:1180px;margin:0 auto;padding:18px clamp(24px,5vw,64px);font-size:.85rem;color:#66787F;font-weight:500;`,
  sep: css`margin:0 8px;color:#B7C4C8;`,

  intro: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px) clamp(48px,6vw,72px);`,
  introGrid: css`display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(32px,4vw,56px);align-items:center;`,
  eyebrow: css`color:#0092A8;font-weight:680;letter-spacing:.16em;text-transform:uppercase;font-size:.78rem;`,
  title: css`font-weight:400;font-size:clamp(2rem,3.6vw,2.8rem);letter-spacing:-.02em;margin:10px 0 0;`,
  lead: css`margin-top:14px;font-size:1.1rem;`,
  stats: css`display:flex;flex-wrap:wrap;gap:10px;margin-top:22px;`,
  stat: css`display:inline-flex;align-items:center;gap:8px;background:#F5FAFB;border:1px solid #DFE9EC;border-radius:999px;padding:7px 16px;font-size:.85rem;font-weight:500;`,
  statValue: css`color:#16333B;`,
  actions: css`display:flex;gap:14px;flex-wrap:wrap;margin-top:26px;`,
  primary: css`background:#00B5CD;color:#fff;font-weight:620;padding:12px 28px;border-radius:999px;box-shadow:0 8px 22px rgba(0,150,170,.28);`,
  secondary: css`border:1px solid #DFE9EC;background:#FFFFFF;font-weight:620;padding:12px 28px;border-radius:999px;`,
  portrait: css`position:relative;aspect-ratio:4/5;border-radius:22px;overflow:hidden;background:#F0F6F8;`,
  portraitImg: css`display:block;width:100%;height:100%;object-fit:cover;`,

  tinted: css`background:#F5FAFB;padding:clamp(56px,7vw,80px) 0;`,
  tintedInner: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);`,
  plain: css`max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,80px) clamp(24px,5vw,64px);`,
  h2: css`font-weight:400;font-size:clamp(1.8rem,3.4vw,2.3rem);margin:8px 0 32px;`,
  h2Tight: css`font-weight:400;font-size:clamp(1.8rem,3.4vw,2.3rem);margin:8px 0 24px;`,

  cards4: css`display:grid;grid-template-columns:repeat(4,1fr);gap:24px;`,
  cards3: css`display:grid;grid-template-columns:repeat(3,1fr);gap:24px;`,
  concern: css`background:#FFFFFF;border:1px solid #DFE9EC;border-radius:20px;padding:26px 24px;`,
  concernTitle: css`font-weight:570;font-size:1.08rem;`,
  concernBody: css`font-size:.9rem;margin-top:6px;`,
  level: css`border:1px solid #DFE9EC;border-radius:20px;background:#FFFFFF;padding:30px 28px;`,
  levelTitle: css`font-weight:620;font-size:1.2rem;`,
  levelBody: css`font-size:.94rem;margin-top:8px;`,
  levelNote: css`font-size:.86rem;color:#66787F;margin-top:14px;`,
  levelLink: css`display:inline-block;margin-top:16px;color:#0092A8;font-weight:620;font-size:.92rem;`,

  head: css`display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:16px;margin-bottom:32px;`,
  headTitle: css`font-weight:400;font-size:clamp(1.6rem,3vw,2.1rem);`,
  headLink: css`color:#0092A8;font-weight:620;`,

  howGrid: css`display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,4vw,64px);align-items:start;`,
  step: css`display:flex;gap:18px;padding:20px 0;border-top:1px solid #DFE9EC;`,
  stepLast: css`display:flex;gap:18px;padding:20px 0;border-top:1px solid #DFE9EC;border-bottom:1px solid #DFE9EC;`,
  stepNo: css`color:#0092A8;font-weight:700;font-size:.9rem;min-width:28px;`,
  stepTitle: css`font-weight:570;font-size:1.05rem;`,
  stepBody: css`font-size:.92rem;margin-top:4px;`,
  howLink: css`display:inline-block;margin-top:22px;color:#0092A8;font-weight:620;`,
  fitting: css`position:relative;aspect-ratio:16/10;border-radius:22px;overflow:hidden;background:#F0F6F8;`,
  fittingImg: css`display:block;width:100%;height:100%;object-fit:cover;`,
  disclaimer: css`margin-top:28px;font-size:.85rem;color:#66787F;background:#F5FAFB;border:1px solid #DFE9EC;border-radius:16px;padding:18px 22px;`,

  relatedTitle: css`font-weight:400;font-size:clamp(1.6rem,3vw,2.1rem);margin-bottom:28px;`,
  relatedCard: css`display:block;background:#FFFFFF;border:1px solid #DFE9EC;border-radius:20px;padding:24px 22px;`,
  relatedName: css`display:flex;justify-content:space-between;align-items:baseline;font-weight:570;font-size:1.08rem;`,
  relatedCount: css`color:#0092A8;font-weight:700;font-size:.8rem;`,
  relatedBody: css`font-size:.88rem;margin-top:4px;`,

  cta: css`max-width:1180px;margin:0 auto;padding:clamp(48px,6vw,72px) clamp(24px,5vw,64px);display:flex;flex-wrap:wrap;gap:28px;justify-content:space-between;align-items:center;`,
  ctaCopy: css`max-width:600px;`,
  ctaBody: css`margin-top:10px;`,
} as const;

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
    ctaTitle: string;
    ctaBody: string;
    ctaPrimary: string;
    ctaSecondary: string;
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
    related: 'Other applications',
    ctaTitle: 'Ready to find it in store?',
    ctaBody:
      'Find an authorised distributor near you, or send us the details and our team will recommend a fit.',
    ctaPrimary: 'Where to buy',
    ctaSecondary: 'Contact us',
    seeSolutions: 'See solutions',
    ask: 'Ask a specialist',
    moreFaq: 'More sizing & care questions →',
    bestFor: 'Best for: ',
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
    related: '其他應用方案',
    ctaTitle: '準備好到門市選購了嗎？',
    ctaBody: '找到離您最近的授權經銷據點，或把需求告訴我們，由團隊為您推薦合適的款式。',
    ctaPrimary: '銷售據點',
    ctaSecondary: '聯絡我們',
    seeSolutions: '查看解決方案',
    ask: '諮詢專業建議',
    moreFaq: '更多尺寸與保養問題 →',
    bestFor: '適合：',
    view: (name) => `查看 ${name} 系列產品 →`,
  },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
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

export default async function ApplicationDetailPage({ params }: { params: Promise<Params> }) {
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
      <nav style={S.breadcrumb}>
        <Link href={`/${locale}/applications`}>{c.applications}</Link>
        <span style={S.sep}>/</span>
        {/* mockup4 的最後一節沒有自己的樣式，直接繼承容器的 #66787F */}
        <span>{a.name}</span>
      </nav>

      {/* 01 導言 */}
      <section style={S.intro}>
        <div style={S.introGrid}>
          <div>
            <p style={S.eyebrow}>{kind}</p>
            <h1 style={S.title}>{a.name}</h1>
            {a.lead && <p style={S.lead}>{a.lead}</p>}

            {a.stats && a.stats.length > 0 && (
              <div style={S.stats}>
                {a.stats.map((s, i) => (
                  <span key={s.label ?? i} style={S.stat}>
                    <b style={S.statValue}>{s.value}</b> {s.label}
                  </span>
                ))}
              </div>
            )}

            <div style={S.actions}>
              {a.recommendedProducts.length > 0 && (
                <a
                  href="#products"
                  style={S.primary}
                  className="hover:text-white"
                  data-hover="lift-2-white"
                >
                  {c.seeSolutions}
                </a>
              )}
              <Link href={`/${locale}/contact`} style={S.secondary}>
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
              style={{ ...S.portrait, ...S.portraitImg }}
            />
          ) : (
            <div style={S.portrait} />
          )}
        </div>

        {a.body && (
          <div
            className="m4-prose"
            // API 已在寫入時以白名單淨化（Services/HtmlSanitizers.cs）。
            // 前端不再淨化一次 —— 兩套規則會互相漂移，安全邊界只留伺服器端一道。
            dangerouslySetInnerHTML={{ __html: a.body }}
          />
        )}
      </section>

      {/* 02 常見困擾 */}
      {a.concerns && a.concerns.length > 0 && (
        <section style={S.tinted}>
          <div style={S.tintedInner}>
            <SectionHeading
              index={next()}
              title={c.concerns}
              numeralStyle={NUMERAL.muted}
              titleStyle={S.h2}
            />
            <div style={S.cards4} data-r="cols-2">
              {a.concerns.map((x, i) => (
                <div key={x.title ?? i} style={S.concern}>
                  {x.title && <h3 style={S.concernTitle}>{x.title}</h3>}
                  {x.body && <p style={S.concernBody}>{x.body}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 03 支撐強度 */}
      {a.supportLevels && a.supportLevels.length > 0 && (
        <section style={S.plain}>
          <SectionHeading
            index={next()}
            title={c.supportLevels}
            numeralStyle={NUMERAL.muted}
            titleStyle={S.h2}
          />
          <div style={S.cards3} data-r="cols-2">
            {a.supportLevels.map((lv, i) => (
              <div
                key={lv.collection?.slug ?? i}
                style={{ ...S.level, ...collectionRule(lv.collection?.slug) }}
              >
                {lv.collection && (
                  <h3 style={{ ...S.levelTitle, ...collectionColor(lv.collection.slug) }}>
                    {lv.collection.name}
                  </h3>
                )}
                {lv.body && <p style={S.levelBody}>{lv.body}</p>}
                {lv.bestFor && (
                  <p style={S.levelNote}>
                    {c.bestFor}
                    {lv.bestFor}
                  </p>
                )}
                {lv.linkUrl && lv.collection && (
                  <Link href={lv.linkUrl} style={S.levelLink}>
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
        <section id="products" style={S.tinted}>
          <div style={S.tintedInner}>
            <div style={S.head}>
              <SectionHeading index={next()} title={c.recommended(a.name)} />
              {a.type !== 'special-care' && (
                <Link href={`/${locale}/products?bodyPart=${a.slug}`} style={S.headLink}>
                  {c.allProducts(productTotal(a), a.name)}
                </Link>
              )}
            </div>
            <div style={S.cards4} data-r="cols-2">
              {a.recommendedProducts.map((p) => (
                <ProductCard key={p.slug} item={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 05 如何選擇 */}
      {a.howTo && a.howTo.length > 0 && (
        <section style={S.plain}>
          <div style={S.howGrid}>
            <div>
              <SectionHeading
                index={next()}
                title={c.howTo}
                numeralStyle={NUMERAL.muted}
                titleStyle={S.h2Tight}
              />
              {a.howTo.map((h, i) => (
                <div key={h.title ?? i} style={i === a.howTo!.length - 1 ? S.stepLast : S.step}>
                  <span style={S.stepNo}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    {h.title && <h3 style={S.stepTitle}>{h.title}</h3>}
                    {h.body && <p style={S.stepBody}>{h.body}</p>}
                  </div>
                </div>
              ))}
              <Link href={`/${locale}/faq`} style={S.howLink}>
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
                style={{ ...S.fitting, ...S.fittingImg }}
              />
            ) : (
              <div style={S.fitting} />
            )}
          </div>
        </section>
      )}

      {/* 醫療免責。**刻意放在區段之外**：它一開始寫在「如何選擇」裡，
          結果該區沒內容時整段免責跟著消失 —— 中文頁就完全看不到。
          這是法務要求的固定文字，未填時用模板預設（docs/09 §應用方案）。 */}
      <section style={S.plain}>
        <p style={S.disclaimer}>{a.disclaimer ?? DEFAULT_DISCLAIMER[locale]}</p>
      </section>

      {/* 06 相關應用方案 */}
      {a.related.length > 0 && (
        <section style={S.tinted}>
          <div style={S.tintedInner}>
            <h2 style={S.relatedTitle}>{c.related}</h2>
            <div style={S.cards4} data-r="cols-2">
              {a.related.map((r) => (
                <Link key={r.slug} href={r.url} style={S.relatedCard} data-hover="lift-shadow">
                  <h3 style={S.relatedName}>
                    {r.name}
                    <small style={S.relatedCount}>{r.productCount}</small>
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7 收尾 CTA */}
      <section style={S.cta}>
        <div style={S.ctaCopy}>
          <h2 style={S.headTitle}>{c.ctaTitle}</h2>
          <p style={S.ctaBody}>{c.ctaBody}</p>
        </div>
        <div style={S.actions}>
          <Link
            href={`/${locale}/where-to-buy`}
            style={S.primary}
            className="hover:text-white"
            data-hover="lift-2-white"
          >
            {c.ctaPrimary}
          </Link>
          <Link href={`/${locale}/contact`} style={S.secondary}>
            {c.ctaSecondary}
          </Link>
        </div>
      </section>
    </>
  );
}

/** 系列專色（docs/08 §2）。與 CollectionBadge 同一組，但這裡吃的是文字色。 */
const DEFAULT_DISCLAIMER: Record<Locale, string> = {
  en: 'This page is general product information, not medical advice. For persistent pain, injury or post-operative care, consult a qualified healthcare professional.',
  'zh-TW': '本頁為一般產品資訊，非醫療建議。持續疼痛、受傷或術後照護請諮詢合格醫療專業人員。',
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
