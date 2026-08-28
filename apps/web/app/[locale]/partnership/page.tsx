import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, type MediaRef } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { section } from '@/lib/page';
import { PageBand } from '@/components/PageBand';
import { PageHero } from '@/components/PageHero';
import { SectionHeading } from '@/components/SectionHeading';
import { PartnershipForm } from '@/components/PartnershipForm';

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

const SUBMIT: Record<Locale, string> = { en: 'Send inquiry', 'zh-TW': '送出洽詢' };

const PROSE = '[&_a]:text-brand-deep [&_li]:mt-1 [&_p]:mt-4 [&_ul]:list-disc [&_ul]:pl-5';

/** 這頁的區段標題比預設大一階（mockup4：clamp(1.8rem,3.4vw,2.4rem)）。 */
const PART_H2 = 'text-[clamp(1.8rem,3.4vw,2.4rem)]';

/** §01 / §02 共用的 21:9 大圖，圓角 22px 加一層柔和落影（mockup4）。 */
function WideShot({ image, focus }: { image: MediaRef; focus: string }) {
  return (
    <div className="aspect-[21/9] overflow-hidden rounded-[22px] shadow-[0_30px_60px_rgba(10,60,72,.16)]">
      <img
        src={image.url}
        srcSet={srcSetOf(image)}
        sizes="100vw"
        alt={image.alt ?? ''}
        loading="lazy"
        decoding="async"
        width={2100}
        height={900}
        className="h-full w-full object-cover"
        style={{ objectPosition: focus }}
      />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
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
      <PageBand image={hero?.band} />

      <PageHero
        eyebrow={hero?.eyebrow ?? FALLBACK[locale]}
        title={hero?.title ?? FALLBACK[locale]}
        lead={hero?.lead}
      />

      {/* 01 OEM / ODM */}
      {oem && (
        <section className="mx-auto max-w-content px-gutter py-[clamp(56px,7vw,80px)]">
          <div className="flex flex-col gap-10">
            <div className="max-w-[720px]">
              <SectionHeading
                index={next()}
                title={oem.title ?? ''}
                titleClassName={PART_H2}
                className="mb-[18px]"
              />
              {oem.body && (
                <div
                  className={`text-[1.05rem] ${PROSE}`}
                  dangerouslySetInnerHTML={{ __html: oem.body }}
                />
              )}
              {/* 服務項目：每格頂上一條 2px 品牌青（mockup4），不是藥丸 chips */}
              {oem.chips && oem.chips.length > 0 && (
                <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
                  {oem.chips.map((chip, i) => (
                    <div key={chip.label ?? i} className="border-t-2 border-brand pt-3">
                      <h3 className="text-[1.02rem] font-[570]">{chip.label}</h3>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {oem.image ? (
              <WideShot image={oem.image} focus="center 30%" />
            ) : (
              <div className="aspect-[21/9] rounded-[22px] bg-tint-deep" />
            )}
          </div>
        </section>
      )}

      {/* 02 經銷服務 —— mockup4 是淺底帶，圖在文字下方 */}
      {distributor && (
        <section className="bg-tint py-[clamp(56px,7vw,80px)]">
          <div className="mx-auto flex max-w-content flex-col gap-10 px-gutter">
            <div className="max-w-[720px]">
              <SectionHeading
                index={next()}
                title={distributor.title ?? ''}
                titleClassName={PART_H2}
                className="mb-[18px]"
              />
              {distributor.body && (
                <div
                  className={`text-[1.05rem] ${PROSE}`}
                  dangerouslySetInnerHTML={{ __html: distributor.body }}
                />
              )}
            </div>
            {distributor.image ? (
              <WideShot image={distributor.image} focus="center 25%" />
            ) : (
              <div className="aspect-[21/9] rounded-[22px] bg-tint-deep" />
            )}
          </div>
        </section>
      )}

      {/* 03 成為夥伴 */}
      {become && (
        <section id="inquiry" className="mx-auto max-w-content px-gutter py-[clamp(56px,7vw,80px)]">
          <SectionHeading
            index={next()}
            title={become.title ?? ''}
            titleClassName={PART_H2}
            className="mb-10"
          />

          {/* 四個步驟：頂上一條細線、序號用品牌青（mockup4），不是卡片 */}
          {become.steps && become.steps.length > 0 && (
            <div className="mb-13 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {become.steps.map((step, i) => (
                <div key={step.title ?? i} className="border-t border-hairline pt-[18px]">
                  <div className="text-[1.4rem] font-[680] text-brand-deep">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  {step.title && (
                    <h3 className="mt-1.5 mb-1 text-[1.08rem] font-[570]">{step.title}</h3>
                  )}
                  {step.body && <p className="text-[0.9rem]">{step.body}</p>}
                </div>
              ))}
            </div>
          )}

          {/*
            詢問表單。送件走 `POST /contact`（type=partnership）——
            **該端點尚未實作**（擋於 SMTP 帳密，見 CLAUDE.md §7），
            上線前送出會顯示失敗訊息，不會靜默吞掉。
          */}
          {(become.formTitle || become.formIntro) && (
            <div className="rounded-[26px] bg-tint-deep p-[clamp(32px,4vw,48px)]">
              <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  {become.formTitle && (
                    <h3 className="text-[1.6rem] font-normal">{become.formTitle}</h3>
                  )}
                  {become.formIntro && <p className="mt-3 max-w-[32ch]">{become.formIntro}</p>}
                </div>

                <PartnershipForm
                  locale={locale}
                  types={become.partnershipTypes ?? []}
                  submitLabel={become.submitLabel ?? SUBMIT[locale]}
                />
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
