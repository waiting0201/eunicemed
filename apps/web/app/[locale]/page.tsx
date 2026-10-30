import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type ArticleListItem, type MediaRef, type ProductListItem } from '@/lib/api';
import { formatDate } from '@/lib/date';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { section, type SectionCta } from '@/lib/page';
import { collectionColor } from '@/lib/collection';
import { css } from '@/lib/css';
import { pageMetadata } from '@/lib/seo';
import { websiteSchema } from '@/lib/schema';
import { productImageAlt } from '@/lib/alt';
import { JsonLd } from '@/components/JsonLd';
import { HeroSlider } from '@/components/HeroSlider';
import { NUMERAL, RuledSectionHeading, SectionHeading } from '@/components/SectionHeading';

/**
 * 樣式逐字取自 `mockup4/Home.dc.html`。
 * ⚠️ 每個字串都要與該檔的 `style="…"` 逐字相同 —— 改動前先改 mockup4。
 */
const S = {
  // HERO COPY
  intro: css`max-width:1180px;margin:0 auto;padding:clamp(40px,5vw,64px) clamp(24px,5vw,64px) 0;text-align:center;`,
  introEyebrow: css`color:#0092A8;font-weight:680;letter-spacing:.2em;text-transform:uppercase;font-size:clamp(.7rem,.9vw,.82rem);`,
  introTitle: css`font-weight:400;line-height:1.12;letter-spacing:-.02em;font-size:clamp(2rem,3.8vw,3.4rem);margin:14px 0 0;`,
  introHighlight: css`color:#0092A8;`,
  introLead: css`font-size:clamp(.95rem,1.3vw,1.15rem);max-width:820px;margin:18px auto 0;`,

  // 01 HERO PRODUCTS
  s01: css`max-width:1180px;margin:0 auto;padding:clamp(64px,8vw,96px) clamp(24px,5vw,64px);`,
  s01Head: css`margin-bottom:36px;`,
  s01Lead: css`max-width:72ch;margin:-12px 0 36px;`,
  s01Subtitle: css`color:#16333B;font-weight:600;margin-bottom:8px;`,
  masonry: css`columns:4;column-gap:24px;`,
  card: css`display:block;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;margin:0 0 24px;background:#FFFFFF;border:1px solid #DFE9EC;border-radius:20px;overflow:hidden;`,
  cardMedia: css`position:relative;border-radius:18px;overflow:hidden;background:#F0F6F8;`,
  cardImg: css`display:block;width:100%;height:100%;object-fit:cover;`,
  cardBody: css`padding:16px 18px 20px;`,
  cardEyebrow: css`font-weight:700;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;`,
  cardName: css`color:#16333B;font-weight:570;font-size:1.08rem;margin:4px 0 2px;`,
  cardBlurb: css`font-size:.86rem;`,
  promo: css`display:flex;align-items:center;justify-content:space-between;gap:28px;margin-top:36px;border-radius:20px;background:linear-gradient(120deg,#00B5CD,#007D95);padding:30px 36px;`,
  promoLeft: css`display:flex;align-items:center;gap:26px;`,
  promoEyebrow: css`color:rgba(255,255,255,.85);font-size:.85rem;font-weight:620;letter-spacing:.12em;text-transform:uppercase;`,
  promoTitle: css`color:#fff;font-weight:500;font-size:1.5rem;margin-top:6px;`,
  promoArrow: css`color:#fff;font-weight:620;font-size:1.4rem;flex:none;`,

  // 02 APPLICATIONS
  s02: css`position:relative;overflow:hidden;color:#fff;padding:clamp(72px,9vw,120px) 0;margin-top:clamp(48px,6vw,80px);`,
  s02Img: css`position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;`,
  s02Fallback: css`position:absolute;inset:0;background:#14262C;`,
  s02Scrim: css`position:absolute;inset:0;background:linear-gradient(90deg,rgba(9,36,45,.74) 0%,rgba(9,36,45,.5) 52%,rgba(9,36,45,.14) 100%);`,
  s02Inner: css`position:relative;max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);display:grid;grid-template-columns:.9fr 1.1fr;gap:56px;align-items:center;`,
  s02Title: css`color:#fff;font-weight:400;font-size:clamp(2rem,4vw,2.6rem);line-height:1.08;margin:8px 0 18px;`,
  s02Lead: css`color:rgba(255,255,255,.78);max-width:44ch;font-size:1.05rem;`,
  s02Cta: css`display:inline-block;margin-top:28px;border:1.5px solid rgba(255,255,255,.55);color:#fff;font-weight:620;padding:12px 28px;border-radius:999px;`,
  tiles: css`display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.14);border-radius:20px;overflow:hidden;`,
  tile: css`background:rgba(6,26,34,.72);backdrop-filter:blur(6px);padding:30px 28px;`,
  tileTitle: css`color:#fff;font-weight:570;font-size:1.15rem;margin:14px 0 4px;`,
  tileSub: css`color:rgba(255,255,255,.66);font-size:.88rem;`,

  // 03 WHY PARTNER
  s03: css`max-width:1180px;margin:0 auto;padding:clamp(64px,8vw,96px) clamp(24px,5vw,64px);`,
  s03Title: css`color:#16333B;font-weight:400;font-size:clamp(2rem,4vw,2.6rem);margin:8px 0 44px;`,
  s03Lead: css`max-width:60ch;margin:-28px 0 44px;`,
  s03Grid: css`display:grid;grid-template-columns:repeat(4,1fr);gap:32px;`,
  s03Item: css`border-top:2px solid #00B5CD;padding-top:20px;`,
  s03ItemTitle: css`color:#16333B;font-weight:570;font-size:1.2rem;margin-bottom:8px;`,
  s03ItemBody: css`font-size:.92rem;`,
  s03Cta: css`display:inline-block;margin-top:44px;background:#16333B;color:#fff;font-weight:620;padding:13px 30px;border-radius:999px;`,

  // 04 TESTIMONIAL
  s04: css`background:#F5FAFB;padding:clamp(64px,8vw,96px) 0;`,
  s04Inner: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);display:grid;grid-template-columns:1.02fr .98fr;gap:clamp(40px,6vw,72px);align-items:center;`,
  s04Title: css`color:#16333B;font-weight:400;font-size:clamp(2rem,4vw,2.6rem);line-height:1.08;margin:8px 0 0;`,
  s04Quote: css`margin-top:36px;color:#16333B;font-weight:440;font-stretch:108%;font-size:clamp(1.5rem,2.5vw,2.05rem);line-height:1.3;letter-spacing:-.01em;max-width:20ch;`,
  s04Attr: css`margin-top:16px;font-size:.9rem;color:#44565D;font-weight:600;`,
  s04AttrRegion: css`color:#66787F;font-weight:500;`,
  s04Mini: css`margin-top:38px;border-top:1px solid #DFE9EC;`,
  s04MiniRow: css`display:flex;align-items:baseline;justify-content:space-between;gap:20px;padding:16px 0;border-bottom:1px solid #DFE9EC;`,
  s04MiniQuote: css`color:#16333B;font-weight:530;font-size:.98rem;`,
  s04MiniSource: css`color:#66787F;font-size:.75rem;font-weight:650;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;`,
  s04Media: css`position:relative;`,
  s04Frame: css`position:relative;aspect-ratio:16/10;border-radius:24px;overflow:hidden;box-shadow:0 30px 60px rgba(10,60,72,.16);background:#F0F6F8;display:flex;align-items:center;justify-content:center;`,
  s04PosterImg: css`display:block;width:100%;height:100%;object-fit:cover;`,
  s04PlayWrap: css`position:relative;display:flex;align-items:center;justify-content:center;width:64px;height:64px;`,
  s04Ripple: css`position:absolute;inset:0;border-radius:50%;background:rgba(0,181,205,.4);animation:ripple 2.8s ease-out infinite;`,
  s04Play: css`position:relative;display:flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:#00B5CD;color:#fff;box-shadow:0 14px 30px rgba(10,60,72,.16);`,
  s04PlayIcon: css`margin-left:3px;`,
  s04Chip: css`position:absolute;bottom:28px;left:-22px;display:inline-flex;align-items:center;gap:9px;background:rgba(6,26,34,.85);backdrop-filter:blur(6px);border:1px solid #DFE9EC;border-radius:999px;padding:9px 16px;font-size:.82rem;font-weight:620;color:#fff;box-shadow:0 10px 26px rgba(10,60,72,.14);animation:chipFloat 6s ease-in-out infinite;`,
  s04ChipDot: css`width:9px;height:9px;border-radius:50%;background:#0092A8;box-shadow:0 0 0 4px rgba(0,181,205,.18);`,

  // 05 LATEST NEWS
  s05: css`max-width:1180px;margin:0 auto;padding:clamp(64px,8vw,96px) clamp(24px,5vw,64px);`,
  s05Head: css`margin-bottom:12px;`,
  s05All: css`color:#0092A8;font-weight:620;`,
  row: css`display:flex;align-items:center;gap:24px;padding:24px 0;border-bottom:1px solid #DFE9EC;`,
  rowDate: css`color:#66787F;font-size:.85rem;width:90px;flex:0 0 auto;`,
  rowTitle: css`color:#16333B;font-weight:570;font-size:1.3rem;flex:1;`,
  rowRead: css`color:#0092A8;font-weight:620;`,
} as const;

