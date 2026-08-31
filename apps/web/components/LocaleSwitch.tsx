'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { CSSProperties } from 'react';
import { LOCALES, LOCALE_SHORT_LABELS, switchLocalePath, type Locale } from '@/lib/locale';

/**
 * 語系切換的兩個連結（mockup4 的「**EN** · 中」）。
 *
 * <p>
 * **唯一需要 client 的理由是「目前在哪一頁」** —— 與 `SiteNav` 同一個理由。
 * 先前兩處都寫死連到 `/${l}`，所以在任何一頁按下語系都會被丟回首頁；
 * 看了一半的產品頁、翻到第 3 頁的清單、正在讀的文章全部作廢。
 * </p>
 *
 * <p>
 * query 一起帶走：清單頁的篩選與分頁都在 query 上（`?category=…&page=3`），
 * 而那些值是 slug 與數字 —— 與語系無關，換過去仍然成立。
 * </p>
 *
 * <p>
 * 外層的 `<span>` 留在各自的呼叫端（頁首與手機抽屜的樣式不同，
 * 且頁首那一份是逐字照抄 mockup4 的），這裡只負責連結本身。
 * </p>
 */
export function LocaleSwitch({
  locale,
  currentStyle,
}: {
  locale: Locale;
  /** 現用語系的樣式（mockup4：ink 色加粗）。 */
  currentStyle?: CSSProperties;
}) {
  const pathname = usePathname();
  const query = useSearchParams().toString();

  return (
    <>
      {LOCALES.map((l, i) => (
        <span key={l}>
          {/* mockup4 是「EN · 中」，分隔就是前後各一個空白的間隔號 */}
          {i > 0 && ' · '}
          {l === locale ? (
            <b style={currentStyle}>{LOCALE_SHORT_LABELS[l]}</b>
          ) : (
            <Link href={`${switchLocalePath(pathname, l)}${query ? `?${query}` : ''}`}>
              {LOCALE_SHORT_LABELS[l]}
            </Link>
          )}
        </span>
      ))}
    </>
  );
}
