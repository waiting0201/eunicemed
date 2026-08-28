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

/**
 * 整個元素都是規格標註（`slide 1 · 2560×960`、`8:3`、`16:10`）的特徵。
 * 深色膠囊底，或等寬字說明 —— 兩者在正式站都不存在。
 */
const ANNOTATION_ELEMENT = ['background:rgba(10,30,38,.55)', 'ui-monospace'];

/** 佔位斜紋：逐條剔除，但保留同一個屬性裡的版型宣告（圖框本身是要的）。 */
const ANNOTATION_VALUE = [/repeating-linear-gradient\(/];

/**
 * 只有 `position:absolute` 加一組 top/left 偏移、別的什麼都沒有的元素，
 * 在 mockup4 裡一律是比例標籤（`16:10`、`8:3`）的外框 —— 全 18 頁 31 處都是。
 * 它包在等寬字說明裡，正規表示式看不到父層，所以在這裡單獨認掉。
 */
function isRatioBadgeWrapper(body) {
  const props = body
    .split(';')
    .filter((d) => d.includes(':'))
    .map((d) => d.slice(0, d.indexOf(':')).trim());
  return (
    props.length > 0 &&
    props.includes('position') &&
    body.includes('position:absolute') &&
    props.every((k) => ['position', 'top', 'left', 'right', 'bottom'].includes(k))
  );
}

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
    if (value.includes('${')) continue; // 樣板插值，沒有可比對的字面值

    out.push(`${prop}:${value}`);
  }

  return out;
}

/** mockup4 的 `.dc.html`：抓所有 `style="…"`，外加 `style-hover="…"`（記成 `:hover` 前綴）。 */
function fromMockup(src) {
  const out = [];

  for (const [, body] of src.matchAll(/\sstyle="([^"]*)"/g)) {
    if (ANNOTATION_ELEMENT.some((m) => body.includes(m))) continue;
    if (isRatioBadgeWrapper(body)) continue;
    out.push(...declarations(body));
  }

  for (const [, body] of src.matchAll(/\sstyle-hover="([^"]*)"/g)) {
    out.push(...declarations(body).map((d) => `:hover ${d}`));
  }

  out.push(...fromScript(src));

  return out;
}

/**
 * mockup4 有兩頁（FAQ、Applications）把樣式組在 `data-dc-script` 裡的字串常數，
 * 而不是寫成 `style="…"` 屬性 —— 分類鈕、手風琴的 +/× 圖示、人體圖熱點都在那裡。
 * 不讀這一段的話，那些值會被誤報成「實作自創」。
 */
function fromScript(src) {
  const script = src.match(/data-dc-script[^>]*>([\s\S]*?)<\/script>/);
  if (!script) return [];

  const out = [];
  // 看起來像 CSS 宣告串的字串常數：以 `屬性:` 開頭且含分號
  for (const [, quoted] of script[1].matchAll(/["'`]((?:[a-z-]+:[^"'`]*;\s*)+)["'`]/g)) {
    out.push(...declarations(quoted));
  }
  return out;
}

/**
 * mockup4 的 `style-hover` 在實作端是 `globals.css` 的 `[data-hover="…"]` 規則
 * （inline style 表達不了 pseudo-class）。這張表把 token 換回它代表的宣告，
 * 元素上出現 `data-hover="lift-4"` 就等同宣告了那組 hover 樣式。
 * 值必須與 globals.css 裡的規則一致。
 */
const HOVER_TOKENS = {
  'lift-shadow': 'transform:translateY(-4px);box-shadow:0 18px 40px rgba(10,60,72,.10);',
  'lift-4': 'transform:translateY(-4px);',
  'lift-3': 'transform:translateY(-3px);',
  'lift-2-white': 'transform:translateY(-2px);color:#fff;',
  edge: 'border-color:rgba(0,146,168,.4);',
};

/** 實作的 `.tsx`：抓所有 css`…` 樣板字面值，以及 `data-hover` token。 */
function fromImpl(src) {
  const out = [];
  for (const [, body] of src.matchAll(/\bcss`([^`]*)`/g)) out.push(...declarations(body));

  // token 可能寫成 data-hover="lift-4"，也可能是 data-hover={boxed ? 'lift-shadow' : undefined}，
  // 所以先確認這個檔案有用到 data-hover，再收集檔內出現過的 token 名稱。
  if (src.includes('data-hover')) {
    for (const [token, decls] of Object.entries(HOVER_TOKENS)) {
      if (new RegExp(`['"]${token}['"]`).test(src)) {
        out.push(...declarations(decls).map((d) => `:hover ${d}`));
      }
    }
  }

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
