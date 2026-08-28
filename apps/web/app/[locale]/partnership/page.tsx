import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, type MediaRef } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { section } from '@/lib/page';
import { css } from '@/lib/css';
import { PageBand } from '@/components/PageBand';
import { PageHero } from '@/components/PageHero';
import { SectionHeading } from '@/components/SectionHeading';
import { PartnershipForm } from '@/components/PartnershipForm';

/** 樣式逐字取自 `mockup4/Partnership.dc.html`。 */
const S = {
  section: css`max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,80px) clamp(24px,5vw,64px);`,
  tinted: css`background:#F5FAFB;padding:clamp(56px,7vw,80px) 0;`,
  tintedInner: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);`,
  stack: css`display:flex;flex-direction:column;gap:40px;`,
  copy: css`max-width:720px;`,
  h2: css`color:#16333B;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.4rem);margin:8px 0 18px;`,
  lead: css`font-size:1.05rem;margin-bottom:20px;`,
  leadTight: css`font-size:1.05rem;margin-bottom:16px;`,
  chips: css`display:grid;grid-template-columns:1fr 1fr;gap:14px;`,
  chip: css`border-top:2px solid #00B5CD;padding-top:12px;`,
  chipTitle: css`color:#16333B;font-weight:570;font-size:1.02rem;`,
  shot: css`aspect-ratio:21/9;border-radius:22px;overflow:hidden;box-shadow:0 30px 60px rgba(10,60,72,.16);`,
  /** 兩張 21:9 照片的裁切焦點不同（mockup4） */
  focus30: css`object-position:center 30%;`,
  focus25: css`object-position:center 25%;`,
  shotImg: css`display:block;width:100%;height:100%;object-fit:cover;`,

  // 03
  stepsTitle: css`color:#16333B;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.4rem);margin:8px 0 40px;`,
  steps: css`display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-bottom:52px;`,
  step: css`border-top:1px solid #DFE9EC;padding-top:18px;`,
  stepNo: css`color:#0092A8;font-weight:680;font-size:1.4rem;`,
  stepTitle: css`color:#16333B;font-weight:570;font-size:1.08rem;margin:6px 0 4px;`,
  stepBody: css`font-size:.9rem;`,
  panel: css`background:#F0F6F8;border-radius:26px;padding:clamp(32px,4vw,48px);`,
  panelGrid: css`display:grid;grid-template-columns:.9fr 1.1fr;gap:48px;align-items:start;`,
  panelTitle: css`color:#16333B;font-weight:400;font-size:1.6rem;`,
  panelIntro: css`color:#44565D;margin-top:12px;max-width:32ch;`,
} as const;

type Params = { locale: string };

type HeroSection = { band?: MediaRef };
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
};

/**
 * 版面文案 —— 頁首**刻意寫死，不走 CMS**（決議見 docs/15-cms-scope.md）。
 * 英文逐字取自 `mockup4/Partnership.dc.html`。
 */
const COPY: Record<Locale, { eyebrow: string; title: string; lead: string }> = {
  en: {
    eyebrow: 'Partnership',
    title: 'A team you can truly count on',
    lead:
      'From OEM/ODM development to distribution support — partner with a Taiwanese ' +
      'manufacturer built on precision, service and trust.',
  },
  'zh-TW': {
    eyebrow: '合作夥伴',
    title: '真正值得信賴的團隊',
    lead:
      '從 OEM/ODM 開發到經銷支援 —— ' +
      '與一家以精準、服務與信任為本的台灣製造商合作。',
  },
};

/** mockup4 的送出鈕逐字是 `Submit inquiry`。 */
const SUBMIT: Record<Locale, string> = { en: 'Submit inquiry', 'zh-TW': '送出洽詢' };

/** 這頁的區段標題比預設大一階（mockup4：clamp(1.8rem,3.4vw,2.4rem)）。 */
const PART_H2 = 'text-[clamp(1.8rem,3.4vw,2.4rem)]';

/** §01 / §02 共用的 21:9 大圖，圓角 22px 加一層柔和落影（mockup4）。 */
function WideShot({ image, focus }: { image: MediaRef; focus: CSSProperties }) {
  return (
    <div style={S.shot}>
      <img
        src={image.url}
        srcSet={srcSetOf(image)}
        sizes="100vw"
        alt={image.alt ?? ''}
        loading="lazy"
        decoding="async"
        width={2100}
        height={900}
        style={{ ...S.shotImg, ...focus }}
      />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';

  return {
    title: COPY[locale].title,
    description: COPY[locale].lead,
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
        eyebrow={COPY[locale].eyebrow}
        title={COPY[locale].title}
        lead={COPY[locale].lead}
      />

      {/* 01 經銷服務 */}
      {distributor && (
        <section style={S.section}>
          <div style={S.stack}>
            <div style={S.copy}>
              <SectionHeading
                index={next()}
                title={distributor.title ?? ''}
                titleClassName={PART_H2}
                titleStyle={S.h2}
              />
              {distributor.body && (
                <div
                  className="m4-prose"
                  style={S.lead}
                  dangerouslySetInnerHTML={{ __html: distributor.body }}
                />
              )}
            </div>
            {distributor.image ? (
              <WideShot image={distributor.image} focus={S.focus25} />
            ) : (
              <div style={S.shot} />
            )}
          </div>
        </section>
      )}

      {/* 02 OEM / ODM —— mockup4 的淺底帶（原為經銷服務），圖在文字下方 */}
      {oem && (
        <section style={S.tinted}>
          <div style={{ ...S.tintedInner, ...S.stack }}>
            <div style={S.copy}>
              <SectionHeading
                index={next()}
                title={oem.title ?? ''}
                titleClassName={PART_H2}
                titleStyle={S.h2}
              />
              {oem.body && (
                <div
                  className="m4-prose"
                  style={S.lead}
                  dangerouslySetInnerHTML={{ __html: oem.body }}
                />
              )}
              {/* 服務項目：每格頂上一條 2px 品牌青（mockup4），不是藥丸 chips */}
              {oem.chips && oem.chips.length > 0 && (
                <div style={S.chips} data-r="cols-2">
                  {oem.chips.map((chip, i) => (
                    <div key={chip.label ?? i} style={S.chip}>
                      <h3 style={S.chipTitle}>{chip.label}</h3>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {oem.image ? <WideShot image={oem.image} focus={S.focus30} /> : <div style={S.shot} />}
          </div>
        </section>
      )}

      {/* 03 成為夥伴 */}
      {become && (
        <section id="inquiry" style={S.section}>
          <SectionHeading
            index={next()}
            title={become.title ?? ''}
            titleClassName={PART_H2}
            titleStyle={S.stepsTitle}
          />

          {/* 四個步驟：頂上一條細線、序號用品牌青（mockup4），不是卡片 */}
          {become.steps && become.steps.length > 0 && (
            <div style={S.steps} data-r="cols-2">
              {become.steps.map((step, i) => (
                <div key={step.title ?? i} style={S.step}>
                  <div style={S.stepNo}>{String(i + 1).padStart(2, '0')}</div>
                  {step.title && <h3 style={S.stepTitle}>{step.title}</h3>}
                  {step.body && <p style={S.stepBody}>{step.body}</p>}
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
            <div style={S.panel}>
              <div style={S.panelGrid}>
                <div>
                  {become.formTitle && <h3 style={S.panelTitle}>{become.formTitle}</h3>}
                  {become.formIntro && <p style={S.panelIntro}>{become.formIntro}</p>}
                </div>

                <PartnershipForm
                  locale={locale}
                  types={become.partnershipTypes ?? []}
                  submitLabel={SUBMIT[locale]}
                />
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
