import { css } from '@/lib/css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, type SalesLocation } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { ContactCta } from '@/components/ContactCta';
import { PageBand } from '@/components/PageBand';
import { PageHero } from '@/components/PageHero';
import { BRAND_BANDS } from '@/lib/bands';
import { pageMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { salesLocationsSchema } from '@/lib/schema';

/** 樣式逐字取自 `mockup4/Where to Buy.dc.html`。 */
const S = {
  section: css`max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,80px) clamp(24px,5vw,64px);`,
  heading: css`color:#16333B;font-weight:400;font-size:1.6rem;border-bottom:1.5px solid #DFE9EC;padding-bottom:14px;margin-bottom:28px;`,
  grid: css`display:grid;grid-template-columns:repeat(3,1fr);gap:24px;`,
  group: css`margin-bottom:64px;`,
  region: css`color:#0092A8;font-weight:700;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;`,
  card: css`border:1px solid #DFE9EC;border-radius:18px;padding:24px 26px;`,
  cardName: css`color:#16333B;font-weight:570;font-size:1.1rem;`,
  cardNameUnderRegion: css`color:#16333B;font-weight:570;font-size:1.1rem;margin-top:4px;`,
  cardBody: css`font-size:.9rem;margin:8px 0 12px;`,
  cardPhone: css`font-size:.9rem;color:#66787F;`,
  cardLink: css`font-size:.9rem;color:#0092A8;font-weight:620;`,
  /** 空狀態是本站補的：mockup4 是靜態稿，一定有據點 */
  ctaMargin: css`margin-top:56px;`,
  empty: css`padding:64px 0;text-align:center;color:#8AA0A6;`,
} as const;

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
    visit: 'Visit website',
    empty: 'Distributor listings are being updated. Please contact us for the nearest partner.',
    ctaTitle: 'Not in your region yet?',
    ctaBody: "Contact us and we'll point you to the nearest partner — or discuss becoming one.",
  },
  'zh-TW': {
    eyebrow: '銷售據點',
    title: '尋找鄰近通路',
    lead: 'EuniceMed 產品透過各地經銷夥伴與零售通路販售，可依地區查詢。',
    domestic: '台灣',
    international: '國際經銷夥伴',
    otherRegions: '其他地區',
    visit: '前往官網',
    empty: '經銷資訊更新中，請直接與我們聯絡以取得最近的合作夥伴。',
    ctaTitle: '你的地區還沒有據點？',
    ctaBody: '與我們聯絡，我們會為你介紹最近的合作夥伴，或洽談成為經銷商。',
  },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const c = COPY[locale];

  return pageMetadata({
    locale,
    path: '/where-to-buy',
    title: c.title,
    description: c.lead,
  });
}

export default async function WhereToBuyPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const data = await api.salesLocations(locale);
  const c = COPY[locale];
  const isEmpty = data.domestic.length === 0 && data.international.length === 0;

  return (
    <>
      {/* 經銷據點清單。對 AI 搜尋特別有用 —— 「哪裡買得到」是最常被問的一類問題 */}
      <JsonLd data={salesLocationsSchema(locale, data, '/where-to-buy')} />
      <PageBand image={BRAND_BANDS.pattern08} />
      <PageHero eyebrow={c.eyebrow} title={c.title} lead={c.lead} />

      <section style={S.section}>
        {isEmpty && <p style={S.empty}>{c.empty}</p>}

        {data.domestic.length > 0 && (
          <>
            <h2 style={S.heading}>{c.domestic}</h2>
            <div style={{ ...S.grid, ...S.group }} data-r="cols-2">
              {data.domestic.map((loc) => (
                <Card key={cardKey(loc)} loc={loc} visit={c.visit} />
              ))}
            </div>
          </>
        )}

        {data.international.length > 0 && (
          <>
            <h2 style={S.heading}>{c.international}</h2>
            {/*
              mockup4 把國際經銷排成**一個** 3 欄格線，地區標籤在卡片**內**、
              名稱之上（`cardNameUnderRegion` 的 margin-top:4px 就是接在標籤後面）。
              API 回的是分好組的結構（docs/04 §4），這裡攤平回一張清單 ——
              分組只決定順序與每張卡片掛哪個標籤。

              先前是每組各自包一層 div、標籤放在卡片外、每組再開一張滿版格線，
              於是一組只有一筆時，卡片各佔一列的三分之一寬、組間也沒有間距。
            */}
            <div style={S.grid} data-r="cols-2">
              {data.international.flatMap((group) =>
                group.items.map((loc) => (
                  <Card
                    key={cardKey(loc)}
                    loc={loc}
                    visit={c.visit}
                    /*
                      未填 region 的一組由 API 集中放在最後（docs/04 §4）。
                      一定要給它標籤，否則它看起來像是上一張卡片的延續。

                      ⚠️ 用 `||` 而不是 `??`：API 回的是**空字串**而非 null
                      （`RegionLabel` 是 nullable 但實際資料多為空字串），
                      `??` 接不到空字串，那幾張卡會渲染成一行空白標籤。
                    */
                    region={group.region?.trim() || c.otherRegions}
                  />
                )),
              )}
            </div>
          </>
        )}

        <ContactCta locale={locale} title={c.ctaTitle} body={c.ctaBody} style={S.ctaMargin} />
      </section>
    </>
  );
}

/** `region` 只有國際經銷會給 —— 台灣那一組的分組標題是 h2，不重複標在卡片上。 */
function Card({ loc, visit, region }: { loc: SalesLocation; visit: string; region?: string }) {
  return (
    <div style={S.card}>
      {region && <p style={S.region}>{region}</p>}
      <h3 style={region ? S.cardNameUnderRegion : S.cardName}>{loc.name}</h3>
      {loc.address && <p style={S.cardBody}>{loc.address}</p>}
      {loc.note && <p style={S.cardBody}>{loc.note}</p>}
      {loc.phone && (
        <p style={S.cardPhone}>
          {/* 電話用 tel: —— 這頁在手機上的主要用途就是直接撥號 */}
          <a href={`tel:${loc.phone.replace(/\s+/g, '')}`}>{loc.phone}</a>
        </p>
      )}
      {loc.websiteUrl && (
        <a href={loc.websiteUrl} target="_blank" rel="noopener" style={S.cardLink}>
          {visit} →
        </a>
      )}
    </div>
  );
}

/** 據點沒有對外的 id，用「名稱 + 國別」當 key —— 同名同國的兩筆是資料重複。 */
function cardKey(loc: SalesLocation): string {
  return `${loc.countryCode}:${loc.name}`;
}
