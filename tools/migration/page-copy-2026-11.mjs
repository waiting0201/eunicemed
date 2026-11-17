#!/usr/bin/env node
/**
 * 把首頁／About／Products 程式碼裡的定稿文案（各頁 `COPY`）回填到後台的新欄位。
 * docs/15 §14（2026-11-17）。
 *
 * 為什麼要回填：前台在欄位空著時本來就會顯示定稿（`copyText()` 的 fallback），
 * 所以**不跑這支，線上畫面也不會變**。但後台的欄位會是空的 —— 編輯者看不到
 * 「現在顯示的是什麼」，想改一個字就得整段重打。
 *
 * 規則：
 * - 文字直接從 `apps/web/app/[locale]/…/page.tsx` 的 COPY 讀，不在這裡另抄一份
 * - **只填空欄位**，已經有值的一律不動（冪等，可重跑；編輯者改過的不會被蓋回去）
 * - 該語系沒有那一列、而 schema 有 `required`（milestones 的 items 等）時跳過 ——
 *   那種列存不進去，而前台照樣顯示定稿
 *
 * 用法：
 *   node tools/migration/page-copy-2026-11.mjs <token-file>            # 預覽
 *   node tools/migration/page-copy-2026-11.mjs <token-file> --apply    # 寫入
 *   API_BASE=http://localhost:7071/api node tools/migration/page-copy-2026-11.mjs …
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = process.env.API_BASE ?? 'https://func-eunicemed-prod.azurewebsites.net/api';
const [tokenFile, flag] = process.argv.slice(2);
if (!tokenFile) {
  console.error('用法：node page-copy-2026-11.mjs <token-file> [--apply]');
  process.exit(1);
}
const TOKEN = readFileSync(tokenFile, 'utf8').trim();
const APPLY = flag === '--apply';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LOCALES = ['en', 'zh-TW'];

/** 取出 `const COPY: Record<…> = { … };` 的物件字面值並求值。內容只有字串、陣列與箭頭函式。 */
function loadCopy(rel) {
  const src = readFileSync(path.join(ROOT, rel), 'utf8');
  const start = src.indexOf('const COPY: Record<');
  const open = src.indexOf('> = {', start) + 4;
  const close = src.indexOf('\n};\n', open) + 2;
  if (start < 0 || open < 4 || close < 2) throw new Error(`${rel}：找不到 COPY`);
  // eslint-disable-next-line no-new-func
  return new Function(`return (${src.slice(open, close)});`)();
}

const home = loadCopy('apps/web/app/[locale]/page.tsx');
const about = loadCopy('apps/web/app/[locale]/about/page.tsx');
const products = loadCopy('apps/web/app/[locale]/products/page.tsx');

const items = (list, fields) => list.map((x) => Object.fromEntries(fields.map((f) => [f, x[f]])));

/** pageKey → sectionKey → (copy) => 欄位值。形狀必須與 Api/PageSchemas 一致。 */
const PLAN = {
  home: (c) => ({
    intro: { kicker: c.hero.eyebrow, heading: c.hero.title, intro: c.hero.lead },
    featuredProducts: { heading: c.featured.title, subheading: c.featured.subtitle, intro: c.featured.lead },
    bodyPartBand: {
      heading: c.bodyPart.title[0],
      headingLine2: c.bodyPart.title[1],
      intro: c.bodyPart.lead,
      ctaLabel: c.bodyPart.cta,
      tileCopy: items(c.bodyPart.tiles, ['title', 'subtitle']),
    },
    partner: {
      heading: c.whyPartner.title,
      intro: c.whyPartner.lead,
      items: items(c.whyPartner.items, ['title', 'body']),
      ctaLabel: c.whyPartner.cta,
    },
    news: { heading: c.latestNews.title, allLabel: c.latestNews.allLink, readLabel: c.latestNews.read },
    seo: { title: c.meta.title, description: c.meta.description },
  }),
  about: (c) => ({
    hero: { kicker: c.hero.eyebrow, heading: c.hero.title[0], headingLine2: c.hero.title[1], intro: c.hero.lead },
    milestones: { heading: c.milestones },
    coreValues: {
      heading: c.values.title,
      accent: c.values.accent,
      intro: c.values.lead,
      items: items(c.values.items, ['title', 'body']),
    },
    manufacturing: { heading: c.manufacturing.title, intro: c.manufacturing.lead },
    certificates: { heading: c.certificates.title, intro: c.certificates.lead, ctaLabel: c.certificates.cta },
    seo: { title: c.meta.title, description: c.meta.description },
  }),
  products: (c) => ({
    hero: { kicker: c.hero.eyebrow, heading: c.hero.title, intro: c.hero.lead },
    cta: {
      heading: c.cta.title,
      bodyText: c.cta.body,
      primaryLabel: c.cta.primary,
      secondaryLabel: c.cta.secondary,
    },
    seo: { title: c.meta.title, description: c.meta.description },
  }),
};
const COPIES = { home, about, products };

async function call(method, p, body) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res.json();
}

const empty = (v) =>
  v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);

let changed = 0;
for (const [pageKey, build] of Object.entries(PLAN)) {
  const page = await call('GET', `/admin/pages/${pageKey}`);
  if (!page.success) throw new Error(`${pageKey}：${page.message}`);
  const schema = await call('GET', `/admin/page-schema/${pageKey}`);
  if (!schema.success) throw new Error(`${pageKey} schema：${schema.message}`);

  for (const locale of LOCALES) {
    const wanted = build(COPIES[pageKey][locale]);

    for (const [sectionKey, fields] of Object.entries(wanted)) {
      const section = page.data.sections.find((s) => s.sectionKey === sectionKey);
      if (!section) {
        console.log(`  ✗ ${pageKey}.${sectionKey} 不存在 —— API 還沒部署新 schema？`);
        continue;
      }
      const current = section.translations[locale];
      const required = schema.data.sections[sectionKey]?.required ?? [];
      if (!current && required.length > 0) {
        console.log(`  - ${pageKey}.${sectionKey} [${locale}] 沒有這個語系的列，且有必填欄位，跳過`);
        continue;
      }

      const data = { ...(current ?? {}) };
      const filled = [];
      for (const [k, v] of Object.entries(fields)) {
        if (!empty(data[k])) continue;
        data[k] = v;
        filled.push(k);
      }
      if (filled.length === 0) {
        console.log(`  · ${pageKey}.${sectionKey} [${locale}] 都已有值`);
        continue;
      }

      changed++;
      if (!APPLY) {
        console.log(`  + ${pageKey}.${sectionKey} [${locale}] 會填：${filled.join(', ')}`);
        continue;
      }
      // 不同步 invariant 欄位：這裡只動文字，圖片等共用欄位原樣送回
      const r = await call('PUT', `/admin/pages/${pageKey}/sections/${sectionKey}`, {
        locale,
        data,
        syncInvariantFields: false,
      });
      console.log(
        `  ${r.success ? '✓' : '✗'} ${pageKey}.${sectionKey} [${locale}] ${filled.join(', ')}` +
          (r.success ? '' : ` —— ${r.message} ${JSON.stringify(r.errors ?? [])}`),
      );
    }
  }
}
console.log(APPLY ? `\n完成，寫入 ${changed} 筆。` : `\n預覽：${changed} 筆會寫入。加 --apply 才會寫。`);
