import 'server-only';

export type RedirectRule = { from: string; to: string; status: number };

const API_BASE = process.env.API_BASE ?? 'http://localhost:7071/api';

/** 5 分鐘。編輯者加一條轉址不需要即時生效，但也不該要等到下次部署。 */
const TTL_MS = 5 * 60 * 1000;

let cache: { rules: Map<string, RedirectRule>; at: number } | null = null;
let inflight: Promise<Map<string, RedirectRule>> | null = null;

/**
 * 轉址規則表。
 *
 * <p>
 * **每個請求都會用到，所以一定要快取。** middleware 在每一次導覽都跑，
 * 逐次打 API 會把後端的請求量放大到與流量同級 —— 而規則幾乎不變。
 * </p>
 *
 * <p>
 * **失敗時放行，不擋導覽**：轉址是錦上添花，後端掛掉時使用者應該還能瀏覽網站。
 * 失敗也不寫進快取，下一個請求會重試。
 * </p>
 */
export async function getRedirects(): Promise<Map<string, RedirectRule>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rules;

  // 快取過期時可能有多個請求同時進來 —— 共用同一個 in-flight promise，
  // 否則每次過期都會對後端打出一串重複請求。
  inflight ??= load()
    .then((rules) => {
      cache = { rules, at: Date.now() };
      return rules;
    })
    .catch(() => cache?.rules ?? new Map<string, RedirectRule>())
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

async function load(): Promise<Map<string, RedirectRule>> {
  const res = await fetch(`${API_BASE}/redirects`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`redirects ${res.status}`);

  const body = (await res.json()) as { success: boolean; data: RedirectRule[] | null };
  const rules = new Map<string, RedirectRule>();

  for (const rule of body.data ?? []) rules.set(normalize(rule.from), rule);
  return rules;
}

/** 與後端的正規化一致：開頭補 `/`、去掉尾斜線、比對不分大小寫。 */
export function normalize(path: string): string {
  let p = path.trim().toLowerCase();
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p;
}
