import { css } from '@/lib/css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, type DownloadFile } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { PageHero } from '@/components/PageHero';
import { ResourcesSubnav } from '@/components/ResourcesSubnav';
import { SideFilter } from '@/components/SideFilter';

/** 樣式逐字取自 `mockup4/Downloads.dc.html`。 */
const S = {
  section: css`max-width:1180px;margin:0 auto;padding:clamp(48px,6vw,72px) clamp(24px,5vw,64px);`,
  grid: css`display:grid;grid-template-columns:240px 1fr;gap:clamp(32px,4vw,56px);align-items:start;`,
  row: css`display:flex;align-items:center;gap:18px;padding:20px 22px;border:1px solid #DFE9EC;border-radius:16px;margin-bottom:14px;`,
  icon: css`width:44px;height:44px;flex:0 0 auto;border-radius:12px;background:#E9F8FA;color:#0092A8;display:flex;align-items:center;justify-content:center;`,
  body: css`flex:1;`,
  title: css`color:#16333B;font-weight:570;font-size:1.08rem;`,
  meta: css`font-size:.85rem;color:#66787F;`,
  action: css`color:#0092A8;font-weight:620;white-space:nowrap;`,
  /** 空狀態是本站補的（mockup4 是靜態稿） */
  empty: css`padding:64px 0;text-align:center;color:#8AA0A6;`,
} as const;

type Params = { locale: string };
type Search = { type?: string };

/**
 * 下載類型是**固定字彙**（`catalog` / `manual` / `certificate`），
 * API 的 facet label 直接回 slug —— 因為那不是可編輯內容，翻譯屬於介面而非資料。
 */
const TYPE_LABEL: Record<Locale, Record<string, string>> = {
  en: { catalog: 'Catalogues', manual: 'Manuals', certificate: 'Certifications' },
  'zh-TW': { catalog: '型錄', manual: '使用說明', certificate: '認證文件' },
};

const COPY: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    lead: string;
    categories: string;
    empty: string;
    download: string;
  }
> = {
  en: {
    eyebrow: 'Downloads',
    title: 'Catalogues & documents',
    lead: 'Product catalogues, certification documents and fitting manuals — ready to download.',
    categories: 'Categories',
    empty: 'No documents in this category yet.',
    download: 'Download',
  },
  'zh-TW': {
    eyebrow: '資料下載',
    title: '型錄與文件',
    lead: '產品型錄、認證文件與穿戴說明，皆可直接下載。',
    categories: '分類',
    empty: '這個分類目前還沒有文件。',
    download: '下載',
  },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';
  const c = COPY[locale];

  return {
    title: c.title,
    description: c.lead,
    alternates: {
      canonical: `${siteUrl}/${locale}/downloads`,
      languages: { en: `${siteUrl}/en/downloads`, 'zh-TW': `${siteUrl}/zh-TW/downloads` },
    },
  };
}

export default async function DownloadsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const q = await searchParams;
  if (!isLocale(locale)) notFound();

  const result = await api.downloads(locale, q.type);
  const c = COPY[locale];

  return (
    <>
      <ResourcesSubnav locale={locale} active="/downloads" />
      <PageHero eyebrow={c.eyebrow} title={c.title} lead={c.lead} />

      <section style={S.section}>
        <div style={S.grid}>
          <SideFilter
            label={c.categories}
            param="type"
            facets={result.facets?.types ?? []}
            active={q.type}
            basePath={`/${locale}/downloads`}
            locale={locale}
            labelOf={(f) => TYPE_LABEL[locale][f.slug] ?? f.label}
          />

          <div>
            {result.items.length === 0 ? (
              <p style={S.empty}>{c.empty}</p>
            ) : (
              result.items.map((d) => (
                <a
                  key={d.id}
                  href={d.url}
                  // 檔案在 Blob 上（跨網域），download 屬性對跨來源無效 ——
                  // 交給瀏覽器依 Content-Type 決定開啟或下載
                  target="_blank"
                  rel="noopener"
                  style={S.row}
                  data-hover="edge"
                >
                  <span style={S.icon}>
                    <FileIcon />
                  </span>

                  <span style={S.body}>
                    <span style={{ ...S.title, display: 'block' }}>{d.title}</span>
                    <span style={{ ...S.meta, display: 'block' }}>{meta(d)}</span>
                  </span>

                  <span style={S.action}>{c.download} ↓</span>
                </a>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * `EN · PDF · 3.2 MB · 說明`。
 * `fileLocale` 是**檔案的語言**而不是站台語系 —— 中文站也可能列出 EN 的型錄，
 * 那不是漏翻（docs/05 §3.8）。
 */
function meta(d: DownloadFile): string {
  return [d.fileLocale, d.fileExt, d.description].filter(Boolean).join(' · ');
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <path d="M6 2h9l5 5v15H6z" />
      <path d="M15 2v5h5" />
    </svg>
  );
}
