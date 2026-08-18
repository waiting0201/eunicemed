import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, type MediaRef } from '@/lib/api';
import { formatDate } from '@/lib/date';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { section } from '@/lib/page';
import { PageHero } from '@/components/PageHero';

type Params = { locale: string };

type HeroSection = { band?: MediaRef; eyebrow?: string; title?: string };
type ContentSection = { lastUpdated?: string; body?: string };

// 標點也是語系的一部分：英文用半形冒號 + 空格，中文用全形冒號。
// 硬寫「：」會讓英文頁出現中文標點（docs/08 §5.2 的語言純度不只是字，也包含排印）。
const COPY: Record<Locale, { title: string; lastUpdated: string }> = {
  en: { title: 'Privacy & Legal', lastUpdated: 'Last updated: ' },
  'zh-TW': { title: '隱私權與法律聲明', lastUpdated: '最後更新：' },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const page = await api.page(locale, 'privacy');
  const hero = page ? section<HeroSection>(page, 'hero') : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';

  return {
    title: hero?.title ?? COPY[locale].title,
    alternates: {
      canonical: `${siteUrl}/${locale}/privacy`,
      languages: { en: `${siteUrl}/en/privacy`, 'zh-TW': `${siteUrl}/zh-TW/privacy` },
    },
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
      {hero?.band && (
        <img
          src={hero.band.url}
          srcSet={srcSetOf(hero.band)}
          sizes="100vw"
          alt={hero.band.alt ?? ''}
          width={2560}
          height={480}
          decoding="async"
          className="h-[clamp(160px,18.75vw,360px)] w-full object-cover"
        />
      )}

      <PageHero eyebrow={hero?.eyebrow ?? c.title} title={hero?.title ?? c.title} />

      <section className="mx-auto max-w-content px-6 py-14 lg:px-16">
        <div className="mx-auto max-w-[74ch]">
          {content?.lastUpdated && (
            <p className="text-[0.88rem] text-grey">
              {c.lastUpdated}
              {formatDate(content.lastUpdated, locale)}
            </p>
          )}

          {content?.body && (
            <div
              // Legal profile 允許 h2/h3（Services/HtmlSanitizers.cs）——
              // 法務條文靠編號小節閱讀，這是與一般區段 richtext 的差別。
              className="mt-6 [&_a]:text-brand-deep [&_a]:underline [&_h2]:mt-9 [&_h2]:text-[1.3rem] [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-[1.1rem] [&_h3]:font-semibold [&_li]:mt-1.5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: content.body }}
            />
          )}
        </div>
      </section>
    </>
  );
}
