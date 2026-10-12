import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { css } from '@/lib/css';
import { BodyMap } from '@/components/BodyMap';
import { PageBand } from '@/components/PageBand';
import { PageHero } from '@/components/PageHero';
import { BRAND_BANDS, pageBand } from '@/lib/bands';
import { pageMetadata } from '@/lib/seo';
import { webPageSchema } from '@/lib/schema';
import { JsonLd } from '@/components/JsonLd';
import { SectionHeading } from '@/components/SectionHeading';

/** 樣式逐字取自 `mockup4/Applications.dc.html`。 */
const S = {
  map: css`max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,80px) clamp(24px,5vw,64px);`,
  h2: css`color:#16333B;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.3rem);margin:8px 0 40px;`,
  special: css`background:#F5FAFB;padding:clamp(56px,7vw,80px) 0;`,
  specialInner: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);`,
  specialH2: css`color:#16333B;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.3rem);margin:8px 0 32px;`,
  grid: css`display:grid;grid-template-columns:repeat(3,1fr);gap:24px;`,
  card: css`background:#FFFFFF;border:1px solid #DFE9EC;border-radius:20px;overflow:hidden;`,
  cardMedia: css`position:relative;aspect-ratio:16/10;overflow:hidden;background:#F0F6F8;`,
  cardImg: css`display:block;width:100%;height:100%;object-fit:cover;`,
  cardBody: css`padding:20px 22px 24px;`,
  cardTitle: css`color:#16333B;font-weight:570;font-size:1.15rem;`,
  cardLead: css`font-size:.9rem;margin-top:4px;`,
  b2b: css`display:inline-block;margin-top:32px;color:#0092A8;font-weight:600;`,
} as const;

type Params = { locale: string };

const COPY: Record<
  Locale,
  {
    meta: { title: string; description: string };
    eyebrow: string;
    title: string;
    lead: string;
    byBodyPart: string;
    bySpecial: string;
    /** B2B 導流句，連到 Partnership（連結在渲染時組） */
    b2b: string;
  }
> = {
  en: {
    meta: {
      title: 'Support by Body Part, Elderly & Post-Op Care | EuniceMed',
      description:
        'Find the right knee, ankle or back brace by body part, or explore EuniceMed solutions ' +
        'for elderly care, bunions, post-surgery rehab and long-term care.',
    },
    eyebrow: 'Applications · Where does it hurt or tire?',
    title: 'Braces & Compression Solutions by Body Part and Care Need',
    lead:
      'Life places different demands on every body. Tap a body part to find the right knee brace, ' +
      'ankle support or back brace — or explore integrated braces and compression stocking ' +
      'solutions for home care, long-term care and home rehabilitation.',
    byBodyPart: 'By Body Part',
    bySpecial: 'By Special Needs Care',
    b2b: 'Sourcing for a hospital or care facility? Ask about bulk and wholesale supply →',
  },
  'zh-TW': {
    meta: {
      title: '依部位找護具、長者與術後照護 | EuniceMed',
      description:
        '依部位找到合適的護膝、護踝或護腰，或探索 EuniceMed 針對長者照護、拇趾外翻、' +
        '術後復健與長期照護的解決方案。',
    },
    eyebrow: '應用方案 · 哪裡不舒服？',
    title: '依部位與照護需求的護具與彈性襪解決方案',
    lead:
      '每個人的身體承受著不同的負擔。點選部位，找到合適的護膝、護踝或護腰 —— ' +
      '或探索適用於居家照護、長期照護與居家復健的護具與醫療彈性襪整合方案。',
    byBodyPart: '依部位',
    bySpecial: '特殊照護需求',
    b2b: '為醫院或照護機構採購？洽詢大量與批發供應 →',
  },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const c = COPY[locale];

  return pageMetadata({
    locale,
    path: '/applications',
    title: c.meta.title,
    absoluteTitle: true,
    description: c.meta.description,
  });
}

export default async function ApplicationsPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [spots, all, page] = await Promise.all([
    api.bodyMap(locale),
    api.applications(locale),
    api.page(locale, 'applications'),
  ]);
  const special = all.filter((a) => a.type === 'special-care');
  const c = COPY[locale];

  let n = 0;
  const next = () => ++n;

  return (
    <>
      <JsonLd data={webPageSchema(locale, '/applications', 'WebPage', c.meta)} />
      <PageBand image={pageBand(page, BRAND_BANDS.pattern02)} />
      <PageHero eyebrow={c.eyebrow} title={c.title} lead={c.lead} />

      {spots.length > 0 && (
        <section style={S.map}>
          <SectionHeading index={next()} title={c.byBodyPart} titleStyle={S.h2} />
          <BodyMap spots={spots} locale={locale} />
        </section>
      )}

      {special.length > 0 && (
        <section style={S.special}>
          <div style={S.specialInner}>
            <SectionHeading index={next()} title={c.bySpecial} titleStyle={S.specialH2} />
            <div style={S.grid} data-r="cols-2">
              {special.map((a) => (
                <Link key={a.slug} href={a.url} style={S.card} data-hover="lift-shadow">
                  <div style={S.cardMedia}>
                    {a.image && (
                      <img
                        src={a.image.url}
                        srcSet={srcSetOf(a.image)}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                        alt={a.image.alt ?? a.name}
                        loading="lazy"
                        decoding="async"
                        width={800}
                        height={500}
                        style={S.cardImg}
                      />
                    )}
                  </div>
                  <div style={S.cardBody}>
                    <h3 style={S.cardTitle}>{a.name}</h3>
                    {a.lead && <p style={S.cardLead}>{a.lead}</p>}
                  </div>
                </Link>
              ))}
            </div>
            <Link href={`/${locale}/partnership`} style={S.b2b}>
              {c.b2b}
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
