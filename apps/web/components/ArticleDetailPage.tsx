import Link from 'next/link';
import { css } from '@/lib/css';
import type { ArticleDetail } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import type { Locale } from '@/lib/locale';
import { formatDate } from '@/lib/date';
import { articleSchema, breadcrumbSchema } from '@/lib/schema';
import { ArticleCard } from './ArticleCard';
import { JsonLd } from './JsonLd';
import { ResourcesSubnav } from './ResourcesSubnav';
import { ShareLinks } from './ShareLinks';

/**
 * News Detail 與 Article Detail（Insights）的共用版型。
 *
 * <p>
 * 兩者在 mockup4 只差側欄：Insights 有 TOC、News 有活動面板與圖庫。
 * 但那些差異全部是**資料驅動**的 —— `toc` 為空就不渲染、`event` 為 null 就不渲染 ——
 * 所以不需要兩套版型，一支就夠。
 * </p>
 */
const COPY: Record<
  Locale,
  {
    onThisPage: string;
    eventDetails: string;
    dates: string;
    venue: string;
    booth: string;
    contact: string;
    requestMeeting: string;
    prev: string;
    next: string;
    relatedNews: string;
    relatedInsights: string;
    allNews: string;
    allInsights: string;
    readMinutes: (n: number) => string;
    by: string;
  }
> = {
  en: {
    onThisPage: 'On this page',
    eventDetails: 'Event details',
    dates: 'Dates',
    venue: 'Venue',
    booth: 'Booth',
    contact: 'Contact',
    requestMeeting: 'Request a meeting',
    prev: '← Previous',
    next: 'Next →',
    relatedNews: 'More news',
    relatedInsights: 'Related insights',
    allNews: 'All news',
    allInsights: 'All insights',
    readMinutes: (n) => `${n} min read`,
    by: 'By',
  },
  'zh-TW': {
    onThisPage: '本文目錄',
    eventDetails: '活動資訊',
    dates: '日期',
    venue: '地點',
    booth: '攤位',
    contact: '聯絡',
    requestMeeting: '預約洽談',
    prev: '← 上一篇',
    next: '下一篇 →',
    relatedNews: '更多消息',
    relatedInsights: '相關文章',
    allNews: '全部消息',
    allInsights: '全部文章',
    readMinutes: (n) => `閱讀時間 ${n} 分鐘`,
    by: '作者',
  },
};

/**
 * 樣式逐字取自 `mockup4/Article Detail.dc.html`。
 * 內文（`.m4-prose`）在 globals.css —— richtext 由 API 產生，沒有 JSX 元素可掛 inline style。
 */
