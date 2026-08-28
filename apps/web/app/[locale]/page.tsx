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
  introLead: css`font-size:clamp(.95rem,1.3vw,1.15rem);max-width:52ch;margin:18px auto 0;`,

  // 01 HERO PRODUCTS
  s01: css`max-width:1180px;margin:0 auto;padding:clamp(64px,8vw,96px) clamp(24px,5vw,64px);`,
  s01Head: css`margin-bottom:36px;`,
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
  promoSvg: css`width:78px;opacity:.85;flex:none;`,
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
  s03Title: css`color:#16333B;font-weight:400;font-size:clamp(2rem,4vw,2.6rem);max-width:20ch;margin:8px 0 44px;`,
  s03Grid: css`display:grid;grid-template-columns:repeat(4,1fr);gap:32px;`,
  s03Item: css`border-top:2px solid #00B5CD;padding-top:20px;`,
  s03ItemTitle: css`color:#16333B;font-weight:570;font-size:1.2rem;margin-bottom:8px;`,
  s03ItemBody: css`font-size:.92rem;`,
  s03Cta: css`display:inline-block;margin-top:44px;background:#16333B;color:#fff;font-weight:620;padding:13px 30px;border-radius:999px;`,

  // 04 TESTIMONIAL
  s04: css`background:#F5FAFB;padding:clamp(64px,8vw,96px) 0;`,
  s04Inner: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);display:grid;grid-template-columns:1.02fr .98fr;gap:clamp(40px,6vw,72px);align-items:center;`,
  s04Title: css`color:#16333B;font-weight:400;font-size:clamp(2rem,4vw,2.6rem);line-height:1.08;margin:8px 0 0;`,
  s04Marks: css`display:block;margin:36px 0 20px;`,
  s04Quote: css`color:#16333B;font-weight:440;font-stretch:108%;font-size:clamp(1.5rem,2.5vw,2.05rem);line-height:1.3;letter-spacing:-.01em;max-width:20ch;`,
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
 * 由 {@link Highlight} 轉成品牌青。品牌符號（`Not Just a Motion`、`OEM / ODM`、
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
    hero: { eyebrow: string; title: string; lead: string };
    featured: string;
    bodyPart: { title: [string, string]; lead: string; cta: string; tiles: Tile[] };
    whyPartner: { title: string; items: { title: string; body: string }[]; cta: string };
    latestNews: { title: string; allLink: string };
  }
> = {
  en: {
    hero: {
      eyebrow: 'Not Just a Motion · Made in Taiwan',
      title: 'Support Feels **Personal**.',
      lead:
        'We believe the true spirit of motion is about more than just movement — ' +
        "it's about enhancing your quality of life.",
    },
    featured: 'Hero products',
    bodyPart: {
      title: ['Find support', 'by body part'],
      lead:
        'Tap where it hurts or tires on our interactive body map, ' +
        'or browse solutions for special care needs.',
      cta: 'Explore applications →',
      tiles: [
        { icon: 'knee', title: 'Knee', subtitle: 'Stability & alignment', href: '/applications/knee' },
        { icon: 'ankle-foot', title: 'Ankle & Foot', subtitle: 'Sprains & plantar relief', href: '/applications/ankle' },
        { icon: 'back', title: 'Back & Waist', subtitle: 'Posture & lifting support', href: '/applications/back' },
        { icon: 'special-care', title: 'Special care', subtitle: 'Elderly · bunion relief', href: '/applications' },
      ],
    },
    whyPartner: {
      title: 'A team your business can truly count on',
      items: [
        { title: 'Certified quality', body: 'ISO 13485 system with CE-marked product lines.' },
        { title: 'OEM / ODM flexibility', body: 'From design and sampling to certification support.' },
        { title: 'Made in Taiwan', body: 'In-house manufacturing with full traceability.' },
        { title: 'Comfort-first R&D', body: 'Premium materials engineered for all-day wear.' },
      ],
      cta: 'Become a partner',
    },
    latestNews: { title: 'Latest news', allLink: 'All news →' },
  },
  'zh-TW': {
    hero: {
      eyebrow: 'Not Just a Motion · 台灣製造',
      title: 'Support Feels **Personal**.',
      lead: '我們相信「動」的真義不只是移動 —— 而是讓生活品質更好。',
    },
    featured: '精選產品',
    bodyPart: {
      title: ['依部位', '尋找支撐'],
      lead: '在互動人體圖上點選不適或疲勞的部位，或直接瀏覽特殊照護的解決方案。',
      cta: '探索應用方案 →',
      tiles: [
        { icon: 'knee', title: '膝部', subtitle: '穩定與對位', href: '/applications/knee' },
        { icon: 'ankle-foot', title: '踝部與足部', subtitle: '扭傷與足底舒緩', href: '/applications/ankle' },
        { icon: 'back', title: '背部與腰部', subtitle: '姿勢與搬提支撐', href: '/applications/back' },
        { icon: 'special-care', title: '特殊照護', subtitle: '長者照護 · 拇趾外翻舒緩', href: '/applications' },
      ],
    },
    whyPartner: {
      title: '值得您的事業信賴的團隊',
      items: [
        { title: '認證品質', body: '通過 ISO 13485 系統，產品線具備 CE 標章。' },
        { title: 'OEM / ODM 彈性', body: '從設計、打樣到認證協助，一應俱全。' },
        { title: '台灣製造', body: '自有工廠生產，全程可追溯。' },
        { title: '舒適優先的研發', body: '嚴選材質，為整日穿戴而設計。' },
      ],
      cta: '成為合作夥伴',
    },
    latestNews: { title: '最新消息', allLink: '所有消息 →' },
  },
};


