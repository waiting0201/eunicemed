import type { MetadataRoute } from 'next';
import { IS_PRODUCTION_SITE, SITE_URL } from '@/lib/site';

/**
 * **檢索型** AI 爬蟲 —— 回答問題時當場來抓、而且會附出處連結的那些。明示允許。
 *
 * <p>
 * **政策：可被引用，不可被訓練**（2026-09-01 定案）。
 * 訓練／索引型（GPTBot、ClaudeBot、CCBot、Google-Extended、Amazonbot、
 * Applebot-Extended、Bytespider、meta-externalagent）**刻意不列在這裡** ——
 * Cloudflare 的 managed robots.txt 會在我們這一段之前把它們 `Disallow: /`，
 * 並加上 `Content-Signal: search=yes,ai-train=no,use=reference`
 * （歐盟著作權指令 2019/790 第 4 條的權利保留聲明）。
 * </p>
 *
 * <p>
 * ⚠️ **在這裡把它們寫成 Allow 會變成同名群組自相矛盾**：依 RFC 9309，同名的
 * `User-agent` 群組要合併，等長規則取寬鬆者 —— 我們的 `Allow: /` 會贏，
 * 等於在同一個檔案裡一邊聲明保留權利、一邊放行。2026-09-01 第一版就是這樣，
 * 本機看不出來（Cloudflare 那段是邊緣加的），上線抓 robots.txt 才發現。
 * </p>
 *
 * <p>
 * **所以：要改「能不能拿去訓練」，改的是 Cloudflare 的 AI Crawl Control，不是這支檔案。**
 * 這裡只管檢索型那半邊，而那半邊 Cloudflare 沒有擋。
 * </p>
 */
const AI_CRAWLERS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'DuckAssistBot',
];

/** /admin 是同一個 app 的一部分（SWA 單一 app），/api 是 Function App 的代理路徑。 */
const NEVER_CRAWL = ['/api/', '/admin'];

/**
 * robots.txt（docs/06 §4）。
 *
 * <p>
 * **非正式環境整站 Disallow**：SWA 的 PR 預覽環境有自己的網址，被索引的話
 * 會與正式站互相稀釋。判準是 `NEXT_PUBLIC_SITE_URL` 是否為正式網域 ——
 * 用環境變數而非 `NODE_ENV`，因為預覽環境也是 production build。
 * </p>
 *
 * <p>
 * ⚠️ **正式站上實際被讀到的 robots.txt 不只這一份**：Cloudflare 會在前面接一段
 * managed content（見 `AI_CRAWLERS` 的說明）。改這裡之後要去線上抓一次確認合併結果，
 * 本機或 `next start` 都看不到那一段。
 * </p>
 */
export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_SITE) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: NEVER_CRAWL },
      { userAgent: AI_CRAWLERS, allow: '/', disallow: NEVER_CRAWL },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