const S = {
  breadcrumb: css`max-width:1180px;margin:0 auto;padding:18px clamp(24px,5vw,64px);font-size:.85rem;color:#66787F;font-weight:500;`,
  sep: css`margin:0 8px;color:#B7C4C8;`,
  header: css`max-width:1180px;margin:0 auto;padding:clamp(16px,2vw,24px) clamp(24px,5vw,64px) 0;`,
  headerInner: css`max-width:820px;margin:0 auto;text-align:center;`,
  eyebrow: css`color:#0092A8;font-weight:700;font-size:.74rem;letter-spacing:.14em;text-transform:uppercase;`,
  title: css`font-weight:400;font-size:clamp(2rem,3.8vw,3rem);letter-spacing:-.02em;margin:12px 0 0;`,
  standfirst: css`margin-top:16px;font-size:1.15rem;`,
  meta: css`display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:20px;font-size:.85rem;color:#66787F;`,
  metaSep: css`color:#B7C4C8;`,

  coverWrap: css`max-width:1180px;margin:0 auto;padding:clamp(28px,3.5vw,44px) clamp(24px,5vw,64px) 0;`,
  cover: css`position:relative;aspect-ratio:16/9;border-radius:24px;overflow:hidden;background:#F0F6F8;`,
  coverImg: css`display:block;width:100%;height:100%;object-fit:cover;`,

  body: css`max-width:1180px;margin:0 auto;padding:clamp(40px,5vw,64px) clamp(24px,5vw,64px);`,
  bodyGrid: css`display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:clamp(40px,5vw,72px);align-items:start;`,
  article: css`font-size:1.06rem;min-width:0;`,
  disclaimer: css`border:1px solid #DFE9EC;border-radius:18px;padding:20px 24px;margin-top:34px;font-size:.88rem;color:#66787F;`,
  tags: css`display:flex;flex-wrap:wrap;gap:10px;margin-top:32px;`,
  tag: css`background:#F5FAFB;border:1px solid #DFE9EC;border-radius:999px;padding:6px 15px;font-size:.82rem;font-weight:500;`,

  rail: css`position:sticky;top:100px;display:flex;flex-direction:column;gap:24px;`,
  railLabel: css`color:#8AA0A6;font-weight:620;letter-spacing:.14em;text-transform:uppercase;font-size:.72rem;padding-bottom:10px;`,
  toc: css`display:flex;flex-direction:column;gap:2px;font-size:.92rem;`,
  tocItem: css`border-left:3px solid #DFE9EC;padding:8px 14px;line-height:1.4;`,
  tocItemActive: css`border-left:3px solid #00B5CD;color:#0092A8;font-weight:620;padding:8px 14px;line-height:1.4;`,
  promo: css`background:#F5FAFB;border:1px solid #DFE9EC;border-radius:20px;padding:24px 22px;`,
  promoTitle: css`font-weight:570;font-size:1.05rem;`,
  promoBody: css`font-size:.9rem;margin-top:6px;`,
  promoLink: css`display:inline-block;margin-top:14px;color:#0092A8;font-weight:620;font-size:.92rem;`,

  /** News Detail 的分類是**藥丸**，Insights 是純大寫字（兩頁不同） */
  newsEyebrow: css`display:inline-block;background:#E9F8FA;color:#0092A8;font-weight:700;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;padding:5px 14px;border-radius:999px;`,
  newsTitle: css`font-weight:400;font-size:clamp(2rem,3.8vw,3rem);letter-spacing:-.02em;margin:14px 0 0;`,
  newsDate: css`margin-top:18px;font-size:.85rem;color:#66787F;`,

  gallery: css`display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:34px;`,
  galleryItem: css`position:relative;aspect-ratio:4/3;border-radius:16px;overflow:hidden;background:#F0F6F8;`,
  galleryImg: css`display:block;width:100%;height:100%;object-fit:cover;`,

  facts: css`border:1px solid #DFE9EC;border-radius:20px;background:#F5FAFB;padding:26px 28px;margin-top:34px;`,
  factsTitle: css`font-weight:620;font-size:1.05rem;margin-bottom:14px;`,
  factsGrid: css`display:grid;grid-template-columns:120px 1fr;gap:10px 18px;font-size:.95rem;`,
  factsKey: css`color:#66787F;`,
  factsValue: css`color:#16333B;`,
  factsCta: css`display:inline-block;margin-top:20px;background:#00B5CD;color:#fff;font-weight:620;padding:11px 26px;border-radius:999px;box-shadow:0 8px 22px rgba(0,150,170,.28);`,

  prevNext: css`display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:48px;border-top:1px solid #DFE9EC;padding-top:28px;`,
  prevNextRight: css`text-align:right;`,
  prevNextLabel: css`font-size:.8rem;color:#66787F;`,
  prevNextTitle: css`font-weight:570;font-size:1.05rem;margin-top:6px;`,

  related: css`background:#F5FAFB;padding:clamp(56px,7vw,80px) 0;`,
  relatedInner: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);`,
  relatedHead: css`display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:28px;`,
  relatedTitle: css`color:#16333B;font-weight:400;font-size:clamp(1.6rem,3vw,2.1rem);`,
  relatedAll: css`color:#0092A8;font-weight:620;`,
  relatedGrid: css`display:grid;grid-template-columns:repeat(3,1fr);gap:28px;`,
} as const;