export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';

  return {
    title: plain(COPY[locale].hero.title),
    description: COPY[locale].hero.lead,
    alternates: {
      canonical: `${siteUrl}/${locale}`,
      languages: { en: `${siteUrl}/en`, 'zh-TW': `${siteUrl}/zh-TW` },
    },
  };
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
      {slider?.slides && (
        <HeroSlider slides={slider.slides} intervalSeconds={slider.intervalSeconds} />
      )}

      {/* HERO COPY —— 只有上方留白：下方的留白由「01 精選產品」自己的 padding 給
          （mockup4 的 `padding: … 0`），兩段各自負責的話會疊成兩倍 */}
      <section style={S.intro}>
        <p style={S.introEyebrow}>{copy.hero.eyebrow}</p>
        <h1 style={S.introTitle}>
          <Highlight text={copy.hero.title} />
        </h1>
        <p style={S.introLead}>{copy.hero.lead}</p>
      </section>

      {/* 01 精選產品 —— Pinterest 式瀑布流 */}
      {featured.items.length > 0 && (
        <section style={S.s01}>
          <RuledSectionHeading index={next()} title={copy.featured} style={S.s01Head} />

          <FeaturedMasonry items={featured.items} />

          {promo && (
            <PromoBand promo={promo}>
              <div style={S.promoLeft}>
                {/* 動線標記：三條同心的「起身」曲線，取自 mockup4。
                    純裝飾，不進無障礙樹。 */}
                <svg viewBox="0 0 190 140" aria-hidden="true" style={S.promoSvg}>
                  <g fill="none" stroke="#fff" strokeWidth="9">
                    <path d="M 40 140 V 75 Q 40 40 75 40 H 190" />
                    <path d="M 62 140 V 97 Q 62 62 97 62 H 190" />
                    <path d="M 84 140 V 119 Q 84 84 119 84 H 190" />
                  </g>
                </svg>

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

              {/* 起引號記號，純裝飾 */}
              <svg viewBox="0 0 92 62" width="56" aria-hidden style={S.s04Marks}>
                <g fill="none" stroke="#0092A8" strokeWidth="11" strokeLinecap="round">
                  <path d="M33 9 Q13 9 13 31 V53" />
                  <path d="M80 9 Q60 9 60 31 V53" />
                </g>
              </svg>

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

function FeaturedMasonry({ items }: { items: ProductListItem[] }) {
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
                alt={p.image.alt ?? p.name}
                loading="lazy"
                decoding="async"
                width={1200}
                height={1200}
                style={S.cardImg}
              />
            )}
          </div>
          <div style={S.cardBody}>
            {p.collection && (
              <span style={{ ...S.cardEyebrow, ...collectionColor(p.collection.slug) }}>
                {p.collection.name}
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
      <span style={S.rowRead}>{locale === 'en' ? 'Read →' : '閱讀 →'}</span>
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

function TileIcon({ name }: { name?: string }) {
  const paths: Record<string, React.ReactNode> = {
    knee: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M7 12h10" />
      </>
    ),
    'ankle-foot': <path d="M6 4v9a6 6 0 0 0 12 0V4" />,
    back: (
      <>
        <path d="M4 18c4-8 12-8 16 0" />
        <path d="M12 6v6" />
      </>
    ),
    'special-care': <path d="M12 3v18M5 8l7-5 7 5" />,
  };

  const shape = name ? paths[name] : undefined;
  if (!shape) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width="30"
      height="30"
      fill="none"
      stroke="#7FE0EC"
      strokeWidth="1.6"
      aria-hidden
    >
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

/** metadata 的 title 不能帶標記。 */
function plain(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

/** 標籤若已自帶箭頭就不再補一個 —— 後台的文案常常已經寫成「All news →」。 */
function withArrow(label: string): string {
  return /[→>›»]\s*$/.test(label) ? label : `${label} →`;
}
