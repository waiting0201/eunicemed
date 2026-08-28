import type { CSSProperties } from 'react';
import Link from 'next/link';
import { css } from '@/lib/css';

/**
 * 樣式逐字取自 mockup4 的 News／Insights 卡。
 * 兩頁的卡**不是同一張**：News 是日期＋標題、圓角 18px、文字上距 14px；
 * Insights 是分類 eyebrow＋標題＋摘要、文字上距 16px。
 */
const S = {
  featured: css`display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:center;margin-bottom:56px;`,
  featuredCover: css`position:relative;aspect-ratio:16/10;border-radius:22px;overflow:hidden;background:#F0F6F8;`,
  featuredDate: css`font-size:.85rem;color:#66787F;`,
  featuredTitle: css`color:#16333B;font-weight:400;font-size:clamp(1.6rem,3vw,2.1rem);margin:8px 0 12px;`,
  featuredExcerpt: css`font-size:1rem;`,
  featuredMore: css`display:inline-block;margin-top:16px;color:#0092A8;font-weight:620;`,

  card: css`display:block;`,
  cover: css`position:relative;aspect-ratio:16/10;border-radius:18px;overflow:hidden;background:#F0F6F8;`,
  img: css`display:block;width:100%;height:100%;object-fit:cover;`,

  newsBody: css`margin-top:14px;`,
  newsDate: css`font-size:.8rem;color:#66787F;`,
  newsTitle: css`color:#16333B;font-weight:570;font-size:1.18rem;margin-top:4px;`,

  insightBody: css`margin-top:16px;`,
  insightEyebrow: css`color:#0092A8;font-weight:700;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;`,
  insightTitle: css`color:#16333B;font-weight:570;font-size:1.22rem;margin:6px 0;`,
  insightExcerpt: css`font-size:.92rem;`,
} as const;
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
  style,
  sizes,
}: {
  item: ArticleListItem;
  style: CSSProperties;
  sizes: string;
}) {
  return (
    <div style={style}>
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
          style={S.img}
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
      <Link href={item.url} style={S.featured} data-r="stack">
        <Cover item={item} style={S.featuredCover} sizes="(max-width: 1024px) 100vw, 620px" />
        <div>
          {item.publishedAt && <p style={S.featuredDate}>{formatDate(item.publishedAt, locale)}</p>}
          <h2 style={S.featuredTitle}>{item.title}</h2>
          {item.excerpt && <p style={S.featuredExcerpt}>{item.excerpt}</p>}
          <span style={S.featuredMore}>{READ_MORE[locale]} →</span>
        </div>
      </Link>
    );
  }

  return (
    <Link href={item.url} style={S.card}>
      <Cover item={item} style={S.cover} sizes="(max-width: 640px) 100vw, 420px" />

      {kind === 'news' ? (
        <div style={S.newsBody}>
          {item.publishedAt && <p style={S.newsDate}>{formatDate(item.publishedAt, locale)}</p>}
          <h3 style={S.newsTitle}>{item.title}</h3>
        </div>
      ) : (
        <div style={S.insightBody}>
          {item.category && <span style={S.insightEyebrow}>{item.category.name}</span>}
          <h3 style={S.insightTitle}>{item.title}</h3>
          {/* mockup4 的摘要是 2–3 行；夾住才不會讓同一排卡片高度散開 */}
          {item.excerpt && (
            <p style={S.insightExcerpt} className="line-clamp-3">
              {item.excerpt}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
