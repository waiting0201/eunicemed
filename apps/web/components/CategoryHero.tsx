import type { CategoryDetail } from '@/lib/api';
import type { Locale } from '@/lib/locale';
import { css } from '@/lib/css';
import { SIZES, srcSetOf } from '@/lib/image';

/** 樣式逐字取自 mockup4 分類頁的 §1 CATEGORY INTRO。 */
const S = {
  section: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px) clamp(40px,5vw,56px);`,
  grid: css`display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(32px,4vw,56px);align-items:center;`,
  eyebrow: css`color:#0092A8;font-weight:680;letter-spacing:.16em;text-transform:uppercase;font-size:.78rem;`,
  title: css`font-weight:400;font-size:clamp(2rem,3.6vw,2.8rem);letter-spacing:-.02em;margin:10px 0 0;`,
  lead: css`margin-top:14px;font-size:1.1rem;`,
  stats: css`display:flex;flex-wrap:wrap;gap:10px;margin-top:22px;`,
  stat: css`display:inline-flex;align-items:center;gap:8px;background:#F5FAFB;border:1px solid #DFE9EC;border-radius:999px;padding:7px 16px;font-size:.85rem;font-weight:500;`,
  statValue: css`color:#16333B;`,
  media: css`position:relative;aspect-ratio:16/10;border-radius:22px;overflow:hidden;background:#F0F6F8;`,
  img: css`display:block;width:100%;height:100%;object-fit:cover;`,
} as const;

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
    <section style={S.section}>
      <div style={S.grid}>
        <div>
          <p style={S.eyebrow}>
            {kind === 'category' ? EYEBROW[locale].category : EYEBROW[locale].subCategory}
          </p>

          <h1 style={S.title}>{data.name}</h1>

          {data.description && <p style={S.lead}>{data.description}</p>}

          {data.stats && data.stats.length > 0 && (
            /* mockup4 把統計做成細框藥丸，數字才是 ink 色 */
            <div style={S.stats}>
              {data.stats.map((s, i) => (
                <span key={i} style={S.stat}>
                  {s.value && <b style={S.statValue}>{s.value}</b>}
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={S.media}>
          {data.heroImage ? (
            <img
              src={data.heroImage.url}
              srcSet={srcSetOf(data.heroImage)}
              sizes={SIZES.hero}
              alt={data.heroImage.alt ?? data.name}
              width={1200}
              height={750}
              style={S.img}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