type Params = { locale: string };

type HeroSliderSection = {
  slides?: { image?: MediaRef; alt?: string }[];
  intervalSeconds?: number;
};
type FeaturedSection = {
  promo?: { eyebrow?: string; title?: string; link?: SectionCta };
};
type BodyPartBandSection = { background?: MediaRef };
type TestimonialSection = {
  title?: string;
  quote?: string;
  attribution?: { name?: string; region?: string };
  miniQuotes?: { quote?: string; source?: string }[];
  video?: { poster?: MediaRef; source?: string };
  floatingChip?: string;
};

/** §02 的一格。`icon` 對應 {@link TileIcon} 的圖形，`href` 不含語系前綴。 */
type Tile = { icon: string; title: string; subtitle: string; href: string };

/**
 * 版面文案 —— **刻意寫死，不走 CMS**（決議見 docs/15-cms-scope.md）。
 *
 * <p>
 * HERO 那三行原本是 `home.heroIntro` 區段，2026-08-28 移出；其餘四段（01 標題、
 * 02 整段、03 整段、05 標題）這次一併移出。判準都一樣：這些字與版型綁死，
 * 改它要動的是 mockup4 而不是後台。留在 CMS 只是給了它走鐘的機會 ——
 * heroIntro 被填成舊站文案、`whyPartner` 被填成 Company Profile 的核心價值，
 * 都已經各發生過一次。
 * </p>
 *
 * <p>
 * 英文逐字取自 `mockup4/Home.dc.html`。`**…**` 是高亮標記，
 * 由 {@link Highlight} 轉成品牌青。品牌符號（`Support feels personal`、`OEM / ODM`、
 * `ISO 13485`、`CE`）維持英文，其餘翻譯（CLAUDE.md §5.1）。
 * </p>
 *
 * <p>
 * ⚠️ **連結一律在渲染時就地組 `/${locale}/…`，不存進這張表。**
 * 這正是先前的災情：URL 標了 `x-localeInvariant` 被當成跨語系共用欄位，
 * 中文的內容匯入一跑就把英文版的連結蓋成 `/zh-TW/…`，
 * 於是英文首頁的每個 CTA 都跳到中文頁。
 * </p>
 */
const COPY: Record<
  Locale,
  {
    /** SEO title 與 description 由文案定稿，刻意與 H1 不同字（lib/seo.ts `absoluteTitle`） */
    meta: { title: string; description: string };
    hero: { eyebrow: string; title: string; lead: string };
    featured: { title: string; subtitle: string; lead: string };
    bodyPart: { title: [string, string]; lead: string; cta: string; tiles: Tile[] };
    whyPartner: { title: string; lead: string; items: { title: string; body: string }[]; cta: string };
    latestNews: { title: string; allLink: string; read: string };
  }
