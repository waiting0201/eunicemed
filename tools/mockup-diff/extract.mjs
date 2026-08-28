#!/usr/bin/env node
/**
 * 從 mockup4 的 `.dc.html` 或實作的 `.tsx` 抽出「正規化後的 CSS 宣告集合」。
 *
 * 兩邊用同一套正規化，所以比對就是字串集合的差集 —— 這是整個方案成立的關鍵：
 * 實作端的 css`…` 樣板裡放的就是 mockup4 的原字串，中間沒有任何轉換。
 *
 * 用法：
 *   node tools/mockup-diff/extract.mjs "mockup4/Contact.dc.html"
 *   node tools/mockup-diff/extract.mjs "apps/web/app/[locale]/contact/page.tsx"
 */
import { readFileSync } from 'node:fs';

/** 純標註膠囊（`slide 1 · 2560×960`、`8:3`）—— 整個屬性都是標註，不是設計。 */
const ANNOTATION_PILL = 'background:rgba(10,30,38,.55)';

/** 標註用的宣告：等寬字說明、佔位斜紋。逐條剔除，但保留同一個屬性裡的版型宣告。 */
const ANNOTATION_VALUE = [/ui-monospace/, /repeating-linear-gradient\(/];

/** 把一段 `a:b;c:d` 切成正規化後的宣告陣列。 */
export function declarations(styleText) {
  const out = [];

  for (const part of styleText.split(';')) {
    const colon = part.indexOf(':');
    if (colon < 0) continue;

    const prop = part.slice(0, colon).trim().toLowerCase();
    let value = part.slice(colon + 1).trim();
    if (!prop || !value) continue;

    value = value
      .replace(/\s+/g, ' ') // 內部空白收成一個
      .replace(/,\s+/g, ',') // 函式參數後的空白
      .replace(/#([0-9A-Fa-f]{3,8})\b/g, (_, h) => '#' + h.toLowerCase())
      .replace(/(^|[^0-9A-Za-z.])\.([0-9])/g, '$10.$2'); // .5 -> 0.5

    if (ANNOTATION_VALUE.some((re) => re.test(value))) continue;

    out.push(`${prop}:${value}`);
  }

  return out;
}

/** mockup4 的 `.dc.html`：抓所有 `style="…"`，外加 `style-hover="…"`（記成 `:hover` 前綴）。 */
function fromMockup(src) {
  const out = [];

  for (const [, body] of src.matchAll(/\sstyle="([^"]*)"/g)) {
    if (body.includes(ANNOTATION_PILL)) continue; // 整個是標註膠囊
    out.push(...declarations(body));
  }

  for (const [, body] of src.matchAll(/\sstyle-hover="([^"]*)"/g)) {
    out.push(...declarations(body).map((d) => `:hover ${d}`));
  }

  return out;
}

/** 實作的 `.tsx`：抓所有 css`…` 樣板字面值。 */
function fromImpl(src) {
  const out = [];
  for (const [, body] of src.matchAll(/\bcss`([^`]*)`/g)) out.push(...declarations(body));
  return out;
}

export function extract(file) {
  const src = readFileSync(file, 'utf8');
  const decls = file.endsWith('.dc.html') ? fromMockup(src) : fromImpl(src);
  return { all: decls, distinct: [...new Set(decls)].sort() };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: extract.mjs <file.dc.html|file.tsx>');
    process.exit(2);
  }
  const { all, distinct } = extract(file);
  console.error(`# ${file}: ${all.length} declarations, ${distinct.length} distinct`);
  for (const d of distinct) console.log(d);
}
