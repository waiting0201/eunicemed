import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, type SalesLocation } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { ContactCta } from '@/components/ContactCta';
import { PageHero } from '@/components/PageHero';

type Params = { locale: string };

const COPY: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    lead: string;
    domestic: string;
    international: string;
    otherRegions: string;
    visit: string;
    empty: string;
    ctaTitle: string;
    ctaBody: string;
  }
> = {
  en: {
    eyebrow: 'Where to Buy',
    title: 'Find a stockist near you',
    lead: 'EuniceMed products are available through trusted distributors and retailers worldwide. Browse partners by region.',
    domestic: 'Taiwan',
    international: 'International distributors',
    otherRegions: 'Other regions',
    visit: 'Visit website →',
    empty: 'Distributor listings are being updated. Please contact us for the nearest partner.',
    ctaTitle: 'Not in your region yet?',
    ctaBody:
      "Contact us and we'll point you to the nearest partner — or discuss becoming one.",
  },
  'zh-TW': {
    eyebrow: '銷售據點',
    title: '尋找鄰近通路',
    lead: 'EuniceMed 產品透過各地經銷夥伴與零售通路販售，可依地區查詢。',
    domestic: '台灣',
    international: '國際經銷夥伴',
    otherRegions: '其他地區',
    visit: '前往官網 →',
    empty: '經銷資訊更新中，請直接與我們聯絡以取得最近的合作夥伴。',
    ctaTitle: '你的地區還沒有據點？',
    ctaBody: '與我們聯絡，我們會為你介紹最近的合作夥伴，或洽談成為經銷商。',
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
      canonical: `${siteUrl}/${locale}/where-to-buy`,
      languages: {
        en: `${siteUrl}/en/where-to-buy`,
        'zh-TW': `${siteUrl}/zh-TW/where-to-buy`,
      },
    },
  };
}

export default async function WhereToBuyPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const data = await api.salesLocations(locale);
  const c = COPY[locale];
  const isEmpty = data.domestic.length === 0 && data.international.length === 0;

  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} lead={c.lead} />

      <section className="mx-auto max-w-[--container-content] px-6 py-14 lg:px-16">
        {isEmpty && <p className="py-10 text-center text-[--color-grey]">{c.empty}</p>}

        {data.domestic.length > 0 && (
          <>
            <h2 className="text-[clamp(1.6rem,3vw,2rem)] font-normal">{c.domestic}</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.domestic.map((loc) => (
                <Card key={cardKey(loc)} loc={loc} visit={c.visit} />
              ))}
            </div>
          </>
        )}

        {data.international.length > 0 && (
          <>
            <h2 className="mt-14 text-[clamp(1.6rem,3vw,2rem)] font-normal">
              {c.international}
            </h2>
            {data.international.map((group) => (
              <div key={group.region || '__other'} className="mt-6">
                {/*
                  未填 region 的一組由 API 集中放在最後（docs/04 §4）。
                  一定要給它標題，否則它看起來像是上一個地區的延續。

                  ⚠️ 用 `||` 而不是 `??`：API 回的是**空字串**而非 null
                  （`RegionLabel` 是 nullable 但實際資料多為空字串），
                  `??` 接不到空字串，那組會渲染成一行空白標題。
                */}
                <p className="text-[0.78rem] font-bold uppercase tracking-[0.14em] text-[--color-brand-deep]">
                  {group.region?.trim() || c.otherRegions}
                </p>
                <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((loc) => (
                    <Card key={cardKey(loc)} loc={loc} visit={c.visit} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        <ContactCta locale={locale} title={c.ctaTitle} body={c.ctaBody} />
      </section>
    </>
  );
}

function Card({ loc, visit }: { loc: SalesLocation; visit: string }) {
  return (
    <div className="rounded-[18px] border border-[--color-hairline] p-6">
      <h3 className="text-[1.1rem] font-semibold">{loc.name}</h3>
      {loc.address && <p className="mt-2 text-[0.92rem]">{loc.address}</p>}
      {loc.note && <p className="mt-1 text-[0.88rem] text-[--color-grey]">{loc.note}</p>}
      {loc.phone && (
        <p className="mt-2 text-[0.92rem]">
          {/* 電話用 tel: —— 這頁在手機上的主要用途就是直接撥號 */}
          <a href={`tel:${loc.phone.replace(/\s+/g, '')}`}>{loc.phone}</a>
        </p>
      )}
      {loc.websiteUrl && (
        <a
          href={loc.websiteUrl}
          target="_blank"
          rel="noopener"
          className="mt-3 inline-block font-semibold text-[--color-brand-deep]"
        >
          {visit}
        </a>
      )}
    </div>
  );
}

/** 據點沒有對外的 id，用「名稱 + 國別」當 key —— 同名同國的兩筆是資料重複。 */
function cardKey(loc: SalesLocation): string {
  return `${loc.countryCode}:${loc.name}`;
}
