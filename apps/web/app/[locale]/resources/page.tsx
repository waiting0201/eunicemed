import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type ArticleListItem } from '@/lib/api';
import { formatDate } from '@/lib/date';
import { isLocale, type Locale } from '@/lib/locale';
import {
  section,
  type ArticleRefEntry,
  type DownloadRefEntry,
  type PageContent,
  type SectionCta,
} from '@/lib/page';
import { PageHero } from '@/components/PageHero';
import { ResourcesSubnav } from '@/components/ResourcesSubnav';
import { SectionCtaLink } from '@/components/SectionCtaLink';

type Params = { locale: string };

type HeroSection = { eyebrow?: string; title?: string; lead?: string };
type HubCardsSection = {
  items?: { icon?: string; title?: string; body?: string; ctaLabel?: string; link?: SectionCta }[];
};
type RecentlyPublishedSection = {
  title?: string;
  allLink?: SectionCta;
  /** 'auto' | 'manual' */
  mode?: string;
  items?: { article?: string }[];
};
type QuickDownloadsSection = {
  title?: string;
  allLink?: SectionCta;
  items?: { download?: string }[];
};
type CtaPanelsSection = {
  items?: { title?: string; body?: string; ctaLabel?: string; link?: SectionCta }[];
};

const COPY: Record<Locale, { title: string }> = {
  en: { title: 'Resources' },
  'zh-TW': { title: '資源中心' },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const page = await api.page(locale, 'resources');
  const hero = page ? section<HeroSection>(page, 'hero') : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';

  return {
    title: hero?.title ?? COPY[locale].title,
    description: hero?.lead,
    alternates: {
      canonical: `${siteUrl}/${locale}/resources`,
      languages: { en: `${siteUrl}/en/resources`, 'zh-TW': `${siteUrl}/zh-TW/resources` },
    },
  };
}

