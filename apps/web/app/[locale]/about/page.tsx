import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type MediaRef } from '@/lib/api';
import { css } from '@/lib/css';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { section, type CertificationRef, type SectionCta } from '@/lib/page';
import { PageBand } from '@/components/PageBand';
import { PageHero } from '@/components/PageHero';
import { NUMERAL, SectionHeading } from '@/components/SectionHeading';

/** 樣式逐字取自 `mockup4/About.dc.html`。 */
const S = {
  // 01 BRAND STORY
  s01: css`max-width:1180px;margin:0 auto;padding:clamp(64px,8vw,96px) clamp(24px,5vw,64px);`,
  s01Grid: css`display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;`,
  h2: css`color:#16333B;font-weight:400;font-size:clamp(1.9rem,3.6vw,2.5rem);margin:8px 0 18px;`,
  storyLead: css`font-size:1.05rem;margin-bottom:16px;`,
  portrait: css`aspect-ratio:4/5;border-radius:22px;overflow:hidden;box-shadow:0 30px 60px rgba(10,60,72,.16);`,
  portraitImg: css`display:block;width:100%;height:100%;object-fit:cover;object-position:top center;`,

  // 02 MILESTONES
  s02: css`position:relative;overflow:hidden;color:#fff;padding:clamp(72px,9vw,110px) 0;`,
  s02Img: css`position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 25%;`,
  s02Scrim: css`position:absolute;inset:0;background:linear-gradient(90deg,rgba(9,36,45,.74) 0%,rgba(9,36,45,.5) 52%,rgba(9,36,45,.14) 100%);`,
  s02Inner: css`position:relative;max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);`,
  s02Title: css`color:#fff;font-weight:400;font-size:clamp(1.9rem,3.6vw,2.5rem);margin:8px 0 44px;`,
  s02Grid: css`display:grid;grid-template-columns:repeat(5,1fr);gap:0;border-top:1px solid rgba(255,255,255,.16);`,
  s02Cell: css`padding:28px 24px 0;border-left:1px solid rgba(255,255,255,.16);`,
  s02Year: css`color:#7FE0EC;font-weight:680;font-size:1.6rem;letter-spacing:-.02em;`,
  s02Event: css`color:rgba(255,255,255,.78);margin-top:8px;font-size:.92rem;`,

  // 03 CORE VALUES
  s03: css`max-width:1180px;margin:0 auto;padding:clamp(64px,8vw,96px) clamp(24px,5vw,64px) 0;`,
  s03Title: css`color:#16333B;font-weight:400;font-size:clamp(1.9rem,3.6vw,2.5rem);margin:8px 0 12px;`,
  s03Lead: css`max-width:60ch;`,
  s03Grid: css`display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:36px;`,
  s03Card: css`border:1px solid #DFE9EC;border-radius:20px;padding:28px 26px;`,
  s03CardTitle: css`color:#16333B;font-weight:570;font-size:1.25rem;margin-bottom:8px;`,
  s03CardBody: css`font-size:.95rem;`,

  // 04 MANUFACTURING
  s04: css`max-width:1180px;margin:0 auto;padding:clamp(64px,8vw,96px) clamp(24px,5vw,64px);`,
  s04Title: css`color:#16333B;font-weight:400;font-size:clamp(1.9rem,3.6vw,2.5rem);margin:8px 0 36px;max-width:22ch;`,
  s04Shots: css`display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:40px;`,
  s04Wide: css`position:relative;aspect-ratio:16/9;border-radius:20px;overflow:hidden;background:#F0F6F8;`,
  s04Square: css`position:relative;aspect-ratio:1/1;border-radius:20px;overflow:hidden;background:#F0F6F8;`,
  s04Img: css`display:block;width:100%;height:100%;object-fit:cover;`,
  s04Grid: css`display:grid;grid-template-columns:repeat(3,1fr);gap:32px;`,
  s04Item: css`border-top:2px solid #00B5CD;padding-top:18px;`,
  s04ItemTitle: css`color:#16333B;font-weight:570;font-size:1.15rem;margin-bottom:6px;`,
  s04ItemBody: css`font-size:.92rem;`,

  // 05 CERTIFICATES
  s05: css`background:#F5FAFB;padding:clamp(64px,8vw,96px) 0;`,
  s05Inner: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);`,
  s05Grid: css`display:grid;grid-template-columns:.85fr 1.15fr;gap:clamp(36px,5vw,72px);align-items:center;`,
  s05Lead: css`max-width:42ch;`,
  s05Cta: css`display:inline-block;margin-top:28px;background:#00B5CD;color:#fff;font-weight:620;padding:12px 28px;border-radius:999px;box-shadow:0 10px 30px rgba(0,181,205,.3);`,
  s05Cards: css`display:grid;grid-template-columns:1fr 1fr;gap:16px;`,
  s05Hero: css`grid-column:1 / 3;display:flex;align-items:center;gap:20px;background:linear-gradient(140deg,#00B5CD,#007D95);border-radius:18px;padding:24px 28px;`,
  s05HeroMark: css`color:#fff;font-weight:620;font-size:1.35rem;letter-spacing:-.01em;`,
  s05HeroBody: css`color:rgba(255,255,255,.85);font-size:.9rem;`,
  certSub: css`font-size:.82rem;color:#0092A8;`,
  certLogo: css`width:42px;height:42px;flex:0 0 auto;object-fit:contain;`,
  s05Card: css`background:#FFFFFF;border:1px solid #DFE9EC;border-radius:18px;padding:22px 24px;`,
  s05CardMark: css`color:#0092A8;font-weight:680;font-size:1.5rem;letter-spacing:-.01em;`,
  s05CardBody: css`font-size:.88rem;margin-top:6px;`,
} as const;

