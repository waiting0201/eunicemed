import Link from 'next/link';
import type { ArticleListItem } from '@/lib/api';
import { srcSetOf } from '@/lib/image';
import type { Locale } from '@/lib/locale';
import { formatDate } from '@/lib/date';

/**
 * 文章卡。**News 與 Insights 在 mockup4 是兩種不同的卡**，不是同一種加旗標：
 *
 * <ul>
 *   <li>News：日期在上、標題 1.18rem，**沒有分類眉標也沒有摘要**（分類由側欄負責）</li>
 *   <li>Insights：分類眉標在上、標題 1.22rem、底下接摘要，**沒有日期**</li>
 * </ul>
 *
 * 兩者共通的是：**沒有卡片外框、沒有白底、沒有內距** ——
 * 只有一張 16:10 的圓角圖磚，文字排在下方。
 *
 * News 列表的第一則另用 `featured` 橫向大卡。
 */
const READ_MORE: Record<Locale, string> = { en: 'Read more', 'zh-TW': '閱讀更多' };

function Cover({
  item,
  className,
  sizes,
}: {
  item: ArticleListItem;
  className: string;
  sizes: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-tint-deep ${className}`}>
      {item.cover && (
        <img
          src={item.cover.url}
          srcSet={srcSetOf(item.cover)}
          sizes={sizes}
          alt={item.cover.alt ?? item.title}
          loading="lazy"
          decoding="async"
          width={800}
          height={500}
          className="block h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      )}
    </div>
  );
}

export function ArticleCard({
  item,
  locale,
  kind,
  featured = false,
}: {
  item: ArticleListItem;
  locale: Locale;
  kind: 'news' | 'insights';
  featured?: boolean;
}) {
  // News 列表的頭條：圖文並置，1.2fr / 1fr
  if (featured) {
    return (
      <Link
        href={item.url}
        className="group grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]"
      >
        <Cover
          item={item}
          className="aspect-[16/10] rounded-[22px]"
          sizes="(max-width: 1024px) 100vw, 620px"
        />
        <div>
          {item.publishedAt && (
            <p className="text-[0.85rem] text-[#66787F]">
              {formatDate(item.publishedAt, locale)}
            </p>
          )}
          <h2 className="mt-2 mb-3 text-[clamp(1.6rem,3vw,2.1rem)] font-normal">
            {item.title}
          </h2>
          {item.excerpt && <p className="text-base">{item.excerpt}</p>}
          <span className="mt-4 inline-block font-[620] text-brand-deep">
            {READ_MORE[locale]} →
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link href={item.url} className="group block">
      <Cover
        item={item}
        className="aspect-[16/10] rounded-[18px]"
        sizes="(max-width: 640px) 100vw, 420px"
      />

      {kind === 'news' ? (
        <div className="mt-3.5">
          {item.publishedAt && (
            <p className="text-[0.8rem] text-[#66787F]">
              {formatDate(item.publishedAt, locale)}
            </p>
          )}
          <h3 className="mt-1 text-[1.18rem] font-[570]">{item.title}</h3>
        </div>
      ) : (
        <div className="mt-4">
          {item.category && (
            <span className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-brand-deep">
              {item.category.name}
            </span>
          )}
          <h3 className="my-1.5 text-[1.22rem] font-[570]">{item.title}</h3>
          {item.excerpt && <p className="text-[0.92rem]">{item.excerpt}</p>}
        </div>
      )}
    </Link>
  );
}
