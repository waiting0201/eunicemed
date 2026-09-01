import { css } from '@/lib/css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, type MediaRef } from '@/lib/api';
import { formatDate } from '@/lib/date';
import { isLocale, type Locale } from '@/lib/locale';
import { section } from '@/lib/page';
import { pageMetadata } from '@/lib/seo';
import { PageBand } from '@/components/PageBand';
import { PageHero } from '@/components/PageHero';

/** 樣式逐字取自 `mockup4/Privacy.dc.html`。內文排版在 globals.css 的 `.m4-legal`。 */
const S = {
  body: css`max-width:820px;margin:0 auto;padding:clamp(48px,6vw,72px) clamp(24px,5vw,64px);`,
  /** 「最後更新」那一行是本站補的：mockup4 把日期寫死在頁首 lead 裡 */
  updated: css`font-size:.88rem;color:#66787F;`,
} as const;

type Params = { locale: string };

type HeroSection = { band?: MediaRef };
type ContentSection = { lastUpdated?: string; body?: string };

// 標點也是語系的一部分：英文用半形冒號 + 空格，中文用全形冒號。
// 硬寫「：」會讓英文頁出現中文標點（docs/08 §5.2 的語言純度不只是字，也包含排印）。
// 頁首的 eyebrow 與 h1 在 mockup4 是兩個不同的字串（`Privacy & Legal` / `Privacy policy`），
// 先前兩處共用同一個值。條文本身留在 CMS —— 法務文件必須能改，而且不該等發版。
const COPY: Record<Locale, { eyebrow: string; title: string; lastUpdated: string }> = {
  en: { eyebrow: 'Privacy & Legal', title: 'Privacy policy', lastUpdated: 'Last updated: ' },
  'zh-TW': { eyebrow: '隱私權與法律聲明', title: '隱私權政策', lastUpdated: '最後更新：' },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};


  return {
    ...(await pageMetadata({ locale, path: '/privacy', title: COPY[locale].title })),
    // 法務頁不需要被當成內容頁推廣，但仍須可索引（footer 連結）
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const page = await api.page(locale, 'privacy');
  if (!page) notFound();

  const hero = section<HeroSection>(page, 'hero');
  const content = section<ContentSection>(page, 'content');
  const c = COPY[locale];

  return (
    <>
      <PageBand image={hero?.band} />

      <PageHero eyebrow={c.eyebrow} title={c.title} />

      {/* mockup4 這頁的量體是 820px（不是全站的 1180px）—— 法務條文要窄一點才讀得下去 */}
      <section style={S.body}>
        <div>
          {content?.lastUpdated && (
            <p style={S.updated}>
              {c.lastUpdated}
              {formatDate(content.lastUpdated, locale)}
            </p>
          )}

          {content?.body && (
            <div
              // Legal profile 允許 h2/h3（Services/HtmlSanitizers.cs）——
              // 法務條文靠編號小節閱讀，這是與一般區段 richtext 的差別。
              className="m4-legal"
              dangerouslySetInnerHTML={{ __html: content.body }}
            />
          )}
        </div>
      </section>
    </>
  );
}
