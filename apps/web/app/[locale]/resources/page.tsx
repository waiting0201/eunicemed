import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type ArticleListItem } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import {
  section,
  type ArticleRefEntry,
  type DownloadRefEntry,
  type PageContent,
  type SectionCta,
} from '@/lib/page';
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

      {/* 淺青漸層頁首，**無 band 圖**（docs/09 §7.1）。
          這頁的標題比通用 PageHero 大一階，所以不共用那支元件。 */}
      <section className="bg-[linear-gradient(160deg,#F4FAFC_0%,#E3F2F6_46%,#CFE9EF_100%)] px-gutter pt-[clamp(52px,6vw,84px)] pb-[clamp(40px,5vw,60px)]">
        <div className="mx-auto max-w-content text-center">
          <p className="text-[0.78rem] font-[680] uppercase tracking-[0.16em] text-brand-deep">
            {hero?.eyebrow ?? COPY[locale].title}
          </p>
          <h1 className="mx-auto mt-3 max-w-[760px] text-[clamp(2.1rem,4vw,3.1rem)] font-normal">
            {hero?.title ?? COPY[locale].title}
          </h1>
          {hero?.lead && (
            <p className="mx-auto mt-4 max-w-[620px] text-[1.1rem]">{hero.lead}</p>
          )}
        </div>
      </section>

      {/* 四大入口卡 */}
      {hub?.items && hub.items.length > 0 && (
        <section className="mx-auto max-w-content px-gutter pt-[clamp(48px,6vw,72px)] pb-[clamp(24px,3vw,36px)]">
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
            {hub.items.map((item, i) => (
              <HubCard key={item.title ?? i} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* 最新發布 */}
      {recent && recentItems.length > 0 && (
        <section className="mx-auto max-w-content px-gutter py-[clamp(32px,4vw,52px)]">
          <div className="flex flex-wrap items-baseline justify-between gap-5">
            <h2 className="text-[clamp(1.6rem,2.6vw,2.1rem)] font-normal">{recent.title}</h2>
            <SectionCtaLink cta={recent.allLink} variant="text" className="text-[0.92rem]" />
          </div>
          <div className="mt-7 grid gap-7 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {recentItems.map((item) => (
              <Link key={item.url} href={item.url} className="group block">
                <div className="aspect-[16/10] overflow-hidden rounded-[18px] bg-tint-deep">
                  {item.coverUrl && (
                    <img
                      src={item.coverUrl}
                      srcSet={item.coverSrcSet}
                      sizes="(max-width: 640px) 100vw, 360px"
                      alt={item.coverAlt ?? item.title}
                      loading="lazy"
                      decoding="async"
                      width={800}
                      height={500}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  )}
                </div>
                <div className="mt-4">
                  <span className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-deep">
                    {item.kind === 'news'
                      ? locale === 'en'
                        ? 'News'
                        : '消息'
                      : locale === 'en'
                        ? 'Insights'
                        : '專欄'}
                  </span>
                  <h3 className="my-1.5 text-[1.22rem] font-[570]">{item.title}</h3>
                  {item.excerpt && <p className="text-[0.92rem]">{item.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 熱門下載 —— 由 ref:Download 指定，refs 查不到的就略過 */}
      {quick && (
        <QuickDownloads section={quick} refs={page.refs.downloads} />
      )}

      {/* 兩塊底部 CTA */}
      {panels?.items && panels.items.length > 0 && (
        <section className="mx-auto max-w-content px-gutter py-[clamp(56px,7vw,88px)]">
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {panels.items.map((panel, i) => {
              // 第一塊是青色漸層面板配白字，其餘是白底細框（mockup4）
              const solid = i === 0;
              return (
                <div
                  key={panel.title ?? i}
                  className={`rounded-[22px] p-[clamp(30px,4vw,44px)] ${
                    solid
                      ? 'bg-[linear-gradient(150deg,#00B5CD_0%,#0092A8_100%)] text-white'
                      : 'border border-hairline'
                  }`}
                >
                  {panel.title && (
                    <h2
                      className={`text-[clamp(1.5rem,2.4vw,2rem)] font-normal ${
                        solid ? 'text-white' : ''
                      }`}
                    >
                      {panel.title}
                    </h2>
                  )}
                  {panel.body && (
                    <p className={`mt-3 ${solid ? 'text-[#DFF6FA]' : ''}`}>{panel.body}</p>
                  )}
                  <SectionCtaLink
                    cta={panel.link}
                    label={panel.ctaLabel}
                    variant={solid ? 'onDark' : 'outline'}
                    className="mt-[22px] text-[0.92rem]"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function QuickDownloads({
  section: s,
  refs,
}: {
  section: QuickDownloadsSection;
  refs: Record<string, DownloadRefEntry>;
}) {
  const files = (s.items ?? [])
    .map((item) => (item.download ? refs[item.download] : undefined))
    .filter((d): d is DownloadRefEntry => Boolean(d?.url));

  if (files.length === 0) return null;

  return (
    /* mockup4：`#F0F6F8` 帶，上下各一條細線 */
    <section className="border-y border-hairline bg-tint-deep px-gutter py-[clamp(48px,6vw,72px)]">
      <div className="mx-auto max-w-content">
        <div className="flex flex-wrap items-baseline justify-between gap-5">
          <h2 className="text-[clamp(1.6rem,2.6vw,2.1rem)] font-normal">{s.title}</h2>
          <SectionCtaLink cta={s.allLink} variant="text" className="text-[0.92rem]" />
        </div>
        <div className="mt-7 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {files.map((d) => (
            <a
              key={d.url!}
              href={d.url!}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-4 rounded-[14px] border border-hairline bg-white px-5 py-[18px]"
            >
              <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-[#E9F8FA] text-[0.66rem] font-bold tracking-[0.04em] text-brand-deep">
                {(d.fileExt ?? 'PDF').toUpperCase()}
              </span>
              <span className="min-w-0">
                <b className="block font-semibold text-ink">{d.title}</b>
                <span className="block text-[0.85rem] text-[#66787F]">
                  {[d.fileLocale, d.fileExt, formatSize(d.sizeBytes)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function HubCard({ item }: { item: NonNullable<HubCardsSection['items']>[number] }) {
  return (
    /* 卡片等高：內文 flex-1 把 CTA 壓到底（mockup4 的 `flex:1`） */
    <div className="flex flex-col rounded-[20px] border border-hairline px-7 py-[30px]">
      <HubIcon name={item.icon} />
      {item.title && <h3 className="mt-[18px] mb-2 text-[1.3rem] font-[570]">{item.title}</h3>}
      {item.body && <p className="flex-1 text-[0.95rem]">{item.body}</p>}
      <SectionCtaLink
        cta={item.link}
        label={item.ctaLabel}
        variant="text"
        className="mt-[18px] inline-block text-[0.9rem]"
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
    <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-[#E9F8FA] text-brand-deep">
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden
      >
        {shape}
      </svg>
    </span>
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
      // `ref:Article` 解出來的封面只有一個 URL，所以這裡也降成 URL + srcSet
      coverUrl: a.cover?.url ?? null,
      coverSrcSet: a.cover ? srcSetOf(a.cover) : undefined,
      coverAlt: a.cover?.alt ?? null,
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
      coverUrl: a.cover,
      coverSrcSet: undefined,
      coverAlt: null,
    }));
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
