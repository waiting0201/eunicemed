import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { css } from '@/lib/css';
import { BodyMap } from '@/components/BodyMap';
import { PageHero } from '@/components/PageHero';
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
} as const;

type Params = { locale: string };

const COPY: Record<
  Locale,
  { eyebrow: string; title: string; lead: string; byBodyPart: string; bySpecial: string }
> = {
  en: {
    eyebrow: 'Applications',
    title: 'Where does it hurt or tire?',
    lead: 'Tap a body part to see the supports designed for it — or browse solutions for special care needs.',
    byBodyPart: 'By body part',
    bySpecial: 'By special needs care',
  },
  'zh-TW': {
    eyebrow: '應用方案',
    title: '哪裡不舒服？',
    lead: '點選部位查看對應的支撐產品，或瀏覽特殊照護需求的解決方案。',
    byBodyPart: '依部位',
    bySpecial: '特殊照護需求',
  },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';
  const c = COPY[locale];

  return {
    title: c.title,
    description: c.lead,
    alternates: {
      canonical: `${siteUrl}/${locale}/applications`,
      languages: {
        en: `${siteUrl}/en/applications`,
        'zh-TW': `${siteUrl}/zh-TW/applications`,
      },
    },
  };
}

export default async function ApplicationsPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [spots, all] = await Promise.all([api.bodyMap(locale), api.applications(locale)]);
  const special = all.filter((a) => a.type === 'special-care');
  const c = COPY[locale];

  let n = 0;
  const next = () => ++n;

  return (
    <>
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
          </div>
        </section>
      )}
    </>
  );
}
