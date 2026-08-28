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
import { css } from '@/lib/css';
import { ResourcesSubnav } from '@/components/ResourcesSubnav';
import { SectionCtaLink } from '@/components/SectionCtaLink';

/** 樣式逐字取自 `mockup4/Resources.dc.html`。 */
const S = {
  hero: css`background:linear-gradient(160deg,#F4FAFC 0%,#E3F2F6 46%,#CFE9EF 100%);padding:clamp(52px,6vw,84px) clamp(24px,5vw,64px) clamp(40px,5vw,60px);`,
  heroInner: css`max-width:1180px;margin:0 auto;text-align:center;`,
  heroEyebrow: css`color:#0092A8;font-weight:680;letter-spacing:.16em;text-transform:uppercase;font-size:.78rem;`,
  heroTitle: css`font-weight:400;font-size:clamp(2.1rem,4vw,3.1rem);margin:12px auto 0;max-width:760px;`,
  heroStrong: css`font-weight:640;`,
  heroLead: css`margin:16px auto 0;max-width:620px;font-size:1.1rem;`,

  hubs: css`max-width:1180px;margin:0 auto;padding:clamp(48px,6vw,72px) clamp(24px,5vw,64px) clamp(24px,3vw,36px);`,
  hubGrid: css`display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:24px;`,
  hub: css`display:flex;flex-direction:column;border:1px solid #DFE9EC;border-radius:20px;padding:30px 28px;`,
  hubIcon: css`width:46px;height:46px;border-radius:14px;background:#E9F8FA;color:#0092A8;display:flex;align-items:center;justify-content:center;`,
  hubTitle: css`font-weight:570;font-size:1.3rem;margin:18px 0 8px;`,
  hubBody: css`font-size:.95rem;flex:1;`,
  hubCta: css`margin-top:18px;color:#0092A8;font-weight:620;font-size:.9rem;`,

  strip: css`max-width:1180px;margin:0 auto;padding:clamp(32px,4vw,52px) clamp(24px,5vw,64px);`,
  stripHead: css`display:flex;align-items:baseline;justify-content:space-between;gap:20px;flex-wrap:wrap;`,
  stripTitle: css`font-weight:400;font-size:clamp(1.6rem,2.6vw,2.1rem);`,
  stripAll: css`color:#0092A8;font-weight:620;font-size:.92rem;`,
  stripGrid: css`display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:28px;margin-top:28px;`,
  stripCard: css`display:block;`,
  stripCover: css`position:relative;aspect-ratio:16/10;border-radius:18px;overflow:hidden;background:#F0F6F8;`,
  stripImg: css`display:block;width:100%;height:100%;object-fit:cover;`,
  stripBody: css`margin-top:16px;`,
  stripEyebrow: css`color:#0092A8;font-weight:700;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;`,
  stripCardTitle: css`font-weight:570;font-size:1.22rem;margin:6px 0;`,
  stripExcerpt: css`font-size:.92rem;`,

  quick: css`background:#F0F6F8;border-top:1px solid #DFE9EC;border-bottom:1px solid #DFE9EC;padding:clamp(48px,6vw,72px) clamp(24px,5vw,64px);`,
  quickInner: css`max-width:1180px;margin:0 auto;`,
  quickGrid: css`display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:28px;`,
  quickRow: css`display:flex;align-items:center;gap:16px;border:1px solid #DFE9EC;border-radius:14px;padding:18px 20px;`,
  quickIcon: css`flex:none;width:38px;height:38px;border-radius:10px;background:#E9F8FA;color:#0092A8;display:flex;align-items:center;justify-content:center;font-size:.66rem;font-weight:700;letter-spacing:.04em;`,
  quickTitle: css`color:#16333B;font-weight:600;display:block;`,
  quickMeta: css`font-size:.85rem;color:#66787F;`,

  cta: css`max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,88px) clamp(24px,5vw,64px);`,
  ctaGrid: css`display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;`,
  ctaSolid: css`border-radius:22px;background:linear-gradient(150deg,#00B5CD 0%,#0092A8 100%);color:#fff;padding:clamp(30px,4vw,44px);`,
  ctaOutline: css`border:1px solid #DFE9EC;border-radius:22px;padding:clamp(30px,4vw,44px);`,
  ctaTitleSolid: css`color:#fff;font-weight:400;font-size:clamp(1.5rem,2.4vw,2rem);`,
  ctaTitle: css`font-weight:400;font-size:clamp(1.5rem,2.4vw,2rem);`,
  ctaBodySolid: css`margin-top:12px;color:#DFF6FA;`,
  ctaBody: css`margin-top:12px;`,
  ctaButtonSolid: css`display:inline-block;margin-top:22px;background:#fff;color:#0092A8;font-weight:620;font-size:.92rem;padding:11px 26px;border-radius:999px;`,
  ctaButton: css`display:inline-block;margin-top:22px;border:1.5px solid #00B5CD;color:#0092A8;font-weight:620;font-size:.92rem;padding:10px 26px;border-radius:999px;`,
} as const;

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

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
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
      <section style={S.hero}>
        <div style={S.heroInner}>
          <p style={S.heroEyebrow}>{hero?.eyebrow ?? COPY[locale].title}</p>
          {/* mockup4 把標題後半加粗到 640；沿用首頁的 `**…**` 標記慣例（docs/09 §2） */}
          <h1 style={S.heroTitle}>
            <Emphasis text={hero?.title ?? COPY[locale].title} />
          </h1>
          {hero?.lead && <p style={S.heroLead}>{hero.lead}</p>}
        </div>
      </section>

      {/* 四大入口卡 */}
      {hub?.items && hub.items.length > 0 && (
        <section style={S.hubs}>
          <div style={S.hubGrid}>
            {hub.items.map((item, i) => (
              <HubCard key={item.title ?? i} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* 最新發布 */}
      {recent && recentItems.length > 0 && (
        <section style={S.strip}>
          <div style={S.stripHead}>
            <h2 style={S.stripTitle}>{recent.title}</h2>
            <SectionCtaLink cta={recent.allLink} variant="text" style={S.stripAll} />
          </div>
          <div style={S.stripGrid}>
            {recentItems.map((item) => (
              <Link key={item.url} href={item.url} style={S.stripCard}>
                <div style={S.stripCover}>
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
                      style={S.stripImg}
                    />
                  )}
                </div>
                <div style={S.stripBody}>
                  <span style={S.stripEyebrow}>
                    {item.kind === 'news'
                      ? locale === 'en'
                        ? 'News'
                        : '消息'
                      : locale === 'en'
                        ? 'Insights'
                        : '專欄'}
                  </span>
                  <h3 style={S.stripCardTitle}>{item.title}</h3>
                  {item.excerpt && <p style={S.stripExcerpt}>{item.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 熱門下載 —— 由 ref:Download 指定，refs 查不到的就略過 */}
      {quick && <QuickDownloads section={quick} refs={page.refs.downloads} />}

      {/* 兩塊底部 CTA */}
      {panels?.items && panels.items.length > 0 && (
        <section style={S.cta}>
          <div style={S.ctaGrid}>
            {panels.items.map((panel, i) => {
              // 第一塊是青色漸層面板配白字，其餘是白底細框（mockup4）
              const solid = i === 0;
              return (
                <div key={panel.title ?? i} style={solid ? S.ctaSolid : S.ctaOutline}>
                  {panel.title && (
                    <h2 style={solid ? S.ctaTitleSolid : S.ctaTitle}>{panel.title}</h2>
                  )}
                  {panel.body && <p style={solid ? S.ctaBodySolid : S.ctaBody}>{panel.body}</p>}
                  <SectionCtaLink
                    cta={panel.link}
                    label={panel.ctaLabel}
                    style={solid ? S.ctaButtonSolid : S.ctaButton}
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
    <section style={S.quick}>
      <div style={S.quickInner}>
        <div style={S.stripHead}>
          <h2 style={S.stripTitle}>{s.title}</h2>
          <SectionCtaLink cta={s.allLink} variant="text" style={S.stripAll} />
        </div>
        <div style={S.quickGrid}>
          {files.map((d) => (
            <a key={d.url!} href={d.url!} target="_blank" rel="noopener" style={S.quickRow}>
              <span style={S.quickIcon}>{(d.fileExt ?? 'PDF').toUpperCase()}</span>
              <span>
                <b style={S.quickTitle}>{d.title}</b>
                <span style={S.quickMeta}>
                  {[d.fileLocale, d.fileExt, formatSize(d.sizeBytes)].filter(Boolean).join(' · ')}
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
    <div style={S.hub}>
      <HubIcon name={item.icon} />
      {item.title && <h3 style={S.hubTitle}>{item.title}</h3>}
      {item.body && <p style={S.hubBody}>{item.body}</p>}
      <SectionCtaLink cta={item.link} label={item.ctaLabel} variant="text" style={S.hubCta} />
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
    <span style={S.hubIcon}>
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

/** `**…**` 標記的加粗字。與首頁的 `Highlight` 同一套標記，但這裡是加粗而非染色。 */
function Emphasis({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} style={S.heroStrong}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
