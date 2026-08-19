import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type MediaRef } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { section, type CertificationRef, type SectionCta } from '@/lib/page';
import { SectionHeading } from '@/components/SectionHeading';

type Params = { locale: string };

/** About 整頁的區段標題字級（mockup4 這頁比其他頁大一階）。 */
const ABOUT_H2 = 'text-[clamp(1.9rem,3.6vw,2.5rem)]';

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

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
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
      {hero?.band && <Band media={hero.band} />}

      <section className="mx-auto max-w-content px-gutter pt-[clamp(32px,4vw,48px)]">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="text-[0.78rem] font-[680] uppercase tracking-[0.16em] text-brand-deep">
            {hero?.eyebrow ?? FALLBACK[locale].eyebrow}
          </p>
          <h1 className="mt-2.5 text-[clamp(2rem,3.6vw,2.8rem)] font-normal">
            {hero?.title ?? FALLBACK[locale].title}
          </h1>
          {hero?.lead && <p className="mt-3.5 text-[1.1rem]">{hero.lead}</p>}
        </div>
      </section>

      {/* 01 品牌故事 */}
      {story && (
        <section className="mx-auto max-w-content px-gutter py-[clamp(64px,8vw,96px)]">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <SectionHeading titleClassName={ABOUT_H2} index={next()} title={story.title ?? ''} className="mb-4" />
              {story.body && (
                <div
                  className="[&_a]:text-brand-deep [&_li]:mt-1 [&_p]:mt-4 [&_ul]:list-disc [&_ul]:pl-5"
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
                className="aspect-[4/5] w-full rounded-[22px] object-cover"
              />
            )}
          </div>
        </section>
      )}

      {/* 02 里程碑 */}
      {milestones && (
        <section className="relative overflow-hidden py-[clamp(72px,9vw,110px)]">
          {milestones.background && (
            <>
              <img
                src={milestones.background.url}
                srcSet={srcSetOf(milestones.background)}
                sizes="100vw"
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* 背景圖上要壓字，一定要有遮罩 —— 圖是編輯者換的，不能假設它夠暗 */}
              {/* 由左至右的深青遮罩：左側文字讀得到、右側照片保持乾淨（DESIGN.md） */}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,36,45,.74)_0%,rgba(9,36,45,.5)_52%,rgba(9,36,45,.14)_100%)]" />
            </>
          )}

          <div className="relative mx-auto max-w-content px-gutter">
            <span className="text-lg font-medium text-white/60">
              {String(next()).padStart(2, '0')}
            </span>
            {milestones.title && (
              <h2 className="mt-2 text-[clamp(1.8rem,3.4vw,2.3rem)] font-normal text-white">
                {milestones.title}
              </h2>
            )}

            {milestones.items && milestones.items.length > 0 && (
              <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                {milestones.items.map((m, i) => (
                  <div key={m.year ?? i} className="border-t border-white/25 pt-4">
                    <div className="text-[1.6rem] font-semibold text-white">{m.year}</div>
                    {m.event && <p className="mt-1 text-[0.92rem] text-white/80">{m.event}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 03 核心價值 —— 只有上留白，下方由 04 的 padding 接手（mockup4 的 `… 0`） */}
      {values && (
        <section className="mx-auto max-w-content px-gutter pt-[clamp(64px,8vw,96px)]">
          <SectionHeading titleClassName={ABOUT_H2} index={next()} title={values.title ?? ''} />
          {values.lead && <p className="mt-3 max-w-[60ch]">{values.lead}</p>}

          {values.items && values.items.length > 0 && (
            <div className="mt-9 grid gap-6 lg:grid-cols-3">
              {values.items.map((v, i) => (
                <div
                  key={v.title ?? i}
                  className="rounded-[20px] border border-hairline px-[26px] py-7"
                >
                  {v.title && <h3 className="text-[1.25rem] font-[570]">{v.title}</h3>}
                  {v.body && <p className="mt-2 text-[0.95rem]">{v.body}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 04 製造與品質 */}
      {manufacturing && (
        <section className="mx-auto max-w-content px-gutter py-[clamp(64px,8vw,96px)]">
          <div>
            <SectionHeading titleClassName={ABOUT_H2} index={next()} title={manufacturing.title ?? ''} className="mb-8" />

            {(manufacturing.imageWide || manufacturing.imageSquare) && (
              <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
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
                    className="aspect-[16/9] w-full rounded-[20px] object-cover"
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
                    className="aspect-square w-full rounded-[20px] object-cover"
                  />
                )}
              </div>
            )}

            {manufacturing.points && manufacturing.points.length > 0 && (
              /* 每欄頂上一條 2px 品牌青（mockup4） */
              <div className="mt-10 grid gap-8 lg:grid-cols-3">
                {manufacturing.points.map((p, i) => (
                  <div key={p.title ?? i} className="border-t-2 border-brand pt-[18px]">
                    {p.title && <h3 className="text-[1.15rem] font-[570]">{p.title}</h3>}
                    {p.body && <p className="mt-1.5 text-[0.92rem]">{p.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 05 認證 */}
      {certificates && (
        <section className="bg-tint py-[clamp(64px,8vw,96px)]">
          <div className="mx-auto grid max-w-content items-center gap-[clamp(36px,5vw,72px)] px-gutter lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <SectionHeading titleClassName={ABOUT_H2} index={next()} title={certificates.title ?? ''} />
              {certificates.lead && (
                <p className="mt-4 max-w-[42ch]">{certificates.lead}</p>
              )}
              {certificates.cta?.url && certificates.cta.label && (
                <Cta cta={certificates.cta} />
              )}
            </div>

            {certificates.items && certificates.items.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {certificates.items.map((item, i) => (
                  <CertCard
                    key={item.certification ?? i}
                    slug={item.certification}
                    refs={page.refs.certifications}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}

/** 頁首橫幅（16:3）。 */
function Band({ media }: { media: MediaRef }) {
  return (
    <img
      src={media.url}
      srcSet={srcSetOf(media)}
      sizes="100vw"
      alt={media.alt ?? ''}
      width={2560}
      height={480}
      decoding="async"
      className="h-[clamp(160px,18.75vw,360px)] w-full object-cover"
    />
  );
}

/**
 * 區段的 CTA。`external` 由編輯者決定 —— 外部連結用 `<a>` 加 noopener，
 * 站內連結走 `<Link>` 才有預先載入。兩者不能混用。
 */
function Cta({ cta }: { cta: SectionCta }) {
  const className =
    'mt-5 inline-block rounded-full bg-brand px-7 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(0,181,205,.32)] transition hover:bg-brand-deep hover:text-white';

  return cta.external ? (
    <a href={cta.url} target="_blank" rel="noopener" className={className}>
      {cta.label}
    </a>
  ) : (
    <Link href={cta.url!} className={className}>
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
}: {
  slug: string | undefined;
  refs: Record<string, CertificationRef>;
}) {
  const cert = slug ? refs[slug] : undefined;
  if (!cert) return null;

  return (
    <div className="flex gap-4 rounded-[16px] border border-hairline p-5">
      {cert.logo && (
        <img
          src={cert.logo.url}
          alt={cert.logo.alt ?? cert.mark}
          loading="lazy"
          decoding="async"
          className="h-10 w-10 shrink-0 object-contain"
        />
      )}
      <div>
        <div className="font-semibold text-ink">{cert.mark}</div>
        {cert.subLabel && (
          <div className="text-[0.82rem] text-brand-deep">{cert.subLabel}</div>
        )}
        {cert.description && (
          <p className="mt-1 text-[0.88rem]">{cert.description}</p>
        )}
      </div>
    </div>
  );
}
