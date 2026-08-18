import type { GaugeLevel } from '@/components/Gauge';

/**
 * 把一筆內容在某語系的填寫程度折算成三段。
 *
 * <p>
 * 三段的定義刻意與品牌的三級制對齊（Care · Protect · Advance）：
 * </p>
 * <list>
 *   <item>**1 required** —— 前台渲染得出來（有名稱／標題）</item>
 *   <item>**2 recommended** —— 讀者看得懂（有摘要／導言）</item>
 *   <item>**3 complete** —— SEO 與細節齊備</item>
 * </list>
 *
 * <p>
 * ⚠️ 判準要與後端的「這個語系算不算有內容」一致 ——
 * 後端用 schema 的 `required` 決定要不要公開渲染（`PageHandler.IsRenderable`）。
 * 這裡的第一段就是那條線：**level 0 表示前台在該語系看不到這筆內容**。
 * 兩邊若各寫一套，後台會顯示「有內容」而前台是 404。
 * </p>
 */
export function levelOf(checks: [required: boolean, recommended: boolean, complete: boolean]): GaugeLevel {
  if (!checks[0]) return 0;
  if (!checks[1]) return 1;
  return checks[2] ? 3 : 2;
}

/** 一組內容在各語系的完整度，供 <LocaleGauges> 使用。 */
export type LocaleLevels = Record<string, GaugeLevel>;

const LEVEL_TEXT = ['前台看不到', '僅有標題', '缺 SEO 或細節', '齊全'] as const;

export function describeLevel(locale: string, level: GaugeLevel): string {
  return `${locale}：${LEVEL_TEXT[level]}`;
}

/** 一群內容的整體缺漏程度，給側欄的迷你儀表用。 */
export function summarise(levels: LocaleLevels[]): GaugeLevel {
  if (levels.length === 0) return 0;

  const all = levels.flatMap((l) => Object.values(l));
  const missing = all.filter((l) => l === 0).length;

  if (missing === all.length) return 0;
  if (missing > 0) return 1;
  return all.every((l) => l === 3) ? 3 : 2;
}
