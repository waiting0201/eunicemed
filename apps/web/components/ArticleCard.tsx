import Link from 'next/link';
import type { ArticleListItem } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import type { Locale } from '@/lib/locale';
import { formatDate } from '@/lib/date';

/**
 * 文章卡。News 與 Insights 共用 —— 兩者在 mockup4 的卡片版型相同，
 * 差別只在 News 的第一則會用 `featured` 變體橫向展開。
 */
export function ArticleCard({
  item,
  locale,
  featured = false,
}: {
  item: ArticleListItem;
  locale: Locale;
  featured?: boolean;
}) {
  return (
    <Link
      href={item.url}
      className={`group overflow-hidden rounded-[20px] border border-[--color-hairline] bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(10,60,72,.10)] ${
        featured ? 'grid gap-0 sm:grid-cols-2' : 'block'
      }`}
    >
      <div className={`overflow-hidden bg-[--color-tint-deep] ${featured ? 'aspect-[16/10] sm:h-full' : 'aspect-[16/10]'}`}>
        {item.cover && (
          <img
            src={item.cover.url}
            srcSet={srcSetOf(item.cover)}
            sizes={featured ? '(max-width: 640px) 100vw, 460px' : '(max-width: 640px) 100vw, 360px'}
            alt={item.cover.alt ?? item.title}
            loading="lazy"
            decoding="async"
            width={800}
            height={500}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        )}
      </div>

      <div className={featured ? 'p-7' : 'px-5 pb-6 pt-5'}>
        <p className="flex flex-wrap items-center gap-x-2 text-[0.8rem] text-[--color-grey]">
          {item.category && (
            <span className="font-bold uppercase tracking-[0.1em] text-[--color-brand-deep]">
              {item.category.name}
            </span>
          )}
          {item.publishedAt && <span>{formatDate(item.publishedAt, locale)}</span>}
        </p>

        <h3
          className={`mt-1.5 font-semibold ${featured ? 'text-[clamp(1.3rem,2.4vw,1.7rem)]' : 'text-[1.1rem]'}`}
        >
          {item.title}
        </h3>

        {item.excerpt && (
          <p className={`mt-2 text-[0.92rem] ${featured ? '' : 'line-clamp-3'}`}>
            {item.excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}
