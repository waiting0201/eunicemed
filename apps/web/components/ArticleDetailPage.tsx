import Link from 'next/link';
import type { ArticleDetail } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import type { Locale } from '@/lib/locale';
import { formatDate } from '@/lib/date';
import { ArticleCard } from './ArticleCard';
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

/** 內文的排版。richtext 由 API 淨化過，標籤集固定（docs/09 §9.2），這裡只負責樣式。 */
const PROSE = [
  '[&_p]:mt-4',
  // 第一段是導引段：比內文大一階且用 ink（mockup4）
  '[&>p:first-child]:mt-0 [&>p:first-child]:text-[1.18rem] [&>p:first-child]:leading-[1.6] [&>p:first-child]:text-ink',
  '[&_h2]:mt-[38px] [&_h2]:mb-3 [&_h2]:text-[1.55rem] [&_h2]:font-[520] [&_h2]:scroll-mt-24',
  '[&_h3]:mt-7 [&_h3]:text-[1.2rem] [&_h3]:font-[570]',
  '[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:mt-1.5',
  '[&_a]:text-brand-deep [&_a]:underline',
  // 引言：左側 3px 品牌青、淺底、右側圓角（mockup4），不是斜體
  '[&_blockquote]:my-[30px] [&_blockquote]:rounded-r-2xl [&_blockquote]:border-l-[3px] [&_blockquote]:border-brand [&_blockquote]:bg-tint [&_blockquote]:px-[26px] [&_blockquote]:py-[22px] [&_blockquote]:text-[1.1rem] [&_blockquote]:font-medium [&_blockquote]:text-ink [&_blockquote]:leading-[1.5]',
  '[&_figure]:mt-6 [&_img]:rounded-[14px] [&_figcaption]:mt-2 [&_figcaption]:text-[0.85rem] [&_figcaption]:text-grey',
].join(' ');

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
      <ResourcesSubnav locale={locale} active={`/${kind}`} />

      <nav className="mx-auto max-w-content px-gutter py-4 text-[0.85rem] font-medium text-[#66787f]">
        <Link href={`/${locale}/${kind}`}>{listLabel}</Link>
        {a.category && (
          <>
            <span className="mx-2 text-[#b7c4c8]">/</span>
            <Link href={`/${locale}/${kind}?category=${a.category.slug}`}>
              {a.category.name}
            </Link>
          </>
        )}
        <span className="mx-2 text-[#b7c4c8]">/</span>
        <span className="text-ink">{a.title}</span>
      </nav>

      {/* 標題區 —— 量體 820px（比一般頁窄），分類是純色字而不是藥丸 */}
      <header className="mx-auto max-w-content px-gutter pt-[clamp(16px,2vw,24px)]">
        <div className="mx-auto max-w-[820px] text-center">
          {a.category && (
            <span className="text-[0.74rem] font-bold tracking-[0.14em] text-brand-deep uppercase">
              {a.category.name}
            </span>
          )}
          <h1 className="mt-3 text-[clamp(2rem,3.8vw,3rem)] font-normal">{a.title}</h1>
          {/* standfirst 是編輯者另寫的導言；沒寫就用摘要，兩者都沒有才不顯示 */}
          {(a.standfirst ?? a.excerpt) && (
            <p className="mt-4 text-[1.15rem]">{a.standfirst ?? a.excerpt}</p>
          )}

          <div className="mt-5 flex flex-wrap justify-center gap-2.5 text-[0.85rem] text-[#66787F]">
            {[
              a.publishedAt ? formatDate(a.publishedAt, locale) : null,
              a.author ? `${c.by} ${a.author}` : null,
              a.readMinutes !== null ? c.readMinutes(a.readMinutes) : null,
            ]
              .filter((x): x is string => Boolean(x))
              .map((part, i) => (
                <span key={part} className="contents">
                  {i > 0 && <span className="text-[#B7C4C8]">·</span>}
                  <span>{part}</span>
                </span>
              ))}
          </div>
        </div>
      </header>

      {a.cover && (
        <div className="mx-auto max-w-content px-gutter pt-[clamp(28px,3.5vw,44px)]">
          <img
            src={a.cover.url}
            srcSet={srcSetOf(a.cover)}
            sizes="(max-width: 1180px) 100vw, 1180px"
            alt={a.cover.alt ?? a.title}
            width={1600}
            height={900}
            decoding="async"
            className="aspect-[16/9] w-full rounded-[24px] object-cover"
          />
        </div>
      )}

      {/* 內文 + 側欄 */}
      <section className="mx-auto max-w-content px-gutter py-[clamp(40px,5vw,64px)]">
        <div className="grid items-start gap-[clamp(40px,5vw,72px)] lg:grid-cols-[minmax(0,1fr)_260px]">
          <article className="min-w-0 text-[1.06rem]">
            {a.body && (
              <div
                className={PROSE}
                // 已在寫入時以白名單淨化（Article profile），且 H2 的 anchor id
                // 由伺服器回填 —— 側欄 TOC 就是靠那些 id 跳的，前端不可以再動 HTML。
                dangerouslySetInnerHTML={{ __html: a.body }}
              />
            )}

            {a.event && <EventPanel event={a.event} locale={locale} copy={c} />}

            {a.gallery.length > 0 && (
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
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
                    className="aspect-[4/3] w-full rounded-[14px] object-cover"
                  />
                ))}
              </div>
            )}

            {a.disclaimer && (
              <div
                className="mt-10 text-[0.85rem] text-grey [&_p]:mt-2"
                dangerouslySetInnerHTML={{ __html: a.disclaimer }}
              />
            )}

            {(a.prev || a.next) && (
              <div className="mt-12 grid gap-4 border-t border-hairline pt-8 sm:grid-cols-2">
                {a.prev ? <NavCard item={a.prev} label={c.prev} /> : <span />}
                {a.next && <NavCard item={a.next} label={c.next} align="right" />}
              </div>
            )}
          </article>

          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            {a.toc.length > 0 && (
              <div>
                <p className="pb-2.5 text-[0.72rem] font-[620] tracking-[0.14em] text-[#8AA0A6] uppercase">
                  {c.onThisPage}
                </p>
                {/* 每一項左側一條色條；目前段落在 mockup4 是品牌青，
                    但捲動位置要 client JS 才知道，所以這裡一律用細線色。 */}
                <nav className="flex flex-col gap-0.5 text-[0.92rem]">
                  {a.toc.map((t) => (
                    <a
                      key={t.id}
                      href={`#${t.id}`}
                      className="border-l-[3px] border-hairline px-3.5 py-2 leading-[1.4] hover:border-brand hover:text-brand-deep"
                    >
                      {t.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            <ShareLinks title={a.title} locale={locale} />

            {a.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {a.tags.map((tag) => (
                  <span
                    key={tag.slug}
                    className="rounded-full border border-hairline px-3 py-1 text-[0.8rem]"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>

      {a.related.length > 0 && (
        <section className="bg-tint py-[clamp(56px,7vw,80px)]">
          <div className="mx-auto max-w-content px-gutter">
            <div className="mb-7 flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="text-[clamp(1.6rem,3vw,2.1rem)] font-normal">
                {kind === 'news' ? c.relatedNews : c.relatedInsights}
              </h2>
              <Link href={`/${locale}/${kind}`} className="font-[620] text-brand-deep">
                {kind === 'news' ? c.allNews : c.allInsights} →
              </Link>
            </div>
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="mt-10 rounded-[18px] border border-hairline bg-tint p-6">
      <h3 className="text-[1.1rem] font-semibold">{copy.eventDetails}</h3>
      <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-[0.88rem] text-grey">{label}</dt>
            <dd className="text-[0.95rem] text-ink">
              {label === copy.contact ? <a href={`mailto:${value}`}>{value}</a> : value}
            </dd>
          </div>
        ))}
      </dl>
      {event.ctaUrl && (
        <a
          href={event.ctaUrl}
          className="mt-5 inline-block rounded-full bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-deep hover:text-white"
        >
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
    <Link
      href={item.url}
      className={`rounded-[14px] border border-hairline p-5 transition hover:border-brand-bright ${
        align === 'right' ? 'sm:text-right' : ''
      }`}
    >
      <p className="text-[0.82rem] text-grey">{label}</p>
      <h3 className="mt-1 text-[1.02rem] font-semibold">{item.title}</h3>
    </Link>
  );
}
