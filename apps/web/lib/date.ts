import type { Locale } from './locale';

/**
 * 發布日期格式。
 *
 * <p>
 * API 回的是不帶時區的 `datetime2`（全站存 UTC，見 Api/Common/Clock.cs），
 * 序列化後長得像 `2026-08-02T00:00:00` —— **沒有 Z**。
 * 直接丟給 `new Date()` 會被當成本地時間解讀，在 UTC+8 顯示會早一天。
 * 所以這裡只取日期那一段自己拆，完全不進 Date。
 * </p>
 *
 * <p>
 * 格式照 mockup4：英文 `2026 · 06 · 18`、中文 `2026 年 6 月 18 日`。
 * </p>
 */
export function formatDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;

  return locale === 'zh-TW'
    ? `${y} 年 ${Number(m)} 月 ${Number(d)} 日`
    : `${y} · ${m} · ${d}`;
}
