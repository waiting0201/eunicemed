import 'server-only';
import { isLocale, type Locale } from './locale';

const API_BASE = process.env.API_BASE ?? 'http://localhost:7071/api';

/** 5 分鐘。與 `lib/redirects.ts` 同一個理由與同一個數字。 */
const TTL_MS = 5 * 60 * 1000;

type SitemapRow = { path: string; locales: string[] };

let cache: { map: Map<string, Locale[]>; at: number } | null = null;
let inflight: Promise<Map<string, Locale[]>> | null = null;

/**
 * 「這個路徑有哪些語系真的看得到」的對照表，資料來自 `GET /sitemap`。
 *
 * <p>
 * **為什麼需要這一支**：語言純度讓缺翻譯的頁面回 404（docs/08 §5.2），
 * 所以 hreflang 不能兩個語系都印。`app/sitemap.ts` 一開始就照 API 的 `locales`
 * 逐頁判斷，但各頁的 `generateMetadata` 沒有跟上 —— 它們寫死
 * `{ en, 'zh-TW' }`，於是缺翻譯的頁面會對搜尋引擎宣告一個 404 的替代版本。
 * 這正是 `app/sitemap.ts` 的註解警告過不要做的事。
 * </p>
 *
 * <p>
 * **一定要快取**：每一頁的 metadata 都會問一次，逐次打 `/sitemap`
 * 等於把整份 sitemap 查詢放大到與流量同級（客戶的 SQL 是 Basic 5 DTU）。
 * 內容發布後最多 5 分鐘生效，而 hreflang 不是需要即時的東西。
 * </p>
 *
 * <p>
 * **失敗時回 null，由呼叫端退回「只印自己這一個語系」** —— 少印一個替代版本
 * 只是少一點國際化訊號，印錯一個 404 卻是實質傷害。
 * </p>
 */
export async function localesOf(path: string): Promise<Locale[] | null> {
  try {
    const map = await getMap();
    return map.get(normalizePath(path)) ?? null;
  } catch {
    return null;
  }
}

async function getMap(): Promise<Map<string, Locale[]>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;

  // 過期瞬間可能有多個請求同時進來 —— 共用同一個 in-flight promise（同 redirects.ts）
  inflight ??= load()
    .then((map) => {
      cache = { map, at: Date.now() };
      return map;
    })
    .catch(() => cache?.map ?? new Map<string, Locale[]>())
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

async function load(): Promise<Map<string, Locale[]>> {
  const res = await fetch(`${API_BASE}/sitemap`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`sitemap ${res.status}`);

  const body = (await res.json()) as { data: SitemapRow[] | null };
  const map = new Map<string, Locale[]>();

  for (const row of body.data ?? []) {
    const locales = row.locales.filter(isLocale);
    if (locales.length > 0) map.set(normalizePath(row.path), locales);
  }

  return map;
}

/** API 的首頁路徑是空字串；這裡一律把尾斜線去掉，讓 `/faq/` 與 `/faq` 是同一筆。 */
function normalizePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path === '/' ? '' : path;
}