export default async function ResourcesPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const page = await api.page(locale, 'resources');
  if (!page) notFound();

  const recent = section<RecentlyPublishedSection>(page, 'recentlyPublished');

  // mode=auto 時忽略 items，直接取最新的 News + Insights 混合（docs/09 §7.1）。
  // 兩邊各抓一頁再合併排序 —— API 沒有跨 type 的混合端點，而多開一支
  // 只為了這一個版位並不划算。
  const auto = recent?.mode !== 'manual';
  const [news, insights] = auto
    ? await Promise.all([api.articles(locale, 'news'), api.articles(locale, 'insights')])
    : [null, null];

  const hero = section<HeroSection>(page, 'hero');
  const hub = section<HubCardsSection>(page, 'hubCards');
  const quick = section<QuickDownloadsSection>(page, 'quickDownloads');
  const panels = section<CtaPanelsSection>(page, 'ctaPanels');

  const recentItems = auto
    ? mixLatest([...(news?.items ?? []), ...(insights?.items ?? [])], 3)
    : resolveArticles(recent?.items, page);

  return (
    <>
      <ResourcesSubnav locale={locale} active="/resources" />

      {/* 淺青漸層頁首，**無 band 圖**（docs/09 §7.1）*/}
      <div className="bg-[linear-gradient(180deg,#eaf8fa_0%,#ffffff_100%)]">
        <PageHero
          eyebrow={hero?.eyebrow ?? COPY[locale].title}
          title={hero?.title ?? COPY[locale].title}
          lead={hero?.lead}
        />
        <div className="h-8" />
      </div>

      {/* 四大入口卡 */}
      {hub?.items && hub.items.length > 0 && (
        <section className="mx-auto max-w-content px-6 py-14 lg:px-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {hub.items.map((item, i) => (
              <HubCard key={item.title ?? i} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* 最新發布 */}
      {recent && recentItems.length > 0 && (
        <section className="bg-tint py-14">
          <div className="mx-auto max-w-content px-6 lg:px-16">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-[clamp(1.6rem,3vw,2rem)] font-normal">{recent.title}</h2>
              <SectionCtaLink cta={recent.allLink} variant="text" />
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {recentItems.map((item) => (
                <Link
                  key={item.url}
                  href={item.url}
                  className="rounded-[16px] border border-hairline bg-white p-5 transition hover:border-brand-bright"
                >
                  <p className="text-[0.8rem] uppercase tracking-[0.1em] text-brand-deep">
                    {item.kind === 'news' ? (locale === 'en' ? 'News' : '消息') : locale === 'en' ? 'Insight' : '專欄'}
                    {item.publishedAt && (
                      <span className="ml-2 normal-case tracking-normal text-grey">
                        {formatDate(item.publishedAt, locale)}
                      </span>
                    )}
                  </p>
                  <h3 className="mt-1.5 text-[1.05rem] font-semibold">{item.title}</h3>
                  {item.excerpt && <p className="mt-1.5 text-[0.9rem]">{item.excerpt}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 熱門下載 —— 由 ref:Download 指定，refs 查不到的就略過 */}
      {quick && (
        <QuickDownloads section={quick} refs={page.refs.downloads} locale={locale} />
      )}

      {/* 兩塊底部 CTA */}
      {panels?.items && panels.items.length > 0 && (
        <section className="mx-auto max-w-content px-6 py-14 lg:px-16">
          <div className="grid gap-6 sm:grid-cols-2">
            {panels.items.map((panel, i) => (
              <div
                key={panel.title ?? i}
                className="rounded-[20px] border border-hairline bg-tint p-7"
              >
                {panel.title && <h3 className="text-[1.2rem] font-semibold">{panel.title}</h3>}
                {panel.body && <p className="mt-1.5 text-[0.95rem]">{panel.body}</p>}
                <SectionCtaLink
                  cta={panel.link}
                  label={panel.ctaLabel}
                  variant="text"
                  className="mt-4 inline-block"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function QuickDownloads({
  section: s,
  refs,
  locale,
}: {
  section: QuickDownloadsSection;
  refs: Record<string, DownloadRefEntry>;
  locale: Locale;
}) {
  const files = (s.items ?? [])
    .map((item) => (item.download ? refs[item.download] : undefined))
    .filter((d): d is DownloadRefEntry => Boolean(d?.url));

  if (files.length === 0) return null;

  return (
    <section className="mx-auto max-w-content px-6 py-14 lg:px-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-[clamp(1.6rem,3vw,2rem)] font-normal">{s.title}</h2>
        <SectionCtaLink cta={s.allLink} variant="text" />
      </div>
      <div className="space-y-3">
        {files.map((d) => (
          <a
            key={d.url!}
            href={d.url!}
            target="_blank"
            rel="noopener"
            className="flex items-center justify-between gap-4 rounded-[16px] border border-hairline p-4 transition hover:border-brand-bright hover:bg-tint"
          >
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{d.title}</span>
              <span className="block text-[0.86rem] text-grey">
                {[d.fileLocale, d.fileExt, formatSize(d.sizeBytes), d.description]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            <span className="shrink-0 font-semibold text-brand-deep">
              {locale === 'en' ? 'Download' : '下載'} ↓
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function HubCard({ item }: { item: NonNullable<HubCardsSection['items']>[number] }) {
  return (
    <div className="rounded-[20px] border border-hairline p-6">
      <HubIcon name={item.icon} />
      {item.title && <h3 className="mt-3 text-[1.15rem] font-semibold">{item.title}</h3>}
      {item.body && <p className="mt-1.5 text-[0.92rem]">{item.body}</p>}
      <SectionCtaLink
        cta={item.link}
        label={item.ctaLabel}
        variant="text"
        className="mt-4 inline-block"
      />
    </div>
  );
}

/**
 * 入口卡圖示。`icon` 是 schema 的固定字彙（enum，寫入時已驗過），
 * **新增值必須同時在這裡補圖形**。
 */
function HubIcon({ name }: { name?: string }) {
  const shapes: Record<string, React.ReactNode> = {
    faq: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3M12 17h.01" />
      </>
    ),
    insights: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ),
    downloads: (
      <>
        <path d="M12 3v11" />
        <path d="M8 11l4 4 4-4M5 20h14" />
      </>
    ),
    news: (
      <>
        <path d="M4 6h13v13H4z" />
        <path d="M17 9h3v8a2 2 0 0 1-3 1.7M7 10h7M7 14h5" />
      </>
    ),
  };

  const shape = name ? shapes[name] : undefined;
  if (!shape) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width="30"
      height="30"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
      className="text-brand-deep"
    >
      {shape}
    </svg>
  );
}

/** News + Insights 合併後依發布時間倒序取前 N 筆。 */
function mixLatest(items: ArticleListItem[], take: number) {
  return items
    .slice()
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .slice(0, take)
    .map((a) => ({
      title: a.title,
      excerpt: a.excerpt,
      kind: a.type,
      publishedAt: a.publishedAt,
      url: a.url,
    }));
}

/** mode=manual：由 `ref:Article` 指定。refs 查不到（未翻譯／未發布）就略過那一格。 */
function resolveArticles(items: { article?: string }[] | undefined, page: PageContent) {
  return (items ?? [])
    .map((item) => (item.article ? page.refs.articles[item.article] : undefined))
    .filter((a): a is ArticleRefEntry => Boolean(a))
    .map((a) => ({
      title: a.title,
      excerpt: a.excerpt,
      kind: a.kind,
      publishedAt: a.publishedAt,
      url: a.url,
    }));
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
