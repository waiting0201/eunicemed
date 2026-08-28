#!/usr/bin/env node
/**
 * 比對 mockup4 與實作的 CSS 宣告集合。
 *
 * 比的是**宣告集合**而不是 DOM 樹 —— 所以資料驅動的 JSX（一個 css`…` 條目
 * 渲染 N 張卡）不會造成對位問題：mockup4 那 N 個相同的 style 屬性
 * 收斂成同一組 distinct 宣告，兩邊自然相等。
 *
 *   node tools/mockup-diff/check.mjs                 # 全部 18 頁
 *   node tools/mockup-diff/check.mjs --page Contact  # 單頁
 *   node tools/mockup-diff/check.mjs --snapshot      # 更新 baseline/
 *
 * `mockup4/` 不進版控。找不到它時改用 baseline/ 比對；兩者都沒有就跳過（exit 0），
 * **絕不可**變成 build 的相依。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from './extract.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const MOCKUP = join(ROOT, 'mockup4');
const BASELINE = join(HERE, 'baseline');

const map = JSON.parse(readFileSync(join(HERE, 'page-map.json'), 'utf8'));
const allow = JSON.parse(readFileSync(join(HERE, 'allow.json'), 'utf8')).allow;

const args = process.argv.slice(2);
const snapshot = args.includes('--snapshot');
const only = args.includes('--page') ? args[args.indexOf('--page') + 1] : null;
const pages = only ? [only] : Object.keys(map.pages);

if (!existsSync(MOCKUP) && !snapshot) {
  if (!existsSync(join(BASELINE, 'Contact.json'))) {
    console.error('mockup4/ 與 baseline/ 都不在，跳過檢查。');
    process.exit(0);
  }
  console.error('mockup4/ 不在，改用已提交的 baseline/ 比對。');
}
if (snapshot && !existsSync(MOCKUP)) {
  console.error('--snapshot 需要 mockup4/，但找不到它。');
  process.exit(2);
}

/** mockup 側：優先讀 mockup4/，否則讀 baseline/。 */
function mockupDecls(page) {
  if (existsSync(MOCKUP)) return extract(join(MOCKUP, `${page}.dc.html`)).distinct;
  return JSON.parse(readFileSync(join(BASELINE, `${page}.json`), 'utf8')).distinct;
}

/** 實作側：該頁的 TSX ∪ 全站共用框架（扣掉該頁不套用的那些）。 */
function implDecls(page) {
  const except = map.sharedExcept ?? {};
  const shared = map.shared.filter((f) => !(except[f] ?? []).includes(page));
  const files = [...map.pages[page], ...shared];
  const out = new Set();
  for (const f of files) {
    const p = join(ROOT, f);
    if (!existsSync(p)) continue;
    for (const d of extract(p).distinct) out.add(d);
  }
  return [...out].sort();
}

if (snapshot) {
  mkdirSync(BASELINE, { recursive: true });
  for (const page of pages) {
    const distinct = mockupDecls(page);
    writeFileSync(join(BASELINE, `${page}.json`), JSON.stringify({ page, distinct }, null, 2) + '\n');
    console.log(`baseline: ${page} (${distinct.length} distinct)`);
  }
  process.exit(0);
}

let missingTotal = 0;
let extraTotal = 0;

for (const page of pages) {
  const mock = new Set(mockupDecls(page));
  const impl = new Set(implDecls(page));

  const missing = [...mock].filter((d) => !impl.has(d) && !allow[d]).sort();
  const extra = [...impl].filter((d) => !mock.has(d) && !allow[d]).sort();

  missingTotal += missing.length;
  extraTotal += extra.length;

  const done = mock.size - missing.length;
  const pct = mock.size ? Math.round((done / mock.size) * 100) : 100;
  console.log(`\n=== ${page} — ${done}/${mock.size} (${pct}%) ===`);
  if (missing.length) {
    console.log(`  MISSING (${missing.length}) — mockup4 有、實作沒有：`);
    for (const d of missing) console.log(`    - ${d}`);
  }
  if (extra.length) {
    console.log(`  EXTRA (${extra.length}) — 實作有、mockup4 沒有：`);
    for (const d of extra) console.log(`    + ${d}`);
  }
  if (!missing.length && !extra.length) console.log('  ✓ 無差異');
}

console.log(`\n總計：MISSING ${missingTotal}、EXTRA ${extraTotal}`);
process.exit(missingTotal > 0 ? 1 : 0);
