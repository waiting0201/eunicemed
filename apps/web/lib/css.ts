import type { CSSProperties } from 'react';

/**
 * 把 mockup4 的 `style="…"` 字串原封不動變成 React 的 style 物件。
 *
 * <p>
 * ⚠️ **樣板字面值裡的字串必須與 mockup4 的 `style` 屬性逐字相同。**
 * 這是整套移植方案能被審查的唯一理由 —— 審查者（與 `tools/mockup-diff`）
 * 只要把兩邊的字串貼在一起比對即可，中間沒有任何轉換會流失資訊。
 * 要改樣式請先改 `mockup4/`，不要在這裡「順手」調整。
 * </p>
 *
 * <p>
 * 以分號切割在本語料上是可證明安全的（18 頁、1,837 個 `style` 屬性）：
 * 沒有 `!important`、沒有 `url()`、沒有自訂屬性、括號內沒有分號，
 * 唯一的 vendor prefix 是 `-webkit-column-break-inside`。
 * 驗證方式見 `tools/mockup-diff/README.md`。
 * </p>
 *
 * <p>
 * 值一律保持字串，所以 React 不會自作主張補上 `px`
 * （`margin:0 0 24px` 這種簡寫本來就不能被補）。
 * </p>
 */
export function css(strings: TemplateStringsArray, ...values: (string | number)[]): CSSProperties {
  const out: Record<string, string> = {};

  for (const part of String.raw({ raw: strings }, ...values).split(';')) {
    const colon = part.indexOf(':');
    if (colon < 0) continue;

    const prop = part.slice(0, colon).trim();
    const value = part.slice(colon + 1).trim();
    if (!prop || !value) continue;

    // 自訂屬性要保持原樣，React 才會當成 CSS variable 輸出
    out[prop.startsWith('--') ? prop : camel(prop)] = value;
  }

  return Object.freeze(out) as CSSProperties;
}

/**
 * `background-color` → `backgroundColor`、`-webkit-column-break-inside` →
 * `WebkitColumnBreakInside`（React 要的是首字大寫的 vendor prefix，
 * 唯獨 `-ms-` 例外，要小寫的 `ms`）。
 */
function camel(prop: string): string {
  return prop.replace(/^-ms-/, 'ms-').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
