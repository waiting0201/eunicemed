import type { MetadataRoute } from 'next';
import { IS_PRODUCTION_SITE, SITE_URL } from '@/lib/site';

/**
 * AI 爬蟲。**逐一列名而不是靠 `User-agent: *` 默認放行** —— 這一群的存取
 * 是品牌方的決定（內容要不要被 LLM 讀取與引用），寫出來才有得改：
 * 之後若要擋掉其中任何一個，把它從這裡搬到下面的 `disallow` 群組即可。
 *
 * <p>
 * **目前決定：全部允許。** 本站是型錄與內容行銷網站，被 AI 摘要引用是曝光而非損失；
 * 站上沒有付費牆也沒有非公開內容。
 * </p>
 *
 * <p>
 * 兩類混在一起，因為對本站的結論一樣：
 * 「檢索型」（回答當下去抓、會附出處）與「訓練／索引型」（餵模型知識）。
 * 品牌方若只想被引用、不想被訓練，要擋的是 GPTBot、ClaudeBot、CCBot、
 * Bytespider、Google-Extended、Applebot-Extended、meta-externalagent 這幾支。
 * </p>
 */
const AI_CRAWLERS = [
  // 檢索／回答（會附出處連結）
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'DuckAssistBot',
  // 訓練／索引
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'Applebot-Extended',
  'meta-externalagent',
  'Amazonbot',
  'Bytespider',
  'CCBot',
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