type Params = { locale: string };

/** About 整頁的區段標題字級（mockup4 這頁比其他頁大一階）。 */

/**
 * About。**全站第一個吃 `GET /pages/{key}` 的頁面** ——
 * 版面固定（照 mockup4），欄位內容全部由後台維護。
 *
 * <p>
 * 每個區段都可能不存在：未翻譯的區段 API 不回、停用的區段 `_enabled` 為 false。
 * 所以每一塊都是 `s && (...)`，且區段序號在渲染時才發 —— 與產品詳情頁同一套做法。
 * </p>
 */
type HeroSection = { band?: MediaRef; eyebrow?: string; title?: string; lead?: string };
type StorySection = { title?: string; body?: string; portrait?: MediaRef };
type MilestonesSection = {
  background?: MediaRef;
  title?: string;
  items?: { year?: string; event?: string }[];
};
type ValuesSection = { title?: string; lead?: string; items?: { title?: string; body?: string }[] };
type ManufacturingSection = {
  title?: string;
  imageWide?: MediaRef;
  imageSquare?: MediaRef;
  points?: { title?: string; body?: string }[];
};
type CertificatesSection = {
  title?: string;
  lead?: string;
  cta?: SectionCta;
  items?: { certification?: string }[];
};

const FALLBACK: Record<Locale, { eyebrow: string; title: string }> = {
  en: { eyebrow: 'About EuniceMed', title: 'About' },
  'zh-TW': { eyebrow: '關於 EuniceMed', title: '關於我們' },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const page = await api.page(locale, 'about');
  const hero = page ? section<HeroSection>(page, 'hero') : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';
  const title = hero?.title ?? FALLBACK[locale].title;

  return {
    title,
    description: hero?.lead,
    alternates: {
      canonical: `${siteUrl}/${locale}/about`,
      languages: { en: `${siteUrl}/en/about`, 'zh-TW': `${siteUrl}/zh-TW/about` },
    },
  };
}

