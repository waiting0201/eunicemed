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
    related: string;
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
    related: 'More stories',
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
    related: '延伸閱讀',
    readMinutes: (n) => `閱讀時間 ${n} 分鐘`,
    by: '作者',
  },
};

/** 內文的排版。richtext 由 API 淨化過，標籤集固定（docs/09 §9.2），這裡只負責樣式。 */
const PROSE = [
  '[&_p]:mt-4',
  '[&_h2]:mt-10 [&_h2]:text-[1.5rem] [&_h2]:font-semibold [&_h2]:scroll-mt-24',
  '[&_h3]:mt-7 [&_h3]:text-[1.15rem] [&_h3]:font-semibold',
  '[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:mt-1.5',
  '[&_a]:text-brand-deep [&_a]:underline',
  '[&_blockquote]:mt-6 [&_blockquote]:border-l-2 [&_blockquote]:border-brand [&_blockquote]:pl-4 [&_blockquote]:italic',
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

      <nav className="mx-auto max-w-content px-6 py-4 text-[0.85rem] font-medium text-[#66787f] lg:px-16">
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

      {/* 標題區 */}
      <header className="mx-auto max-w-content px-6 lg:px-16">
        <div className="mx-auto max-w-[760px] text-center">
          {a.category && (
            <span className="inline-block rounded-full bg-tint-deep px-3.5 py-1 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-deep">
              {a.category.name}
            </span>
          )}
          <h1 className="mt-3.5 text-[clamp(2rem,3.6vw,2.8rem)] font-normal">{a.title}</h1>
          {a.standfirst && <p className="mt-3.5 text-[1.1rem]">{a.standfirst}</p>}

          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.88rem] text-grey">
            {a.publishedAt && <span>{formatDate(a.publishedAt, locale)}</span>}
            {a.author && <span>{c.by} {a.author}</span>}
            {a.readMinutes !== null && <span>{c.readMinutes(a.readMinutes)}</span>}
          </p>
        </div>
      </header>

      {a.cover && (
        <div className="mx-auto mt-9 max-w-content px-6 lg:px-16">
          <img
            src={a.cover.url}
            srcSet={srcSetOf(a.cover)}
            sizes="(max-width: 1180px) 100vw, 1180px"
            alt={a.cover.alt ?? a.title}
            width={1600}
            height={900}
            decoding="async"
            className="aspect-[16/9] w-full rounded-[22px] object-cover"
          />
        </div>
      )}

      {/* 內文 + 側欄 */}
      <section className="mx-auto max-w-content px-6 py-14 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_280px]">
          <article className="min-w-0">
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
                <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.14em] text-grey">
                  {c.onThisPage}
                </p>
                <nav className="flex flex-col gap-1.5 border-l border-hairline pl-3 text-[0.9rem]">
                  {a.toc.map((t) => (
                    <a key={t.id} href={`#${t.id}`} className="hover:text-brand-deep">
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
        <section className="bg-tint py-14">
          <div className="mx-auto max-w-content px-6 lg:px-16">
            <h2 className="mb-8 text-[clamp(1.6rem,3vw,2rem)] font-normal">{c.related}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {a.related.map((r) => (
                <ArticleCard
                  key={r.slug}
                  locale={locale}
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
