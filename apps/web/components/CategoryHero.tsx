import type { CategoryDetail } from '@/lib/api';
import type { Locale } from '@/lib/locale';
import { SIZES, srcSetOf } from '@/lib/image';

const EYEBROW: Record<Locale, { category: string; subCategory: string }> = {
  en: { category: 'Category', subCategory: 'Sub-category' },
  'zh-TW': { category: '產品分類', subCategory: '子分類' },
};

/**
 * 分類 / 子分類落地頁的 hero。版型照 mockup4「Product Category」的第一段：
 * eyebrow → h1 → 敘述 → 三組統計 → 右側 16:10 圖。
 *
 * `stats` 由 API 回傳，其中 `value` 為 `"auto"` 者後端已代入實際產品數（docs/04 §4），
 * 前端不需要也不應該自己算。
 */
export function CategoryHero({
  data,
  locale,
  kind,
}: {
  data: CategoryDetail;
  locale: Locale;
  kind: 'category' | 'subCategory';
}) {
  return (
    <section className="mx-auto max-w-[--container-content] px-6 pb-12 pt-10 lg:px-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[--color-brand-deep]">
            {kind === 'category' ? EYEBROW[locale].category : EYEBROW[locale].subCategory}
          </p>

          <h1 className="mt-3 text-4xl font-semibold lg:text-5xl">{data.name}</h1>

          {data.description && (
            <p className="mt-5 max-w-[58ch] text-lg">{data.description}</p>
          )}

          {data.stats && data.stats.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {data.stats.map((s, i) => (
                <span key={i} className="text-[--color-grey]">
                  <b className="mr-1.5 text-xl font-semibold text-[--color-ink]">
                    {s.value}
                  </b>
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="aspect-[16/10] overflow-hidden rounded-lg bg-[--color-tint]">
          {data.heroImage ? (
            <img
              src={data.heroImage.url}
              srcSet={srcSetOf(data.heroImage)}
              sizes={SIZES.hero}
              alt={data.heroImage.alt ?? data.name}
              width={1200}
              height={750}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[--color-grey]">
              16:10 · 1200×750
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
