import { css } from '@/lib/css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { ContactCta } from '@/components/ContactCta';
import { PageHero } from '@/components/PageHero';
import { ResourcesSubnav } from '@/components/ResourcesSubnav';
import { SideFilter } from '@/components/SideFilter';

/** 樣式逐字取自 `mockup4/FAQ.dc.html`。展開狀態與答案排版在 globals.css。 */
const S = {
  section: css`max-width:1180px;margin:0 auto;padding:clamp(48px,6vw,72px) clamp(24px,5vw,64px);`,
  grid: css`display:grid;grid-template-columns:260px 1fr;gap:clamp(32px,4vw,56px);align-items:start;`,
  item: css`border-bottom:1px solid #DFE9EC;`,
  summary: css`display:flex;justify-content:space-between;align-items:center;gap:20px;cursor:pointer;padding:20px 4px;`,
  question: css`color:#16333B;font-weight:570;font-size:1.08rem;`,
  icon: css`color:#0092A8;font-size:1.5rem;font-weight:300;line-height:1;transition:transform .3s cubic-bezier(.34,1.56,.64,1);flex:0 0 auto;`,
  answer: css`overflow:hidden;min-height:0;padding:0 4px 20px;max-width:72ch;`,
  /** 空狀態是本站補的（mockup4 是靜態稿） */
  empty: css`padding:64px 0;text-align:center;color:#8AA0A6;`,
} as const;

type Params = { locale: string };
type Search = { category?: string };

const COPY: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    lead: string;
    categories: string;
    empty: string;
    ctaTitle: string;
    ctaBody: string;
  }
> = {
  en: {
    eyebrow: 'FAQ',
    title: 'Questions, answered',
    lead: 'Find guidance on product use, sizing and working with us.',
    categories: 'Categories',
    empty: 'No questions in this category yet.',
    ctaTitle: "Can't find your answer?",
    ctaBody: 'Our team is glad to help with product or partnership questions.',
  },
  'zh-TW': {
    eyebrow: '常見問題',
    title: '你想知道的，都在這裡',
    lead: '產品使用、尺寸選擇與合作洽詢的常見疑問。',
    categories: '分類',
    empty: '這個分類目前還沒有問題。',
    ctaTitle: '沒找到你要的答案？',
    ctaBody: '產品或合作相關問題，歡迎直接與我們聯絡。',
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
      canonical: `${siteUrl}/${locale}/faq`,
      languages: { en: `${siteUrl}/en/faq`, 'zh-TW': `${siteUrl}/zh-TW/faq` },
    },
  };
}

export default async function FaqPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const q = await searchParams;
  if (!isLocale(locale)) notFound();

  const result = await api.faqs(locale, q.category);
  const c = COPY[locale];

  return (
    <>
      <ResourcesSubnav locale={locale} active="/faq" />
      <PageHero eyebrow={c.eyebrow} title={c.title} lead={c.lead} />

      <section style={S.section}>
        <div style={S.grid} data-r="stack">
          <SideFilter
            label={c.categories}
            param="category"
            facets={result.facets?.categories ?? []}
            active={q.category}
            basePath={`/${locale}/faq`}
            locale={locale}
          />

          <div>
            {result.items.length === 0 ? (
              <p style={S.empty}>{c.empty}</p>
            ) : (
              result.items.map((faq) => (
                <details key={faq.id} className="m4-faq" style={S.item}>
                  {/*
                    用原生 <details> 而不是 useState 的手風琴：
                    這頁不需要任何 client JS，且鍵盤操作與無障礙語意瀏覽器已經給了。
                    marker:hidden 是為了拿掉預設三角形，改用右側的 +/−。
                  */}
                  <summary style={S.summary}>
                    <h3 style={S.question}>{faq.question}</h3>
                    <span aria-hidden className="m4-faq-icon" style={S.icon}>
                      +
                    </span>
                  </summary>
                  <div
                    className="m4-answer"
                    style={S.answer}
                    // 已在寫入時以白名單淨化，前端不再淨化一次（見產品詳情頁的說明）
                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                  />
                </details>
              ))
            )}

            <ContactCta locale={locale} title={c.ctaTitle} body={c.ctaBody} />
          </div>
        </div>
      </section>
    </>
  );
}
