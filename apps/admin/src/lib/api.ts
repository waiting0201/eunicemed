/**
 * 後台 API 客戶端。
 *
 * <p>
 * 與公開站的 `lib/api.ts` 是兩份：那一份跑在 server、只讀公開端點；
 * 這一份跑在瀏覽器、帶 JWT、會寫入。共用一份反而要處理兩種執行環境的差異。
 * </p>
 *
 * <p>
 * token 放 `sessionStorage` 而非 `localStorage`：關掉分頁就登出，
 * 而後台是共用電腦上會用到的東西（新北辦公室的內容團隊）。
 * refresh token 同理 —— 本案沒有 httpOnly cookie 的中介層可用（SWA + Function App 直連）。
 * </p>
 */
const BASE = '/api';

const ACCESS = 'em.access';
const REFRESH = 'em.refresh';

export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  message: string;
  errors: string[];
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const auth = {
  get access() {
    return sessionStorage.getItem(ACCESS);
  },
  set(access: string, refresh: string) {
    sessionStorage.setItem(ACCESS, access);
    sessionStorage.setItem(REFRESH, refresh);
  },
  clear() {
    sessionStorage.removeItem(ACCESS);
    sessionStorage.removeItem(REFRESH);
  },
};

let refreshing: Promise<boolean> | null = null;

/**
 * 401 時嘗試以 refresh token 換新的 access token，成功就重送一次。
 *
 * <p>
 * ⚠️ refresh 是**單次使用後撤銷**的（Phase 2）——
 * 同時有多個請求撞到 401 時，各自去 refresh 會讓第一個成功、其餘全部失敗並登出。
 * 所以共用同一個 in-flight promise。
 * </p>
 */
async function tryRefresh(): Promise<boolean> {
  const token = sessionStorage.getItem(REFRESH);
  if (!token) return false;

  refreshing ??= fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const body = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
      if (!body.success || !body.data) return false;
      auth.set(body.data.accessToken, body.data.refreshToken);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = auth.access;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401 && retry && (await tryRefresh())) {
    return request<T>(path, init, false);
  }

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || !body?.success) {
    throw new ApiError(
      res.status,
      body?.message ?? `請求失敗（${res.status}）`,
      body?.errors ?? [],
    );
  }

  return body.data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: AdminUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  products: (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    return request<Paged<AdminProductListItem>>(`/admin/products?${q}`);
  },

  categories: () => request<AdminCategory[]>('/admin/categories'),

  subCategories: () => request<AdminSubCategory[]>('/admin/sub-categories'),

  collections: () => request<AdminCollection[]>('/admin/collections'),

  bodyParts: () => request<AdminBodyPart[]>('/admin/body-parts'),

  certifications: () => request<AdminCertification[]>('/admin/certifications'),

  product: (id: string) => request<AdminProduct>(`/admin/products/${id}`),

  saveProduct: (id: string, body: unknown) =>
    request<AdminProduct>(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  createProduct: (body: unknown) =>
    request<AdminProduct>('/admin/products', { method: 'POST', body: JSON.stringify(body) }),

  publishProduct: (id: string) =>
    request<AdminProduct>(`/admin/products/${id}/publish`, { method: 'POST' }),

  unpublishProduct: (id: string) =>
    request<AdminProduct>(`/admin/products/${id}/unpublish`, { method: 'POST' }),
};

// ── 型別 ──────────────────────────────────────────────────────────────────

export type Paged<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminUser = { id: string; email: string; displayName: string; roles: string[] };

export type AdminProductListItem = {
  id: string;
  slug: string;
  sku: string | null;
  nameEn: string | null;
  nameZhTw: string | null;
  categorySlug: string | null;
  subCategorySlug: string | null;
  collectionSlug: string | null;
  status: number;
  isFeatured: boolean;
  sortOrder: number;
  primaryImageUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type AdminCategory = {
  id: string;
  slug: string;
  productCount: number;
  subCategoryCount: number;
  translations: Record<string, { name: string }>;
};

export type AdminSubCategory = {
  id: string;
  categoryId: string;
  categorySlug: string;
  slug: string;
  translations: Record<string, { name: string }>;
};

export type AdminCollection = {
  id: string;
  slug: string;
  translations: Record<string, { name: string }>;
};

export type AdminBodyPart = { id: string; slug: string; nameEn: string; nameZhTw: string };

export type AdminCertification = { id: string; slug: string; mark: string };

export type ProductImageInput = { mediaId: string; isPrimary: boolean; sortOrder: number };

/**
 * 產品的一個語系。JSON 欄位（features / useCases / specs / sizeChart / conditions）
 * 在 DB 是自由形狀，後台送什麼就存什麼 —— 型別是**樂觀的**，讀取時要能吃到 null。
 */
export type ProductTranslation = {
  name: string;
  summary?: string | null;
  description?: string | null;
  featuredBlurb?: string | null;
  features?: { icon?: string; title?: string; body?: string }[] | null;
  useCases?: { title?: string; body?: string }[] | null;
  specs?: { label?: string; value?: string }[] | null;
  sizeChart?: {
    measureLabel?: string;
    sizes?: string[];
    rows?: { label?: string | null; values?: string[] }[];
    footnote?: string | null;
  } | null;
  conditions?: string[] | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageMediaId?: string | null;
};

export type AdminProduct = {
  id: string;
  slug: string;
  sku: string | null;
  categoryId: string;
  subCategoryId: string | null;
  collectionId: string | null;
  status: number;
  isFeatured: boolean;
  featuredSortOrder: number;
  useCaseImageMediaId: string | null;
  sortOrder: number;
  publishedAt: string | null;
  images: ProductImageInput[];
  bodyPartIds: string[];
  certificationIds: string[];
  tagIds: string[];
  translations: Record<string, ProductTranslation>;
  /** base64 的 ROWVERSION。存檔時原樣送回即可取得 409 併發保護 */
  rowVersion: string | null;
  createdAt: string;
  updatedAt: string;
};
