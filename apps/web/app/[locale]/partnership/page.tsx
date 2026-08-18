import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, type MediaRef } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { section } from '@/lib/page';
import { PageHero } from '@/components/PageHero';
import { SectionHeading } from '@/components/SectionHeading';

type Params = { locale: string };

type HeroSection = { band?: MediaRef; eyebrow?: string; title?: string; lead?: string };
type OemOdmSection = {
  title?: string;
  body?: string;
  chips?: { label?: string }[];
  image?: MediaRef;
};
type DistributorSection = { title?: string; body?: string; image?: MediaRef };
type BecomePartnerSection = {
  title?: string;
  steps?: { title?: string; body?: string }[];
  formTitle?: string;
  formIntro?: string;
  partnershipTypes?: { key?: string; label?: string }[];
  submitLabel?: string;
};

const FALLBACK: Record<Locale, string> = { en: 'Partnership', 'zh-TW': '合作夥伴' };

const PROSE = '[&_a]:text-[--color-brand-deep] [&_li]:mt-1 [&_p]:mt-4 [&_ul]:list-disc [&_ul]:pl-5';

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const page = await api.page(locale, 'partnership');
  const hero = page ? section<HeroSection>(page, 'hero') : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';

  return {
    title: hero?.title ?? FALLBACK[locale],
    description: hero?.lead,
    alternates: {
      canonical: `${siteUrl}/${locale}/partnership`,
      languages: {
        en: `${siteUrl}/en/partnership`,
        'zh-TW': `${siteUrl}/zh-TW/partnership`,
      },
    },
  };
}

export default async function PartnershipPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const page = await api.page(locale, 'partnership');
  if (!page) notFound();

  const hero = section<HeroSection>(page, 'hero');
  const oem = section<OemOdmSection>(page, 'oemOdm');
  const distributor = section<DistributorSection>(page, 'distributor');
  const become = section<BecomePartnerSection>(page, 'becomePartner');

  let n = 0;
  const next = () => ++n;

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
        eyebrow={hero?.eyebrow ?? FALLBACK[locale]}
        title={hero?.title ?? FALLBACK[locale]}
        lead={hero?.lead}
      />

      {/* 01 OEM / ODM */}
      {oem && (
        <section className="mx-auto max-w-[--container-content] px-6 py-14 lg:px-16">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionHeading index={next()} title={oem.title ?? ''} className="mb-4" />
              {oem.body && <div className={PROSE} dangerouslySetInnerHTML={{ __html: oem.body }} />}
              {oem.chips && oem.chips.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {oem.chips.map((chip, i) => (
                    <span
                      key={chip.label ?? i}
                      className="rounded-full border border-[--color-hairline] bg-[--color-tint-deep] px-3.5 py-1.5 text-[0.85rem] font-medium"
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {oem.image ? (
              <img
                src={oem.image.url}
                srcSet={srcSetOf(oem.image)}
                sizes="(max-width: 1024px) 100vw, 560px"
                alt={oem.image.alt ?? ''}
                loading="lazy"
                decoding="async"
                width={1600}
                height={900}
                className="aspect-[16/9] w-full rounded-[20px] object-cover"
              />
            ) : (
              <div className="aspect-[16/9] rounded-[20px] bg-[--color-tint-deep]" />
            )}
          </div>
        </section>
      )}

      {/* 02 經銷服務 —— 背景圖上壓字 */}
      {distributor && (
        <section className="relative overflow-hidden py-16">
          {distributor.image ? (
            <>
              <img
                src={distributor.image.url}
                srcSet={srcSetOf(distributor.image)}
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

          <div className="relative mx-auto max-w-[--container-content] px-6 lg:px-16">
            <span className="text-lg font-medium text-white/60">
              {String(next()).padStart(2, '0')}
            </span>
            {distributor.title && (
              <h2 className="mt-2 max-w-[20ch] text-[clamp(1.8rem,3.4vw,2.3rem)] font-normal text-white">
                {distributor.title}
              </h2>
            )}
            {distributor.body && (
              <div
                className={`mt-4 max-w-[62ch] text-white/85 ${PROSE} [&_a]:text-white`}
                dangerouslySetInnerHTML={{ __html: distributor.body }}
              />
            )}
          </div>
        </section>
      )}

      {/* 03 成為夥伴 */}
      {become && (
        <section className="mx-auto max-w-[--container-content] px-6 py-14 lg:px-16">
          <SectionHeading index={next()} title={become.title ?? ''} className="mb-8" />

          {become.steps && become.steps.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {become.steps.map((step, i) => (
                <div
                  key={step.title ?? i}
                  className="rounded-[18px] border border-[--color-hairline] p-6"
                >
                  <span className="font-bold text-[--color-brand-deep]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {step.title && <h3 className="mt-1 text-[1.1rem] font-semibold">{step.title}</h3>}
                  {step.body && <p className="mt-1.5 text-[0.95rem]">{step.body}</p>}
                </div>
              ))}
            </div>
          )}

          {/*
            表單本體待 Phase 7 的 POST /contact（type=partnership）——
            它與 Contact 頁、產品詢價共用同一個 client 表單元件，三處一起做。
            這裡先渲染標題與說明，因為那是編輯者已經填好的文案；
            **刻意不放一個按下去沒反應的送出鈕**。
          */}
          {(become.formTitle || become.formIntro) && (
            <div className="mt-10 rounded-[20px] border border-[--color-hairline] bg-[--color-tint] p-7">
              {become.formTitle && (
                <h3 className="text-[1.2rem] font-semibold">{become.formTitle}</h3>
              )}
              {become.formIntro && <p className="mt-1.5 text-[0.95rem]">{become.formIntro}</p>}

              {become.partnershipTypes && become.partnershipTypes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {become.partnershipTypes.map((t, i) => (
                    <span
                      key={t.key ?? i}
                      className="rounded-full border border-[--color-hairline] bg-white px-3.5 py-1.5 text-[0.85rem] font-medium"
                    >
                      {t.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}
