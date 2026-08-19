import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type ArticleListItem, type MediaRef, type ProductListItem } from '@/lib/api';
import { formatDate } from '@/lib/date';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { section, type SectionCta } from '@/lib/page';
import { COLLECTION_TEXT } from '@/lib/collection';
import { HeroSlider } from '@/components/HeroSlider';
import { RuledSectionHeading, SectionHeading } from '@/components/SectionHeading';

type Params = { locale: string };

type HeroSliderSection = {
  slides?: { image?: MediaRef; alt?: string }[];
  intervalSeconds?: number;
};
type HeroIntroSection = { eyebrow?: string; title?: string; lead?: string };
type FeaturedSection = {
  title?: string;
  allLink?: SectionCta;
  promo?: { eyebrow?: string; title?: string; link?: SectionCta };
};
type BodyPartBandSection = {
  background?: MediaRef;
  title?: string;
  lead?: string;
  cta?: SectionCta;
  tiles?: { icon?: string; title?: string; subtitle?: string; link?: SectionCta }[];
};
type WhyPartnerSection = {
  title?: string;
  items?: { title?: string; body?: string }[];
  cta?: SectionCta;
};
type TestimonialSection = {
  title?: string;
  quote?: string;
  attribution?: { name?: string; region?: string };
  miniQuotes?: { quote?: string; source?: string }[];
  video?: { poster?: MediaRef; source?: string };
  floatingChip?: string;
};
type LatestNewsSection = { title?: string; allLink?: SectionCta };