> = {
  en: {
    meta: {
      title: 'Orthopedic Braces & Compression Stockings | EuniceMed',
      description:
        'Premium Taiwan-made orthopedic braces, compression stockings and footcare by ' +
        'Comfort Plus Corporation. ISO 13485, CE marked, FDA registered. OEM/ODM.',
    },
    hero: {
      // 這一行是 H1；下面的大標只做視覺樣式（文案定稿的 SEO 設定）
      eyebrow: 'EuniceMed · Taiwan-Made Medical Braces & Compression Stockings',
      title: 'Support Feels **Personal**.',
      lead:
        'EuniceMed is a premium Taiwan-made medical braces brand by Comfort Plus Corporation, ' +
        'designing orthopedic braces, medical compression stockings and silicone footcare — ' +
        'combining clinical expertise, lasting comfort and dependable quality.',
    },
    featured: {
      title: 'Hero Products',
      subtitle: 'Solutions Designed Around Real Life. All in One Premium Promise.',
      lead:
        'From knee braces and ankle braces to medical compression stockings and orthotic insoles, ' +
        'every EuniceMed support is designed for precision, all-day comfort and long-term reliability.',
    },
    bodyPart: {
      title: ['Find Support by Body Part', '& Care Need'],
      lead:
        'Tap where it hurts or tires — knee, ankle & foot, back & waist — or explore home care, ' +
        'long-term care and post-surgery rehabilitation solutions.',
      cta: 'Explore applications →',
      tiles: [
        { icon: 'knee', title: 'Knee', subtitle: 'Knee braces for sports & stability', href: '/applications/knee' },
        { icon: 'ankle-foot', title: 'Ankle & Foot', subtitle: 'Ankle braces, insoles & plantar support', href: '/applications/ankle' },
        { icon: 'back', title: 'Back & Waist', subtitle: 'Lumbar support & posture', href: '/applications/back' },
        { icon: 'special-care', title: 'Special care', subtitle: 'Elderly care · bunion · post-op', href: '/applications' },
      ],
    },
    whyPartner: {
      title: 'A Taiwan OEM/ODM Partner Your Business Can Count On',
      lead:
        'Founded in 2008, Comfort Plus Corporation — the maker of EuniceMed — is an ISO 13485 ' +
        'certified Taiwan medical device manufacturer working with distributors in 18 countries.',
      items: [
        { title: 'Certified quality', body: 'ISO 13485 system with CE marked and FDA registered product lines.' },
        { title: 'OEM / ODM flexibility', body: 'Private label, OEM and ODM — from design and sampling to certification support.' },
        { title: 'Made in Taiwan', body: 'In-house manufacturing, 11 dedicated QC staff and full traceability.' },
        { title: 'Comfort-first R&D', body: 'Premium materials engineered for all-day wear.' },
      ],
      cta: 'Become a partner',
    },
    latestNews: { title: 'Latest News', allLink: 'All news →', read: 'Read →' },
  },
  'zh-TW': {
    meta: {
      title: '台灣製骨科護具與醫療壓力襪｜EuniceMed 康譜',
      description:
        'EuniceMed 康譜是康譜企業的台灣製高階護具品牌，提供骨科護具、醫療壓力襪與足部照護，' +
        '通過 ISO 13485 與 CE 認證，並完成美國 FDA 登錄。',
    },
    hero: {
      eyebrow: 'EuniceMed 康譜｜台灣製醫療護具與壓力襪',
      title: 'Support Feels **Personal**.',
      lead:
        'EuniceMed 康譜是康譜企業（Comfort Plus）旗下的台灣製高階醫療護具品牌，' +
        '專注設計骨科護具、醫療壓力襪與矽膠足部照護產品，融合臨床專業，帶來持久的舒適與可靠的品質。',
    },
    featured: {
      title: '明星商品',
      subtitle: '從日常生活出發的支撐方案。All in One Premium Promise.',
      lead:
        '從護膝、護踝，到醫療壓力襪與機能鞋墊，每一件 EuniceMed 產品，' +
        '都為精準支撐、全天舒適與長久可靠而設計。',
    },
    bodyPart: {
      title: ['依部位與照護需求，', '找到合適的支撐'],
      lead:
        '請點選感到痠痛或疲憊的部位：膝部、足踝、腰背；' +
        '也可依居家照護、長期照護與術後復健，查詢合適的照護方案。',
      cta: '查看應用方案 →',
      tiles: [
        { icon: 'knee', title: '膝部', subtitle: '運動與穩定用護膝', href: '/applications/knee' },
        { icon: 'ankle-foot', title: '足踝', subtitle: '護踝、鞋墊與足底支撐', href: '/applications/ankle' },
        { icon: 'back', title: '腰背', subtitle: '腰部支撐與姿勢', href: '/applications/back' },
        { icon: 'special-care', title: '特殊照護', subtitle: '長者照護・拇趾外翻・術後', href: '/applications' },
      ],
    },
    whyPartner: {
      title: '值得您信賴的台灣 OEM／ODM 夥伴',
      lead:
        'EuniceMed 由康譜企業製造。康譜企業成立於 2008 年，' +
        '是通過 ISO 13485 認證的台灣醫療器材製造商，目前與 18 國經銷商合作。',
      items: [
        { title: '品質認證', body: 'ISO 13485 品質系統，產品線具 CE 標誌，並完成美國 FDA 登錄。' },
        { title: 'OEM／ODM 彈性', body: '貼牌、OEM 與 ODM 皆可承接，從設計、打樣到認證協助。' },
        { title: '台灣製造', body: '自有工廠生產，11 位專職品管，全程可追溯。' },
        { title: '舒適優先的研發', body: '嚴選材料，專為全天穿戴而設計。' },
      ],
      cta: '成為合作夥伴',
    },
    latestNews: { title: '最新消息', allLink: '所有消息 →', read: '閱讀全文 →' },
  },
};


export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};


  return pageMetadata({
    locale,
    title: COPY[locale].meta.title,
    absoluteTitle: true,
    description: COPY[locale].meta.description,
  });
}

