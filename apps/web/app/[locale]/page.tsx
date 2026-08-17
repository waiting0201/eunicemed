import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';

const COPY: Record<Locale, { eyebrow: string; lead: string; note: string }> = {
  en: {
    eyebrow: 'Not Just a Motion',
    lead: 'Medical compression, orthopedic support and footcare — engineered to enhance your quality of life.',
    note: 'Placeholder home page. The real layout comes from mockup4 and needs GET /pages/home (Phase 5).',
  },
  'zh-TW': {
    eyebrow: 'Not Just a Motion',
    lead: '醫療彈性襪、矯型護具與足部護理 —— 為提升生活品質而設計。',
    note: '此為暫代首頁。正式版型依 mockup4，需要 GET /pages/home（Phase 5）。',
  },
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const categories = await api.categories(locale);
  const c = COPY[locale];

  return (
    <div className="mx-auto max-w-[--container-content] px-6 py-16 lg:px-16">
      {/* 品牌 slogan 不翻譯（docs/08 §5.2 的品牌符號例外） */}
      <p className="text-sm uppercase tracking-[0.18em] text-[--color-brand-deep]">
        {c.eyebrow}
      </p>
      <h1 className="mt-3 max-w-[20ch] text-4xl font-semibold lg:text-5xl">EuniceMed</h1>
      <p className="mt-5 max-w-[60ch] text-lg">{c.lead}</p>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/${locale}/products/${cat.slug}`}
            className="rounded-lg border border-[--color-hairline] p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <h2 className="text-xl font-semibold">{cat.name}</h2>
            {cat.description && (
              <p className="mt-2 line-clamp-3 text-sm">{cat.description}</p>
            )}
            <p className="mt-4 text-sm text-[--color-grey]">
              {cat.subCategories.reduce((n, s) => n + s.count, 0)} ·{' '}
              {cat.subCategories.length}
            </p>
          </Link>
        ))}
      </div>

      <p className="mt-16 rounded border border-dashed border-[--color-hairline] p-4 text-sm text-[--color-grey]">
        {c.note}
      </p>
    </div>
  );
}