export function ArticleDetailPage({
  article,
  locale,
  kind,
  listLabel,
}: {
  article: ArticleDetail;
  locale: Locale;
  kind: 'news' | 'insights';
  listLabel: string;
}) {
  const c = COPY[locale];
  const a = article;

  return (
    <>
      <JsonLd data={articleSchema(locale, a, `/${kind}/${a.slug}`, kind)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: listLabel, url: `/${locale}/${kind}` },
          ...(a.category
            ? [{ name: a.category.name, url: `/${locale}/${kind}?category=${a.category.slug}` }]
            : []),
          { name: a.title },
        ])}
      />

      <ResourcesSubnav locale={locale} active={`/${kind}`} />

      <nav style={S.breadcrumb}>
        <Link href={`/${locale}/${kind}`}>{listLabel}</Link>
        {a.category && (
          <>
            <span style={S.sep}>/</span>
            <Link href={`/${locale}/${kind}?category=${a.category.slug}`}>{a.category.name}</Link>
          </>
        )}
        <span style={S.sep}>/</span>
        {/* mockup4 的最後一節沒有自己的樣式，直接繼承容器的 #66787F */}
        <span>{a.title}</span>
      </nav>

      {/*
        標題區 —— 量體 820px（比一般頁窄）。
        **兩頁的分類長得不一樣**：Insights 是純大寫青字，News 是淺青底的藥丸，
        連帶 h1 的上距也不同（12px vs 14px）。
      */}
      <header style={S.header}>
        <div style={S.headerInner}>
          {a.category && (
            <span style={kind === 'news' ? S.newsEyebrow : S.eyebrow}>{a.category.name}</span>
          )}
          <h1 style={kind === 'news' ? S.newsTitle : S.title}>{a.title}</h1>
          {/* standfirst 是編輯者另寫的導言；沒寫就用摘要，兩者都沒有才不顯示 */}
          {(a.standfirst ?? a.excerpt) && <p style={S.standfirst}>{a.standfirst ?? a.excerpt}</p>}

          <div style={S.meta}>
            {[
              a.publishedAt ? formatDate(a.publishedAt, locale) : null,
              a.author ? `${c.by} ${a.author}` : null,
              a.readMinutes !== null ? c.readMinutes(a.readMinutes) : null,
            ]
              .filter((x): x is string => Boolean(x))
              .map((part, i) => (
                <span key={part} className="contents">
                  {i > 0 && <span style={S.metaSep}>·</span>}
                  <span>{part}</span>
                </span>
              ))}
          </div>
        </div>
      </header>

      {a.cover && (
        <div style={S.coverWrap}>
          <img
            src={a.cover.url}
            srcSet={srcSetOf(a.cover)}
            sizes="(max-width: 1180px) 100vw, 1180px"
            alt={a.cover.alt ?? a.title}
            width={1600}
            height={900}
            decoding="async"
            style={{ ...S.cover, ...S.coverImg }}
          />
        </div>
      )}

      {/* 內文 + 側欄 */}
      <section style={S.body}>
        <div style={S.bodyGrid}>
          <article style={S.article}>
            {a.body && (
              <div
                className="m4-prose"
                // 已在寫入時以白名單淨化（Article profile），且 H2 的 anchor id
                // 由伺服器回填 —— 側欄 TOC 就是靠那些 id 跳的，前端不可以再動 HTML。
                dangerouslySetInnerHTML={{ __html: a.body }}
              />
            )}

            {a.event && <EventPanel event={a.event} locale={locale} copy={c} />}

            {a.gallery.length > 0 && (
              <div style={S.gallery} data-r="cols-2">
                {a.gallery.map((img) => (
                  <img
                    key={img.url}
                    src={img.url}
                    srcSet={srcSetOf(img)}
                    sizes="(max-width: 640px) 100vw, 300px"
                    alt={img.alt ?? ''}
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={600}
                    style={{ ...S.galleryItem, ...S.galleryImg }}
                  />
                ))}
              </div>
            )}

            {a.disclaimer && (
              <div style={S.disclaimer} dangerouslySetInnerHTML={{ __html: a.disclaimer }} />
            )}

            {(a.prev || a.next) && (
              <div style={S.prevNext}>
                {a.prev ? <NavCard item={a.prev} label={c.prev} /> : <span />}
                {a.next && <NavCard item={a.next} label={c.next} align="right" />}
              </div>
            )}
          </article>

          <aside style={S.rail} data-r="unstick">
            {a.toc.length > 0 && (
              <div>
                <p style={S.railLabel}>{c.onThisPage}</p>
                {/* 每一項左側一條色條；目前段落在 mockup4 是品牌青，
                    但捲動位置要 client JS 才知道，所以這裡一律用細線色。 */}
                <nav style={S.toc}>
                  {a.toc.map((t) => (
                    <a key={t.id} href={`#${t.id}`} style={S.tocItem}>
                      {t.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            <ShareLinks title={a.title} locale={locale} />

            {a.tags.length > 0 && (
              <div style={S.tags}>
                {a.tags.map((tag) => (
                  <span key={tag.slug} style={S.tag}>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>

      {a.related.length > 0 && (
        <section style={S.related}>
          <div style={S.relatedInner}>
            <div style={S.relatedHead}>
              <h2 style={S.relatedTitle}>{kind === 'news' ? c.relatedNews : c.relatedInsights}</h2>
              <Link href={`/${locale}/${kind}`} style={S.relatedAll}>
                {kind === 'news' ? c.allNews : c.allInsights} →
              </Link>
            </div>
            <div style={S.relatedGrid} data-r="cols-2">
              {a.related.map((r) => (
                <ArticleCard
                  key={r.slug}
                  locale={locale}
                  kind={kind}
                  item={{
                    slug: r.slug,
                    type: a.type,
                    title: r.title,
                    excerpt: null,
                    category: null,
                    publishedAt: null,
                    readMinutes: null,
                    author: null,
                    cover: r.cover,
                    url: r.url,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function EventPanel({
  event,
  locale,
  copy,
}: {
  event: NonNullable<ArticleDetail['event']>;
  locale: Locale;
  copy: (typeof COPY)[Locale];
}) {
  // datesLabel 是編輯者寫的顯示字串（「16–19 November 2026」），
  // 起訖日期則是結構化欄位。有 label 就用 label —— 它才是編輯者要的呈現方式。
  const dates =
    event.datesLabel ??
    [event.startDate, event.endDate]
      .filter(Boolean)
      .map((d) => formatDate(d!, locale))
      .join(' – ');

  const rows = [
    dates && ([copy.dates, dates] as const),
    event.venue && ([copy.venue, event.venue] as const),
    event.booth && ([copy.booth, event.booth] as const),
    event.contactEmail && ([copy.contact, event.contactEmail] as const),
  ].filter(Boolean) as (readonly [string, string])[];

  if (rows.length === 0 && !event.ctaUrl) return null;

  return (
    <div style={S.facts}>
      <h3 style={S.factsTitle}>{copy.eventDetails}</h3>
      <dl style={S.factsGrid} data-r="keep">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt style={S.factsKey}>{label}</dt>
            <dd style={S.factsValue}>
              {label === copy.contact ? <a href={`mailto:${value}`}>{value}</a> : value}
            </dd>
          </div>
        ))}
      </dl>
      {event.ctaUrl && (
        <a href={event.ctaUrl} style={S.factsCta} className="hover:text-white">
          {event.ctaLabel ?? copy.requestMeeting}
        </a>
      )}
    </div>
  );
}

function NavCard({
  item,
  label,
  align = 'left',
}: {
  item: NonNullable<ArticleDetail['prev']>;
  label: string;
  align?: 'left' | 'right';
}) {
  return (
    <Link href={item.url} style={align === 'right' ? S.prevNextRight : undefined}>
      <p style={S.prevNextLabel}>{label}</p>
      <h3 style={S.prevNextTitle}>{item.title}</h3>
    </Link>
  );
}