const FALLBACK: Record<Locale, string> = {
  en: 'EuniceMed — Not Just a Motion',
  'zh-TW': 'EuniceMed — Not Just a Motion',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const page = await api.page(locale, 'home');
  const intro = page ? section<HeroIntroSection>(page, 'heroIntro') : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';

  return {
    title: intro?.title ? plain(intro.title) : FALLBACK[locale],
    description: intro?.lead,
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

  const slider = section<HeroSliderSection>(page, 'heroSlider');
  const intro = section<HeroIntroSection>(page, 'heroIntro');
  const featuredCopy = section<FeaturedSection>(page, 'featuredProducts');
  const band = section<BodyPartBandSection>(page, 'bodyPartBand');
  const why = section<WhyPartnerSection>(page, 'whyPartner');
  const testimonial = section<TestimonialSection>(page, 'testimonial');
  const latestCopy = section<LatestNewsSection>(page, 'latestNews');

  let n = 0;
  const next = () => ++n;

  return (
    <>
      {slider?.slides && (
        <HeroSlider slides={slider.slides} intervalSeconds={slider.intervalSeconds} />
      )}

      {/* HERO COPY —— 只有上方留白：下方的留白由「01 精選產品」自己的 padding 給
          （mockup4 的 `padding: … 0`），兩段各自負責的話會疊成兩倍 */}
      {intro && (
        <section className="mx-auto max-w-content px-gutter pt-[clamp(40px,5vw,64px)] text-center">
          {intro.eyebrow && (
            <p className="text-[clamp(0.7rem,0.9vw,0.82rem)] font-[680] uppercase tracking-[0.2em] text-brand-deep">
              {intro.eyebrow}
            </p>
          )}
          {intro.title && (
            <h1 className="mt-[14px] text-[clamp(2rem,3.8vw,3.4rem)] font-normal leading-[1.12] tracking-[-0.02em]">
              <Highlight text={intro.title} />
            </h1>
          )}
          {intro.lead && (
            <p className="mx-auto mt-[18px] max-w-[52ch] text-[clamp(0.95rem,1.3vw,1.15rem)]">
              {intro.lead}
            </p>
          )}
        </section>
      )}

      {/* 01 精選產品 —— Pinterest 式瀑布流 */}
      {featuredCopy && featured.items.length > 0 && (
        <section className="mx-auto max-w-content px-gutter py-[clamp(64px,8vw,96px)]">
          <RuledSectionHeading
            index={next()}
            title={featuredCopy.title ?? ''}
            action={
              featuredCopy.allLink?.url && (
                <CtaLink cta={featuredCopy.allLink} variant="text" />
              )
            }
            className="mb-9"
          />

          <FeaturedMasonry items={featured.items} />

          {featuredCopy.promo && (
            <div className="mt-9 flex flex-wrap items-center justify-between gap-7 rounded-[20px] bg-[linear-gradient(120deg,#00b5cd,#007d95)] px-9 py-[30px] text-white">
              <div className="flex items-center gap-[26px]">
                {/* 動線標記：三條同心的「起身」曲線，取自 mockup4。
                    純裝飾，不進無障礙樹。 */}
                <svg
                  viewBox="0 0 190 140"
                  aria-hidden="true"
                  className="w-[78px] flex-none opacity-85"
                >
                  <g fill="none" stroke="#fff" strokeWidth="9">
                    <path d="M 40 140 V 75 Q 40 40 75 40 H 190" />
                    <path d="M 62 140 V 97 Q 62 62 97 62 H 190" />
                    <path d="M 84 140 V 119 Q 84 84 119 84 H 190" />
                  </g>
                </svg>

                <div>
                  {featuredCopy.promo.eyebrow && (
                    <p className="text-[0.85rem] font-[620] uppercase tracking-[0.12em] text-white/85">
                      {featuredCopy.promo.eyebrow}
                    </p>
                  )}
                  {featuredCopy.promo.title && (
                    <p className="mt-1.5 text-[1.5rem] font-medium">
                      {featuredCopy.promo.title}
                    </p>
                  )}
                </div>
              </div>
              {featuredCopy.promo.link?.url && (
                <PromoArrow cta={featuredCopy.promo.link} />
              )}
            </div>
          )}
        </section>
      )}

      {/* 02 依部位找支撐 */}
      {band && (
        <section className="relative mt-[clamp(48px,6vw,80px)] overflow-hidden py-[clamp(72px,9vw,120px)]">
          {band.background && (
            <>
              <img
                src={band.background.url}
                srcSet={srcSetOf(band.background)}
                sizes="100vw"
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* 由左至右的深青遮罩：左側文字讀得到、右側照片保持乾淨（DESIGN.md） */}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,36,45,.74)_0%,rgba(9,36,45,.5)_52%,rgba(9,36,45,.14)_100%)]" />
            </>
          )}
          {!band.background && <div className="absolute inset-0 bg-[#12333c]" />}

          <div className="relative mx-auto grid max-w-content items-center gap-14 px-gutter lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="text-[1.1rem] font-medium text-[#7FE0EC]">
                {String(next()).padStart(2, '0')}
              </span>
              {band.title && (
                <h2 className="mt-2 mb-[18px] text-[clamp(2rem,4vw,2.6rem)] font-normal leading-[1.08] text-white">
                  {band.title}
                </h2>
              )}
              {band.lead && (
                <p className="max-w-[44ch] text-[1.05rem] text-white/[.78]">{band.lead}</p>
              )}
              {band.cta?.url && <CtaLink cta={band.cta} variant="onDarkOutline" />}
            </div>

            {/* 四格是**一塊**面板：1px 的格線由容器底色透出來，不是各自獨立的卡片 */}
            {band.tiles && band.tiles.length > 0 && (
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-white/[.14] bg-white/[.14]">
                {band.tiles.map((tile, i) => (
                  <TileLink key={tile.title ?? i} tile={tile} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 03 合作優勢 */}
      {why && (
        <section className="mx-auto max-w-content px-gutter py-[clamp(64px,8vw,96px)]">
          <SectionHeading
            index={next()}
            title={why.title ?? ''}
            titleClassName="max-w-[20ch] text-[clamp(2rem,4vw,2.6rem)]"
            className="mb-11"
          />
          {/* 每欄頂上一條 2px 品牌青（mockup4） */}
          {why.items && why.items.length > 0 && (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {why.items.map((item, i) => (
                <div key={item.title ?? i} className="border-t-2 border-brand pt-5">
                  {item.title && (
                    <h3 className="mb-2 text-[1.2rem] font-[570]">{item.title}</h3>
                  )}
                  {item.body && <p className="text-[0.92rem]">{item.body}</p>}
                </div>
              ))}
            </div>
          )}
          {why.cta?.url && <CtaLink cta={why.cta} variant="ink" />}
        </section>
      )}

      {/* 04 客戶見證 */}
      {testimonial && (
        <section className="bg-tint py-[clamp(64px,8vw,96px)]">
          <div className="mx-auto grid max-w-content items-center gap-[clamp(40px,6vw,72px)] px-gutter lg:grid-cols-[1.02fr_0.98fr]">
            <div>
              <SectionHeading
                index={next()}
                title={testimonial.title ?? ''}
                accent
                titleClassName="text-[clamp(2rem,4vw,2.6rem)] leading-[1.08]"
              />

              {/* 起引號記號，純裝飾 */}
              <svg viewBox="0 0 92 62" width="56" aria-hidden className="my-9 block">
                <g fill="none" stroke="#0092A8" strokeWidth="11" strokeLinecap="round">
                  <path d="M33 9 Q13 9 13 31 V53" />
                  <path d="M80 9 Q60 9 60 31 V53" />
                </g>
              </svg>

              {testimonial.quote && (
                <blockquote className="max-w-[20ch] text-[clamp(1.5rem,2.5vw,2.05rem)] leading-[1.3] font-[440] tracking-[-0.01em] text-ink">
                  {testimonial.quote}
                </blockquote>
              )}
              {testimonial.attribution?.name && (
                <p className="mt-4 text-[0.9rem] font-semibold">
                  {testimonial.attribution.name}
                  {testimonial.attribution.region && (
                    <span className="font-medium text-[#66787F]">
                      {' '}
                      · {testimonial.attribution.region}
                    </span>
                  )}
                </p>
              )}

              {/* 短引言是一張細線清單，不是卡片（mockup4） */}
              {testimonial.miniQuotes && testimonial.miniQuotes.length > 0 && (
                <div className="mt-10 border-t border-hairline">
                  {testimonial.miniQuotes.map((m, i) => (
                    <div
                      key={m.source ?? i}
                      className="flex items-baseline justify-between gap-5 border-b border-hairline py-4"
                    >
                      {m.quote && (
                        <p className="text-[0.98rem] font-[530] text-ink">{m.quote}</p>
                      )}
                      {m.source && (
                        <span className="text-[0.75rem] font-[650] tracking-[0.1em] whitespace-nowrap text-[#66787F] uppercase">
                          {m.source}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[24px] bg-tint-deep shadow-[0_30px_60px_rgba(10,60,72,.16)]">
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
                    className="h-full w-full object-cover"
                  />
                )}
                {/* 播放鈕。影片來源未定（CLAUDE.md §7），先只放記號不接播放器 */}
                <span className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white shadow-[0_14px_30px_rgba(10,60,72,.16)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-[3px]">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </div>

              {/* 浮出左緣的深色標籤（mockup4：`left:-22px`） */}
              {testimonial.floatingChip && (
                <span className="absolute bottom-7 -left-[22px] inline-flex items-center gap-2.5 rounded-full border border-hairline bg-[rgba(6,26,34,.85)] px-4 py-2.5 text-[0.82rem] font-[620] text-white shadow-[0_10px_26px_rgba(10,60,72,.14)] backdrop-blur-[6px]">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-deep shadow-[0_0_0_4px_rgba(0,181,205,.18)]" />
                  {testimonial.floatingChip}
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 05 最新消息 */}
      {latestCopy && news.items.length > 0 && (
        <section className="mx-auto max-w-content px-gutter py-[clamp(64px,8vw,96px)]">
          <RuledSectionHeading
            index={next()}
            title={latestCopy.title ?? ''}
            action={
              latestCopy.allLink?.url && <CtaLink cta={latestCopy.allLink} variant="text" />
            }
            className="mb-3"
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
const RATIOS = ['aspect-square', 'aspect-[4/5]', 'aspect-[5/4]'] as const;

function FeaturedMasonry({ items }: { items: ProductListItem[] }) {
  return (
    <div className="gap-6 sm:columns-2 lg:columns-4">
      {items.map((p, i) => (
        <Link
          key={p.slug}
          href={p.url}
          className="group mb-6 block break-inside-avoid overflow-hidden rounded-[20px] border border-hairline bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(10,60,72,.10)]"
        >
          <div className={`${RATIOS[i % RATIOS.length]} overflow-hidden rounded-[18px] bg-tint-deep`}>
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
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            )}
          </div>
          <div className="px-[18px] pb-5 pt-4">
            {p.collection && (
              <span
                className={`text-[0.72rem] font-bold uppercase tracking-[0.1em] ${
                  // 未知 slug 退回品牌青，不要讓沒見過的系列變成看不見的文字
                  COLLECTION_TEXT[p.collection.slug] ?? 'text-brand-deep'
                }`}
              >
                {p.collection.name}
              </span>
            )}
            <h3 className="mt-1 text-[1.08rem] font-[570]">{p.name}</h3>
            {p.featuredBlurb && <p className="mt-0.5 text-[0.86rem]">{p.featuredBlurb}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}

/** 首頁 §05 的一列：固定寬度的日期、佔滿剩餘寬度的標題、右端的 Read →（mockup4）。 */
function NewsRow({ item, locale }: { item: ArticleListItem; locale: Locale }) {
  return (
    <Link
      href={item.url}
      className="flex items-center gap-6 border-b border-hairline py-6"
    >
      <span className="w-[90px] flex-none text-[0.85rem] text-[#66787F]">
        {item.publishedAt ? formatDate(item.publishedAt, locale).slice(0, 9) : ''}
      </span>
      <h3 className="flex-1 text-[1.3rem] font-[570]">{item.title}</h3>
      <span className="flex-none font-[620] text-brand-deep">
        {locale === 'en' ? 'Read →' : '閱讀 →'}
      </span>
    </Link>
  );
}

function TileLink({ tile }: { tile: NonNullable<BodyPartBandSection['tiles']>[number] }) {
  const inner = (
    <>
      <TileIcon name={tile.icon} />
      {tile.title && (
        <h3 className="mt-3.5 mb-1 text-[1.15rem] font-[570] text-white">{tile.title}</h3>
      )}
      {tile.subtitle && <p className="text-[0.88rem] text-white/[.66]">{tile.subtitle}</p>}
    </>
  );

  // 沒有自己的圓角與外框：格線是容器透出來的 1px gap（mockup4）
  const className =
    'bg-[rgba(6,26,34,.72)] px-7 py-[30px] backdrop-blur-[6px] transition hover:bg-[rgba(6,26,34,.86)]';

  return tile.link?.url ? (
    <Link href={tile.link.url} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

/**
 * 圖示對照表。`icon` 是 schema 的固定字彙（enum，寫入時已驗過），
 * **新增一個值必須同時在這裡補圖形**，否則格子會沒有圖示。
 */
/**
 * 全型錄卡右端的箭頭。mockup4 是一個 1.4rem 的白色 `→` 字符，
 * 不是白色圓鈕 —— 那張卡整塊就是連結，再放一顆按鈕會是兩個點擊目標。
 */
function PromoArrow({ cta }: { cta: SectionCta }) {
  const arrow = <span className="flex-none text-[1.4rem] font-[620] text-white">→</span>;

  return cta.external ? (
    <a href={cta.url} target="_blank" rel="noopener" aria-label={cta.label ?? undefined}>
      {arrow}
    </a>
  ) : (
    <Link href={cta.url!} aria-label={cta.label ?? undefined}>
      {arrow}
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
 */
function Highlight({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-brand">
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