export default async function HomePage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // 三個來源並行：區段內容、精選產品、最新消息。
  // 產品與文章是**動態取用**（docs/09 §2）—— 後台不逐格挑，改 FeaturedSortOrder 即可。
  const [page, featured, news] = await Promise.all([
    api.page(locale, 'home'),
    api.products(locale, { featured: 'true', pageSize: '8' }),
    api.articles(locale, 'news'),
  ]);

  if (!page) notFound();

  const copy = COPY[locale];
  const slider = section<HeroSliderSection>(page, 'heroSlider');
  const promo = section<FeaturedSection>(page, 'featuredProducts')?.promo;
  const band = section<BodyPartBandSection>(page, 'bodyPartBand');
  const testimonial = section<TestimonialSection>(page, 'testimonial');

  let n = 0;
  const next = () => ++n;

  return (
    <>
      <JsonLd data={websiteSchema(locale)} />
      {slider?.slides && (
        <HeroSlider slides={slider.slides} intervalSeconds={slider.intervalSeconds} />
      )}

      {/* HERO COPY —— 只有上方留白：下方的留白由「01 精選產品」自己的 padding 給
          （mockup4 的 `padding: … 0`），兩段各自負責的話會疊成兩倍 */}
      <section style={S.intro}>
        {/* H1 是眉標這一行（SEO 關鍵字）；品牌句大標只做視覺樣式，不是標題元素 */}
        <h1 style={S.introEyebrow}>{copy.hero.eyebrow}</h1>
        <p style={S.introTitle}>
          <Highlight text={copy.hero.title} />
        </p>
        <p style={S.introLead}>{copy.hero.lead}</p>
      </section>

      {/* 01 精選產品 —— Pinterest 式瀑布流 */}
      {featured.items.length > 0 && (
        <section style={S.s01}>
          <RuledSectionHeading index={next()} title={copy.featured.title} style={S.s01Head} />
          <div style={S.s01Lead}>
            <p style={S.s01Subtitle}>{copy.featured.subtitle}</p>
            <p>{copy.featured.lead}</p>
          </div>

          <FeaturedMasonry items={featured.items} locale={locale} />

          {promo && (
            <PromoBand promo={promo}>
              <div style={S.promoLeft}>
                <div>
                  {promo.eyebrow && <p style={S.promoEyebrow}>{promo.eyebrow}</p>}
                  {promo.title && <h3 style={S.promoTitle}>{promo.title}</h3>}
                </div>
              </div>
              <span style={S.promoArrow}>&rarr;</span>
            </PromoBand>
          )}
        </section>
      )}

      {/* 02 依部位找支撐 —— 文案是常數，CMS 只管背景圖，所以整段無條件渲染 */}
      <section style={S.s02}>
          {band?.background && (
            <>
              <img
                src={band.background.url}
                srcSet={srcSetOf(band.background)}
                sizes="100vw"
                alt=""
                loading="lazy"
                decoding="async"
                style={S.s02Img}
              />
              {/* 由左至右的深青遮罩：左側文字讀得到、右側照片保持乾淨（DESIGN.md） */}
              <div style={S.s02Scrim} />
            </>
          )}
          {/* 編輯者沒放背景圖時的底色。mockup4 一定有圖，這裡取全站唯一的深色面 */}
          {!band?.background && <div style={S.s02Fallback} />}

          <div style={S.s02Inner}>
            <div>
              <span style={NUMERAL.onPhoto}>{String(next()).padStart(2, '0')}</span>
              <h2 style={S.s02Title}>
                {copy.bodyPart.title[0]}
                <br />
                {copy.bodyPart.title[1]}
              </h2>
              <p style={S.s02Lead}>{copy.bodyPart.lead}</p>
              <CtaLink
                cta={{ label: copy.bodyPart.cta, url: `/${locale}/applications` }}
                variant="onDarkOutline"
              />
            </div>

            {/* 四格是**一塊**面板：1px 的格線由容器底色透出來，不是各自獨立的卡片 */}
            <div style={S.tiles} data-r="cols-2">
              {copy.bodyPart.tiles.map((tile) => (
                <TileLink key={tile.icon} tile={tile} locale={locale} />
              ))}
            </div>
          </div>
        </section>

      {/* 03 合作優勢 */}
      <section style={S.s03}>
        <SectionHeading index={next()} title={copy.whyPartner.title} titleStyle={S.s03Title} />
        <p style={S.s03Lead}>{copy.whyPartner.lead}</p>
        {/* 每欄頂上一條 2px 品牌青（mockup4） */}
        <div style={S.s03Grid} data-r="cols-2">
          {copy.whyPartner.items.map((item) => (
            <div key={item.title} style={S.s03Item}>
              <h3 style={S.s03ItemTitle}>{item.title}</h3>
              <p style={S.s03ItemBody}>{item.body}</p>
            </div>
          ))}
        </div>
        <CtaLink
          cta={{ label: copy.whyPartner.cta, url: `/${locale}/partnership` }}
          variant="ink"
        />
      </section>

      {/* 04 客戶見證 */}
      {testimonial && (
        <section style={S.s04}>
          <div style={S.s04Inner}>
            <div>
              <SectionHeading
                index={next()}
                title={testimonial.title ?? ''}
                numeralStyle={NUMERAL.accent}
                titleStyle={S.s04Title}
              />

              {testimonial.quote && <blockquote style={S.s04Quote}>{testimonial.quote}</blockquote>}
              {testimonial.attribution?.name && (
                <p style={S.s04Attr}>
                  {testimonial.attribution.name}
                  {testimonial.attribution.region && (
                    <span style={S.s04AttrRegion}> · {testimonial.attribution.region}</span>
                  )}
                </p>
              )}

              {/* 短引言是一張細線清單，不是卡片（mockup4） */}
              {testimonial.miniQuotes && testimonial.miniQuotes.length > 0 && (
                <div style={S.s04Mini}>
                  {testimonial.miniQuotes.map((m, i) => (
                    <div key={m.source ?? i} style={S.s04MiniRow}>
                      {m.quote && <p style={S.s04MiniQuote}>{m.quote}</p>}
                      {m.source && <span style={S.s04MiniSource}>{m.source}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={S.s04Media}>
              <div style={S.s04Frame}>
                {testimonial.video?.poster && (
                  <img
                    src={testimonial.video.poster.url}
                    srcSet={srcSetOf(testimonial.video.poster)}
                    sizes="(max-width: 1024px) 100vw, 560px"
                    alt={testimonial.video.poster.alt ?? ''}
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={500}
                    style={S.s04PosterImg}
                  />
                )}
                {/* 播放鈕。影片來源未定（CLAUDE.md §7），先只放記號不接播放器。
                    外圈是 mockup4 的漣漪環，`prefers-reduced-motion` 時由 globals.css 關掉 */}
                <span style={S.s04PlayWrap}>
                  <span style={S.s04Ripple} aria-hidden />
                  <span style={S.s04Play}>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden
                      style={S.s04PlayIcon}
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
              </div>

              {/* 浮出左緣的深色標籤（mockup4：`left:-22px`） */}
              {testimonial.floatingChip && (
                <span style={{ ...S.s04Chip, WebkitBackdropFilter: 'blur(6px)' }}>
                  <span style={S.s04ChipDot} />
                  {testimonial.floatingChip}
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 05 最新消息 */}
      {news.items.length > 0 && (
        <section style={S.s05}>
          <RuledSectionHeading
            index={next()}
            title={copy.latestNews.title}
            action={
              <CtaLink
                cta={{ label: copy.latestNews.allLink, url: `/${locale}/news` }}
                variant="text"
              />
            }
            style={S.s05Head}
          />
          {news.items.slice(0, 3).map((item) => (
            <NewsRow key={item.slug} item={item} locale={locale} />
          ))}
        </section>
      )}
    </>
  );
}

/**
 * 精選產品瀑布流。**版位比例輪替 1:1 → 4:5 → 5:4**，與產品、語系、文案長短都無關
 * （docs/09 §2 的 2026-08-14 決議）。八格共用同一張 square 主圖，靠 object-cover 裁切。
 *
 * <p>
 * 用 CSS multi-column 而非 grid：欄高由瀏覽器自動平衡，筆數不足 8 時不會留空位。
 * 閱讀順序是逐欄由上而下，DOM 順序即 `FeaturedSortOrder`，爬蟲與螢幕閱讀器拿到的順序正確。
 * </p>
 */
const RATIOS = [css`aspect-ratio:1/1;`, css`aspect-ratio:4/5;`, css`aspect-ratio:5/4;`] as const;

function FeaturedMasonry({ items, locale }: { items: ProductListItem[]; locale: Locale }) {
  return (
    <div style={S.masonry}>
      {items.map((p, i) => (
        <Link key={p.slug} href={p.url} style={S.card} data-hover="lift-4">
          <div style={{ ...S.cardMedia, ...RATIOS[i % RATIOS.length] }}>
            {p.image && (
              <img
                src={p.image.url}
                srcSet={srcSetOf(p.image)}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 245px"
                alt={productImageAlt(p.name, locale)}
                loading="lazy"
                decoding="async"
                width={1200}
                height={1200}
                style={S.cardImg}
              />
            )}
          </div>
          <div style={S.cardBody}>
            {/* 眉標是品類（子分類名稱）；顏色仍依系列，保留支撐強度的色碼 */}
            {p.subCategory && (
              <span style={{ ...S.cardEyebrow, ...collectionColor(p.collection?.slug) }}>
                {p.subCategory.name}
              </span>
            )}
            <h3 style={S.cardName}>{p.name}</h3>
            {p.featuredBlurb && <p style={S.cardBlurb}>{p.featuredBlurb}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}

/** 首頁 §05 的一列：固定寬度的日期、佔滿剩餘寬度的標題、右端的 Read →（mockup4）。 */
function NewsRow({ item, locale }: { item: ArticleListItem; locale: Locale }) {
  return (
    <Link href={item.url} style={S.row}>
      <span style={S.rowDate}>
        {item.publishedAt ? formatDate(item.publishedAt, locale).slice(0, 9) : ''}
      </span>
      <h3 style={S.rowTitle}>{item.title}</h3>
      <span style={S.rowRead}>{COPY[locale].latestNews.read}</span>
    </Link>
  );
}

function TileLink({ tile, locale }: { tile: Tile; locale: Locale }) {
  // 沒有自己的圓角與外框：格線是容器透出來的 1px gap（mockup4）
  const style = { ...S.tile, WebkitBackdropFilter: 'blur(6px)' };

  return (
    <Link href={`/${locale}${tile.href}`} style={style}>
      <TileIcon name={tile.icon} />
      <h3 style={S.tileTitle}>{tile.title}</h3>
      <p style={S.tileSub}>{tile.subtitle}</p>
    </Link>
  );
}

/**
 * 圖示對照表。`icon` 是 schema 的固定字彙（enum，寫入時已驗過），
 * **新增一個值必須同時在這裡補圖形**，否則格子會沒有圖示。
 */
/**
 * 全型錄卡。**整張卡就是連結**（mockup4 的 `<a>`），右端的 `→` 只是卡內的字符 ——
 * 先前把箭頭做成獨立連結，等於同一張卡有兩個點擊目標與兩個 tab stop。
 */
function PromoBand({
  promo,
  children,
}: {
  promo: NonNullable<FeaturedSection['promo']>;
  children: React.ReactNode;
}) {
  const cta = promo.link;
  if (!cta?.url) return <div style={S.promo}>{children}</div>;

  return cta.external ? (
    <a
      href={cta.url}
      target="_blank"
      rel="noopener"
      aria-label={cta.label ?? undefined}
      style={S.promo}
      data-hover="lift-3"
    >
      {children}
    </a>
  ) : (
    <Link href={cta.url} aria-label={cta.label ?? undefined} style={S.promo} data-hover="lift-3">
      {children}
    </Link>
  );
}

/** 四個部位圖示，取自品牌方提供的 SVG（viewBox 40×40，填色而非描邊）。 */
function TileIcon({ name }: { name?: string }) {
  const paths: Record<string, React.ReactNode> = {
    knee: (
      <>
        <path d="M10.37,17.01l-.35-.21c-1.79-1.08-3.44-2.08-3.46-2.09-.17-.1-.23-.33-.12-.5.1-.17.33-.23.5-.12.02,0,1.47.88,3.11,1.88,2.05-4.35,4.49-6.65,6.19-7.81,1.11-.76,2.04-1.15,2.66-1.35-1.24-.97-2.12-1.62-2.13-1.62-.16-.12-.2-.35-.08-.51.12-.16.35-.2.51-.08.01,0,1.18.87,2.73,2.09l.82.65h-1.02c-.48.08-1.71.47-3.13,1.45-1.66,1.15-4.06,3.44-6.07,7.85l-.17.37Z" />
        <path d="M26.97,35.69s-.02,0-.03,0c-.2-.02-.35-.19-.33-.39.09-1.09.17-2.07.24-2.93.06-.81.12-1.49.17-2.05-3.49.63-6.7.2-8.81-.28-1.64-.37-2.86-.83-3.5-1.09-.1,1.58.07,3.23.26,5.12l.03.33c.02.2-.13.38-.33.4-.2.02-.38-.13-.4-.33l-.03-.33c-.21-2.13-.39-3.96-.22-5.77l.05-.52.47.22s1.51.72,3.82,1.24c2.14.49,5.43.91,8.98.18l.49-.1-.05.49c-.06.63-.13,1.47-.21,2.52-.07.86-.14,1.84-.24,2.94-.02.19-.18.33-.36.33Z" />
        <path d="M23.37,30.63c-1.52,0-3.26-.16-5.16-.59-2.39-.55-3.91-1.27-3.98-1.3l-.23-.11.02-.25c.15-1.49.52-2.82,1.18-4.17,1.54-3.16.09-4.12-.77-4.7-.42-.28-1.95-1.22-4.42-2.72l-.28-.17.13-.29c2.09-4.59,4.61-6.98,6.36-8.18,2.01-1.38,3.45-1.54,3.46-1.54h.13l.1.08c3.12,2.46,7.08,5.82,8.21,7.83h0c1.64,2.92,1.21,5.19.72,7.81-.05.28-.11.58-.16.88-.04.21-.07.4-.11.58-.34,1.85-.41,2.23-.8,6.13l-.03.27-.26.05c-1.06.22-2.46.41-4.12.41ZM14.77,28.19c.51.22,1.8.73,3.59,1.14,2.08.47,5.27.89,8.72.23.37-3.67.45-4.09.78-5.91.03-.18.07-.37.1-.58.05-.3.11-.6.16-.88.49-2.58.88-4.63-.64-7.32h0c-.82-1.47-3.62-4.13-7.89-7.51-.39.09-1.55.42-3,1.42-1.62,1.12-3.95,3.34-5.93,7.56,2.34,1.42,3.75,2.29,4.16,2.57.43.28,1.22.81,1.58,1.76.39,1.03.21,2.29-.56,3.86-.58,1.19-.93,2.36-1.08,3.66Z" />
        <path d="M13.7,18.98s-.06,0-.08,0c-.2-.05-.32-.24-.27-.44.43-1.83,1.19-3.46,2.25-4.86.85-1.12,1.9-2.08,3.11-2.87,2.06-1.34,3.88-1.7,3.95-1.72.2-.04.39.09.43.29.04.2-.09.39-.29.43h0s-1.77.35-3.72,1.63c-1.14.74-2.12,1.65-2.91,2.7-.99,1.31-1.7,2.85-2.11,4.57-.04.17-.19.28-.35.28Z" />
        <path d="M23.81,28.91c-2.49,0-4.48-.34-5.87-.68-2.21-.55-3.39-1.23-3.44-1.26-.17-.1-.23-.32-.13-.5.1-.17.32-.23.5-.13.02.01,1.17.67,3.28,1.19,1.96.48,5.17.95,9.34.41.2-.03.38.11.41.31.03.2-.11.38-.31.41-1.36.18-2.62.25-3.77.25Z" />
      </>
    ),
    'ankle-foot': (
      <>
        <path d="M27.96,31.85c-.45,0-.95-.08-1.51-.32-1.99-.84-3.34-1.36-5.79-1.4-.9-.02-1.99.29-3.04.58-1.75.49-3.56,1-4.7.05-.76-.63-1.11-1.21-1.16-1.95-.05-.68.17-1.48.47-2.57.1-.37.21-.79.33-1.25.92-3.65.67-8.02-.71-12-1.59-4.62-1.53-6.95-1.53-7.05,0-.2.17-.36.38-.35.2,0,.36.18.35.38h0c-.02.78.26,3.21,1.49,6.79,1.42,4.11,1.68,8.63.72,12.41-.12.47-.23.89-.34,1.26-.58,2.13-.75,2.77.45,3.77.85.7,2.4.27,4.04-.19,1.1-.31,2.24-.63,3.25-.61,2.53.04,3.98.58,6.06,1.46,1.01.43,1.74.25,2.52.06.71-.17,1.44-.35,2.34-.07.85.27,1.72.16,2.21-.27.19-.17.39-.45.31-.86-.09-.47-.14-.47-.87-.51-.47-.03-1.11-.06-2-.28-1.39-.34-3.77-1.83-5.07-2.69-1.81-1.2-3.47-2.45-3.86-2.92-.77-.94-2.04-3.29-1.88-8.55.16-5.16.44-9,.44-9.04.01-.2.19-.35.39-.34.2.01.35.19.34.39,0,.04-.28,3.87-.44,9.01-.05,1.73,0,5.99,1.72,8.07.29.36,1.85,1.56,3.69,2.78,2.14,1.42,3.91,2.36,4.84,2.59.82.2,1.42.24,1.86.26.78.04,1.34.08,1.55,1.1.11.57-.08,1.14-.54,1.55-.69.61-1.8.78-2.91.42-.7-.22-1.28-.08-1.94.08-.45.11-.93.23-1.47.23Z" />
        <path d="M16.5,26.63s-.08,0-.12-.02c-.63-.23-1.07-.61-1.31-1.13-.42-.94-.02-1.98,0-2.02.07-.19.29-.28.47-.2.19.07.28.28.2.47h0s-.31.81,0,1.46c.16.34.45.59.89.74.19.07.29.28.22.47-.05.15-.19.24-.34.24Z" />
        <path d="M9.37,26.93c-.07,0-.14-.02-.2-.06-.17-.11-.22-.33-.11-.5,1.4-2.15,1.68-4.45,1.67-6-.01-1.69-.36-2.89-.37-2.9-.06-.19.05-.4.24-.45.19-.06.4.05.45.24.02.05.38,1.29.4,3.08.01,1.66-.28,4.12-1.78,6.42-.07.11-.19.17-.31.17Z" />
        <path d="M8,25.92c-.07,0-.14-.02-.2-.06-.17-.11-.21-.34-.1-.51,2.35-3.45,1.19-7.13,1.18-7.17-.06-.19.04-.4.23-.46.19-.06.4.04.46.23.01.04.33,1.03.34,2.49,0,1.34-.27,3.36-1.6,5.31-.07.1-.18.16-.3.16Z" />
        <path d="M27.54,24.24s-.06,0-.09-.01c-1.99-.52-3.45-2.05-4.2-4.44-.56-1.76-.54-3.35-.54-3.42,0-.2.17-.36.36-.36,0,0,0,0,0,0,.2,0,.36.17.36.37h0s-.02,1.55.51,3.2c.68,2.15,1.92,3.47,3.68,3.93.19.05.31.25.26.44-.04.16-.19.27-.35.27Z" />
      </>
    ),
    back: (
      <>
        <path d="M28.69,36.53c-.07,0-.14-.02-.2-.06-.17-.1-.24-.31-.16-.49.01-.08.06-.83-1.38-3.17-1.88-3.06-3.15-5.99-3.79-8.7-.66-2.78-1.08-10.57-1.1-10.9-.01-.22.16-.41.37-.42.22-.01.41.16.42.37,0,.08.44,8.05,1.08,10.76.62,2.63,1.86,5.48,3.7,8.47.57.93,1.86,3.19,1.41,3.94-.07.12-.21.19-.34.19ZM28.35,35.94s0,0,0,0h0ZM28.35,35.93s0,0,0,0c0,0,0,0,0,0ZM28.35,35.93s0,0,0,0c0,0,0,0,0,0Z" />
        <path d="M31.2,36.12c-.16,0-.3-.09-.37-.25-.94-2.3-1.61-5.08-2.15-7.31-.38-1.58-.71-2.94-1.03-3.74-.8-1.99-1.07-2.94-1.04-8.17,0-.97.02-1.82.03-2.57.06-3.16.08-4.47-.73-5.51-.53-.68-1.33-.89-2.12-1.1-.72-.19-1.39-.36-1.83-.88-.42-.5-.52-1.24-.3-2.21.15-.67.41-1.21.42-1.23.09-.2.33-.28.53-.19.2.09.28.33.19.53h0c-.22.48-.75,1.97-.23,2.59.28.33.81.47,1.42.63.87.23,1.85.48,2.54,1.38.98,1.27.95,2.75.89,6.01-.01.75-.03,1.6-.03,2.56-.03,5.09.21,5.95.98,7.87.34.86.68,2.24,1.07,3.85.54,2.21,1.2,4.96,2.12,7.2.08.2-.01.43-.22.52-.05.02-.1.03-.15.03Z" />
        <path d="M12.61,31.5c-.14,0-.28-.08-.35-.22-.07-.15-1.83-3.61-2.07-7.84-.17-3.04.09-5.92.34-8.7.1-1.09.19-2.13.26-3.16.19-2.88,1.76-3.72,3.28-4.53.57-.31,1.16-.62,1.69-1.05,1.06-.85,1.39-2.12,1.48-3.02.02-.22.22-.38.43-.35.22.02.38.22.35.43-.11,1.06-.5,2.53-1.77,3.56-.59.47-1.21.81-1.81,1.13-1.51.81-2.7,1.45-2.86,3.88-.07,1.04-.16,2.08-.26,3.18-.25,2.75-.5,5.6-.33,8.58.23,4.06,1.96,7.49,1.98,7.52.1.19.02.43-.17.53-.06.03-.12.04-.18.04Z" />
        <path d="M11.59,35.4s0,0,0,0c-.22,0-.39-.18-.39-.4.02-1.39.32-2,.91-3.23.19-.4.41-.86.68-1.45.3-.68.69-1.37,1.06-2.03.94-1.68,1.91-3.42,1.54-5.04-.55-2.39-3.23-9.64-3.26-9.71-.08-.21.03-.43.23-.51.21-.08.43.03.51.23.11.3,2.72,7.37,3.29,9.81.44,1.92-.6,3.79-1.62,5.61-.36.65-.74,1.32-1.03,1.97-.27.6-.5,1.08-.69,1.47-.57,1.19-.81,1.68-.83,2.9,0,.22-.18.39-.4.39Z" />
        <path d="M17.26,8.96c-.07,0-.14,0-.21,0-.8-.06-1.38-.33-1.72-.81-.49-.67-.29-1.48-.28-1.52.05-.21.27-.34.48-.29.21.05.34.27.29.48,0,.01-.11.5.16.86.2.28.58.44,1.13.48.77.06,1.15-.3,1.69-.8.69-.64,1.55-1.44,3.44-1.44.01,0,.03,0,.04,0,.22,0,.4.18.39.4,0,.22-.18.39-.4.39-.01,0-.03,0-.04,0-1.59,0-2.26.62-2.9,1.23-.54.5-1.1,1.02-2.07,1.02Z" />
        <path d="M22.61,16.1s-.02,0-.03,0c-1.71-.11-2.92-.66-3.61-1.62-.68-.95-.8-2.24-.36-3.84.38-1.39,1.25-2.55,2.52-3.37.95-.61,1.79-.82,1.82-.83.21-.05.43.08.48.29.05.21-.08.43-.29.48h0s-.76.19-1.6.74c-1.1.72-1.83,1.7-2.16,2.9-.37,1.36-.29,2.42.24,3.17.54.76,1.56,1.2,3.02,1.29.22.01.38.2.37.42-.01.21-.19.37-.4.37Z" />
        <path d="M13.32,16.1c-.15,0-.29-.08-.36-.23-.09-.2,0-.43.19-.53,1.2-.56,1.67-1.99,1.4-4.26-.21-1.79-.83-3.43-.83-3.45-.08-.2.03-.43.23-.51.2-.08.43.03.51.23.11.29,2.62,7.04-.97,8.71-.05.03-.11.04-.17.04Z" />
        <path d="M22.98,20.46s-.05,0-.08,0c-4.94-.98-7.91-.02-7.94-.01-.21.07-.43-.04-.5-.25-.07-.21.04-.43.25-.5.13-.04,3.18-1.04,8.35-.01.21.04.35.25.31.47-.04.19-.2.32-.39.32Z" />
        <path d="M17.66,28.55c-.06,0-.12-.01-.18-.04-.2-.1-.27-.34-.18-.53,1.37-2.73.18-6.69.17-6.73-.06-.21.05-.43.26-.5.21-.06.43.05.5.26.01.04.33,1.08.47,2.5.18,1.92-.05,3.55-.69,4.82-.07.14-.21.22-.35.22Z" />
        <path d="M20.04,30.01c-.2,0-.41,0-.62,0-3.53-.07-5.42-.96-5.5-1-.2-.1-.28-.33-.18-.53.1-.2.33-.28.53-.19.01,0,.47.22,1.32.44.79.2,2.11.45,3.85.49,3.39.07,5.84-.47,5.86-.47.21-.05.43.09.47.3.05.21-.09.43-.3.47-.1.02-2.28.5-5.43.5Z" />
        <path d="M26.41,36.53s-.04,0-.06,0c-.22-.03-.36-.24-.33-.45.38-2.42.17-4.24,0-4.87-.06-.21.07-.43.28-.48.21-.06.43.07.48.28.02.08.51,1.99,0,5.19-.03.2-.2.34-.39.34Z" />
        <path d="M14.93,27.49c-.18,0-.34-.12-.38-.3-.08-.3-.75-2.99-.77-3.69-.02-.71.6-3.25.67-3.54.05-.21.27-.34.48-.29.21.05.34.27.29.48-.26,1.04-.66,2.87-.65,3.32.01.46.46,2.36.75,3.52.05.21-.07.43-.29.48-.03,0-.07.01-.1.01Z" />
      </>
    ),
    'special-care': (
      <>
        <path d="M25.3,31.21h-10.6c-.72,0-1.4-.39-1.76-1.02l-5.3-9.18c-.36-.63-.36-1.41,0-2.03l5.3-9.18c.36-.63,1.04-1.02,1.76-1.02h10.6c.72,0,1.4.39,1.76,1.02l5.3,9.18c.36.63.36,1.41,0,2.03l-5.3,9.18c-.36.63-1.04,1.02-1.76,1.02ZM14.7,9.52c-.46,0-.9.25-1.13.65l-5.3,9.18c-.23.4-.23.9,0,1.31l5.3,9.18c.23.4.67.65,1.13.65h10.6c.46,0,.9-.25,1.13-.65l5.3-9.18c.23-.4.23-.9,0-1.31l-5.3-9.18c-.23-.4-.67-.65-1.13-.65h-10.6Z" />
        <path d="M22.16,27.09h-4.31v-4.93h-4.93v-4.31h4.93v-4.93h4.31v4.93h4.93v4.31h-4.93v4.93ZM18.57,26.36h2.86v-4.93h4.93v-2.86h-4.93v-4.93h-2.86v4.93h-4.93v2.86h4.93v4.93Z" />
      </>
    ),
  };

  const shape = name ? paths[name] : undefined;
  if (!shape) return null;

  return (
    <svg viewBox="0 0 40 40" width="40" height="40" fill="#7FE0EC" aria-hidden>
      {shape}
    </svg>
  );
}

/** 區段 CTA。`external` 決定用 `<a>` 或 `<Link>`（同 About 頁的規則）。 */
function CtaLink({
  cta,
  variant,
}: {
  cta: SectionCta;
  variant: 'primary' | 'onDark' | 'onDarkOutline' | 'ink' | 'text';
}) {
  const className = {
    primary:
      'mt-8 inline-block rounded-full bg-brand px-7 py-3 font-[620] text-white shadow-[0_10px_30px_rgba(0,181,205,.32)] transition hover:bg-brand-deep hover:text-white',
    onDark:
      'mt-6 inline-block rounded-full bg-white px-7 py-3 font-[620] text-brand-deep transition hover:bg-white/90',
    // 照片帶上的次要動作：透明底、半透明白框（mockup4 §02）
    onDarkOutline:
      'mt-7 inline-block rounded-full border-[1.5px] border-white/55 px-7 py-3 font-[620] text-white hover:text-white',
    // 白底上的主要動作在 mockup4 §03 是 ink 實心，不是品牌青
    ink: 'mt-11 inline-block rounded-full bg-ink px-[30px] py-[13px] font-[620] text-white hover:text-white',
    text: 'font-[620] text-brand-deep',
  }[variant];

  const raw = cta.label ?? cta.url!;
  const label = variant === 'text' ? withArrow(raw) : raw;

  return cta.external ? (
    <a href={cta.url} target="_blank" rel="noopener" className={className}>
      {label}
    </a>
  ) : (
    <Link href={cta.url!} className={className}>
      {label}
    </Link>
  );
}

/**
 * `**…**` 標記的高亮字（docs/09 §2）。刻意只認這一種標記、不接 markdown 解析器：
 * 這是一個標題欄位，不是富文字。
 *
 * <p>
 * 顏色是 `#0092A8` 而不是品牌青 `#00B5CD` —— 後者壓在白底上只有約 2.9:1，
 * 當文字不合格。**品牌青只負責填色**，一旦當文字就換深一階（DESIGN.md）。
 * </p>
 */
function Highlight({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} style={S.introHighlight}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** 標籤若已自帶箭頭就不再補一個 —— 後台的文案常常已經寫成「All news →」。 */
function withArrow(label: string): string {
  return /[→>›»]\s*$/.test(label) ? label : `${label} →`;
}
