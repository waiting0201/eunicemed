import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { ContactCta } from '@/components/ContactCta';
import { PageHero } from '@/components/PageHero';
import { ResourcesSubnav } from '@/components/ResourcesSubnav';
import { SideFilter } from '@/components/SideFilter';

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

      <section className="mx-auto max-w-content px-6 py-14 lg:px-16">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
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
              <p className="py-16 text-center text-grey">{c.empty}</p>
            ) : (
              result.items.map((faq) => (
                <details
                  key={faq.id}
                  className="group border-b border-hairline py-1"
                >
                  {/*
                    用原生 <details> 而不是 useState 的手風琴：
                    這頁不需要任何 client JS，且鍵盤操作與無障礙語意瀏覽器已經給了。
                    marker:hidden 是為了拿掉預設三角形，改用右側的 +/−。
                  */}
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 marker:hidden [&::-webkit-details-marker]:hidden">
                    <h3 className="text-[1.05rem] font-semibold text-ink">
                      {faq.question}
                    </h3>
                    <span
                      aria-hidden
                      className="shrink-0 text-xl leading-none text-brand-deep transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div
                    className="pb-5 pr-8 [&_a]:text-brand-deep [&_li]:mt-1 [&_p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
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
