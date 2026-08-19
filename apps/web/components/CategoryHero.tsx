import type { CategoryDetail } from '@/lib/api';
import type { Locale } from '@/lib/locale';
import { SIZES, srcSetOf } from '@/lib/image';

const EYEBROW: Record<Locale, { category: string; subCategory: string }> = {
  en: { category: 'Category', subCategory: 'Sub-category' },
  'zh-TW': { category: '產品分類', subCategory: '子分類' },
};

/**
 * 分類 / 子分類落地頁的 hero。版型照 mockup4「Product Category」的第一段：
 * 左右 `1.05fr / .95fr` 置中對齊，eyebrow → h1 → 敘述 → 一排統計藥丸，右側 16:10 圖。
 *
 * <p>
 * **上方沒有留白** —— 麵包屑的 18px 就是這一段的上緣（mockup4 的 `padding: 0 … `）。
 * </p>
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
    <section className="mx-auto max-w-content px-gutter pb-[clamp(40px,5vw,56px)]">
      <div className="grid items-center gap-[clamp(32px,4vw,56px)] lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-[0.78rem] font-[680] uppercase tracking-[0.16em] text-brand-deep">
            {kind === 'category' ? EYEBROW[locale].category : EYEBROW[locale].subCategory}
          </p>

          <h1 className="mt-2.5 text-[clamp(2rem,3.6vw,2.8rem)] font-normal">{data.name}</h1>

          {data.description && <p className="mt-3.5 text-[1.1rem]">{data.description}</p>}

          {data.stats && data.stats.length > 0 && (
            /* mockup4 把統計做成細框藥丸，數字才是 ink 色 */
            <div className="mt-[22px] flex flex-wrap gap-2.5">
              {data.stats.map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 rounded-full border border-hairline bg-tint px-4 py-[7px] text-[0.85rem] font-medium"
                >
                  {s.value && <b className="text-ink">{s.value}</b>}
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="aspect-[16/10] overflow-hidden rounded-[22px] bg-tint-deep">
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
            <div className="flex h-full items-center justify-center text-xs text-[#8AA0A6]">
              16:10 · 1200×750
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
