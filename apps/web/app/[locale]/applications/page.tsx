import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { BodyMap } from '@/components/BodyMap';
import { SectionHeading } from '@/components/SectionHeading';

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

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
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
      <section className="mx-auto max-w-[--container-content] px-6 pt-10 lg:px-16">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-[--color-brand-deep]">
            {c.eyebrow}
          </p>
          <h1 className="mt-2.5 text-[clamp(2rem,3.6vw,2.8rem)] font-normal">{c.title}</h1>
          <p className="mt-3.5 text-[1.1rem]">{c.lead}</p>
        </div>
      </section>

      {spots.length > 0 && (
        <section className="mx-auto max-w-[--container-content] px-6 py-14 lg:px-16">
          <SectionHeading index={next()} title={c.byBodyPart} className="mb-10" />
          <BodyMap spots={spots} locale={locale} />
        </section>
      )}

      {special.length > 0 && (
        <section className="bg-[--color-tint] py-14">
          <div className="mx-auto max-w-[--container-content] px-6 lg:px-16">
            <SectionHeading index={next()} title={c.bySpecial} className="mb-8" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {special.map((a) => (
                <Link
                  key={a.slug}
                  href={a.url}
                  className="group overflow-hidden rounded-[20px] border border-[--color-hairline] bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(10,60,72,.10)]"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-[--color-tint-deep]">
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
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <div className="px-5 pb-6 pt-5">
                    <h3 className="text-[1.15rem] font-semibold">{a.name}</h3>
                    {a.lead && <p className="mt-1 text-[0.9rem]">{a.lead}</p>}
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
