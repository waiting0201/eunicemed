import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, type DownloadFile } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { PageHero } from '@/components/PageHero';
import { ResourcesSubnav } from '@/components/ResourcesSubnav';
import { SideFilter } from '@/components/SideFilter';

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
  { eyebrow: string; title: string; lead: string; categories: string; empty: string; download: string }
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

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
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

      <section className="mx-auto max-w-[--container-content] px-6 py-14 lg:px-16">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          <SideFilter
            label={c.categories}
            param="type"
            facets={result.facets?.types ?? []}
            active={q.type}
            basePath={`/${locale}/downloads`}
            locale={locale}
            labelOf={(f) => TYPE_LABEL[locale][f.slug] ?? f.label}
          />

          <div className="space-y-3">
            {result.items.length === 0 ? (
              <p className="py-16 text-center text-[--color-grey]">{c.empty}</p>
            ) : (
              result.items.map((d) => (
                <a
                  key={d.id}
                  href={d.url}
                  // 檔案在 Blob 上（跨網域），download 屬性對跨來源無效 ——
                  // 交給瀏覽器依 Content-Type 決定開啟或下載
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-4 rounded-[16px] border border-[--color-hairline] p-4 transition hover:border-[--color-brand-bright] hover:bg-[--color-tint]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#e9f8fa] text-[--color-brand-deep]">
                    <FileIcon />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[--color-ink]">{d.title}</span>
                    <span className="block text-[0.88rem] text-[--color-grey]">
                      {meta(d)}
                    </span>
                  </span>

                  <span className="shrink-0 whitespace-nowrap font-semibold text-[--color-brand-deep]">
                    {c.download} ↓
                  </span>
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
  return [d.fileLocale, d.fileExt, formatSize(d.sizeBytes), d.description]
    .filter(Boolean)
    .join(' · ');
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M6 2h9l5 5v15H6z" />
      <path d="M15 2v5h5" />
    </svg>
  );
}