export default async function AboutPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const page = await api.page(locale, 'about');
  // 整頁沒有任何該語系內容時回 404，而不是渲染一個空殼 —— 語言純度
  if (!page) notFound();

  const hero = section<HeroSection>(page, 'hero');
  const story = section<StorySection>(page, 'story');
  const milestones = section<MilestonesSection>(page, 'milestones');
  const values = section<ValuesSection>(page, 'values');
  const manufacturing = section<ManufacturingSection>(page, 'manufacturing');
  const certificates = section<CertificatesSection>(page, 'certificates');

  let n = 0;
  const next = () => ++n;

  return (
    <>
      <PageBand image={hero?.band} />

      <PageHero
        eyebrow={hero?.eyebrow ?? FALLBACK[locale].eyebrow}
        title={hero?.title ?? FALLBACK[locale].title}
        lead={hero?.lead}
      />

      {/* 01 品牌故事 */}
      {story && (
        <section style={S.s01}>
          <div style={S.s01Grid} data-r="stack">
            <div>
              <SectionHeading index={next()} title={story.title ?? ''} titleStyle={S.h2} />
              {story.body && (
                <div
                  className="m4-prose"
                  // richtext 已在寫入時淨化（Section profile），前端不再處理
                  dangerouslySetInnerHTML={{ __html: story.body }}
                />
              )}
            </div>
            {story.portrait && (
              <img
                src={story.portrait.url}
                srcSet={srcSetOf(story.portrait)}
                sizes="(max-width: 1024px) 100vw, 480px"
                alt={story.portrait.alt ?? ''}
                width={1000}
                height={1250}
                decoding="async"
                style={{ ...S.portrait, ...S.portraitImg }}
              />
            )}
          </div>
        </section>
      )}

      {/* 02 里程碑 */}
      {milestones && (
        <section style={S.s02}>
          {milestones.background && (
            <>
              <img
                src={milestones.background.url}
                srcSet={srcSetOf(milestones.background)}
                sizes="100vw"
                alt=""
                loading="lazy"
                decoding="async"
                style={S.s02Img}
              />
              {/* 背景圖上要壓字，一定要有遮罩 —— 圖是編輯者換的，不能假設它夠暗 */}
              {/* 由左至右的深青遮罩：左側文字讀得到、右側照片保持乾淨（DESIGN.md） */}
              <div style={S.s02Scrim} />
            </>
          )}

          <div style={S.s02Inner}>
            <span style={NUMERAL.onPhoto}>{String(next()).padStart(2, '0')}</span>
            {milestones.title && <h2 style={S.s02Title}>{milestones.title}</h2>}

            {milestones.items && milestones.items.length > 0 && (
              <div style={S.s02Grid} data-r="stack">
                {milestones.items.map((m, i) => (
                  <div key={m.year ?? i} style={S.s02Cell}>
                    <div style={S.s02Year}>{m.year}</div>
                    {m.event && <p style={S.s02Event}>{m.event}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 03 核心價值 —— 只有上留白，下方由 04 的 padding 接手（mockup4 的 `… 0`） */}
      {values && (
        <section style={S.s03}>
          <SectionHeading index={next()} title={values.title ?? ''} titleStyle={S.s03Title} />
          {values.lead && <p style={S.s03Lead}>{values.lead}</p>}

          {values.items && values.items.length > 0 && (
            <div style={S.s03Grid} data-r="stack">
              {values.items.map((v, i) => (
                <div key={v.title ?? i} style={S.s03Card}>
                  {v.title && <h3 style={S.s03CardTitle}>{v.title}</h3>}
                  {v.body && <p style={S.s03CardBody}>{v.body}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 04 製造與品質 */}
      {manufacturing && (
        <section style={S.s04}>
          <div>
            <SectionHeading
              index={next()}
              title={manufacturing.title ?? ''}
              titleStyle={S.s04Title}
            />

            {(manufacturing.imageWide || manufacturing.imageSquare) && (
              <div style={S.s04Shots} data-r="stack">
                {manufacturing.imageWide && (
                  <img
                    src={manufacturing.imageWide.url}
                    srcSet={srcSetOf(manufacturing.imageWide)}
                    sizes="(max-width: 1024px) 100vw, 700px"
                    alt={manufacturing.imageWide.alt ?? ''}
                    loading="lazy"
                    decoding="async"
                    width={1600}
                    height={900}
                    style={{ ...S.s04Wide, ...S.s04Img }}
                  />
                )}
                {manufacturing.imageSquare && (
                  <img
                    src={manufacturing.imageSquare.url}
                    srcSet={srcSetOf(manufacturing.imageSquare)}
                    sizes="(max-width: 1024px) 100vw, 420px"
                    alt={manufacturing.imageSquare.alt ?? ''}
                    loading="lazy"
                    decoding="async"
                    width={1200}
                    height={1200}
                    style={{ ...S.s04Square, ...S.s04Img }}
                  />
                )}
              </div>
            )}

            {manufacturing.points && manufacturing.points.length > 0 && (
              /* 每欄頂上一條 2px 品牌青（mockup4） */
              <div style={S.s04Grid} data-r="stack">
                {manufacturing.points.map((p, i) => (
                  <div key={p.title ?? i} style={S.s04Item}>
                    {p.title && <h3 style={S.s04ItemTitle}>{p.title}</h3>}
                    {p.body && <p style={S.s04ItemBody}>{p.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 05 認證 */}
      {certificates && (
        <section style={S.s05}>
          <div style={S.s05Inner}>
            <div style={S.s05Grid} data-r="stack">
              <div>
                <SectionHeading index={next()} title={certificates.title ?? ''} titleStyle={S.h2} />
                {certificates.lead && <p style={S.s05Lead}>{certificates.lead}</p>}
                {certificates.cta?.url && certificates.cta.label && <Cta cta={certificates.cta} />}
              </div>

              {certificates.items && certificates.items.length > 0 && (
                <div style={S.s05Cards} data-r="stack">
                  {certificates.items.map((item, i) => (
                    <CertCard
                      key={item.certification ?? i}
                      slug={item.certification}
                      refs={page.refs.certifications}
                      /* mockup4 把第一張做成橫跨兩欄的青色漸層卡 */
                      hero={i === 0}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/**
 * 區段的 CTA。`external` 由編輯者決定 —— 外部連結用 `<a>` 加 noopener，
 * 站內連結走 `<Link>` 才有預先載入。兩者不能混用。
 */
function Cta({ cta }: { cta: SectionCta }) {
  return cta.external ? (
    <a
      href={cta.url}
      target="_blank"
      rel="noopener"
      style={S.s05Cta}
      className="hover:text-white"
      data-hover="lift-2-white"
    >
      {cta.label}
    </a>
  ) : (
    <Link href={cta.url!} style={S.s05Cta} className="hover:text-white" data-hover="lift-2-white">
      {cta.label}
    </Link>
  );
}

/**
 * 認證卡。區段只存 slug，實際內容在 `refs.certifications` ——
 * 這樣同一份認證在 About 與產品頁只維護一次（docs/05 §3.3）。
 * 查不到就不渲染：那表示編輯者刪了認證卻沒更新這一頁。
 */
function CertCard({
  slug,
  refs,
  hero = false,
}: {
  slug: string | undefined;
  refs: Record<string, CertificationRef>;
  /** mockup4 的第一張是橫跨兩欄的青色漸層卡，其餘是白底細框 */
  hero?: boolean;
}) {
  const cert = slug ? refs[slug] : undefined;
  if (!cert) return null;

  return (
    <div style={hero ? S.s05Hero : S.s05Card} data-hover={hero ? undefined : 'edge'}>
      {cert.logo && (
        <img
          src={cert.logo.url}
          alt={cert.logo.alt ?? cert.mark}
          loading="lazy"
          decoding="async"
          style={S.certLogo}
        />
      )}
      <div>
        <div style={hero ? S.s05HeroMark : S.s05CardMark}>{cert.mark}</div>
        {cert.subLabel && <div style={S.certSub}>{cert.subLabel}</div>}
        {cert.description && <p style={hero ? S.s05HeroBody : S.s05CardBody}>{cert.description}</p>}
      </div>
    </div>
  );
}
