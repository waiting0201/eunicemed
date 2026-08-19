import type { FacetedResult, ArticleListItem } from '@/lib/api';
import type { Locale } from '@/lib/locale';
import { ArticleCard } from './ArticleCard';
import { PageHero } from './PageHero';
import { ResourcesSubnav } from './ResourcesSubnav';
import { SideFilter } from './SideFilter';

/**
 * News 與 Insights 的列表版型。兩頁在 mockup4 只差三件事：
 * 文案、子導覽的 active 項、以及 News 的第一則會用大卡展開。
 * 其餘完全相同，所以共用這一支。
 */
const CATEGORIES: Record<Locale, string> = { en: 'Categories', 'zh-TW': '分類' };

export function ArticleListPage({
  locale,
  kind,
  result,
  activeCategory,
  copy,
}: {
  locale: Locale;
  kind: 'news' | 'insights';
  result: FacetedResult<ArticleListItem>;
  activeCategory: string | undefined;
  copy: { eyebrow: string; title: string; lead: string; empty: string };
}) {
  const basePath = `/${locale}/${kind}`;

  // News 的第一則用大卡（mockup4 的 featured 版位）。Insights 全部同尺寸。
  //
  // 「哪一則」由後端決定：列表排序是 `IsFeatured DESC, PublishedAt DESC`，
  // 所以編輯者勾了精選的那則會浮到第一。沒有人勾就是最新的那則 ——
  // 這個版位一定要有東西，空著版面會塌。
  const featured = kind === 'news' ? result.items[0] : undefined;
  const rest = featured ? result.items.slice(1) : result.items;

  return (
    <>
      <ResourcesSubnav locale={locale} active={`/${kind}`} />
      <PageHero eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />

      <section className="mx-auto max-w-content px-gutter py-[clamp(48px,6vw,72px)]">
        <div className="grid items-start gap-[clamp(32px,4vw,56px)] lg:grid-cols-[240px_1fr]">
          <SideFilter
            label={CATEGORIES[locale]}
            param="category"
            facets={result.facets?.categories ?? []}
            active={activeCategory}
            basePath={basePath}
            locale={locale}
          />

          <div>
            {result.items.length === 0 ? (
              <p className="py-16 text-center text-[#8AA0A6]">{copy.empty}</p>
            ) : (
              <>
                {featured && (
                  <div className="mb-14">
                    <ArticleCard item={featured} locale={locale} kind={kind} featured />
                  </div>
                )}
                <div className="grid gap-7 sm:grid-cols-2">
                  {rest.map((item) => (
                    <ArticleCard key={item.slug} item={item} locale={locale} kind={kind} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
