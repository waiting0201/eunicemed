import 'server-only';

/**
 * 後端一律回傳這個信封（docs/04-api.md §3.0），成功與失敗都是。
 * 前端在這一層拆掉，頁面元件只看得到 `data`。
 */
type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  message: string;
  errors: string[];
  timestamp: string;
};

export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type FacetCount = { slug: string; label: string; count: number };

export type FacetedResult<T> = PagedResult<T> & {
  facets: Record<string, FacetCount[]> | null;
};

const API_BASE = process.env.API_BASE ?? 'http://localhost:7071/api';

/** 端點回 404 時拋這個，讓頁面用 notFound() 接。 */
export class ApiNotFound extends Error {
  constructor(path: string) {
    super(`API 404: ${path}`);
    this.name = 'ApiNotFound';
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly detail: string,
  ) {
    super(`API ${status} on ${path}: ${detail}`);
    this.name = 'ApiError';
  }
}

type FetchOptions = {
  /** 給瀏覽器與中間代理的快取秒數。本站無 CDN，這是唯一的邊緣快取手段。 */
  revalidate?: number;
};

/**
 * 呼叫後端並拆掉信封。
 *
 * <p>
 * **純 SSR、不使用 ISR**（docs/02-frontend.md）：預設 `cache: 'no-store'`，
 * 發布後下一次請求就是最新內容，不需要 revalidation webhook。
 * </p>
 */
async function get<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (res.status === 404) throw new ApiNotFound(path);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, path, body.slice(0, 300));
  }

  const envelope = (await res.json()) as ApiResponse<T>;

  if (!envelope.success || envelope.data === null) {
    throw new ApiError(res.status, path, envelope.message || 'empty payload');
  }

  return envelope.data;
}

/**
 * 找不到就回 null 而不是拋錯。
 *
 * <p>
 * ⚠️ **語言純度**：缺該語系翻譯時後端回的就是 404（不 fallback 露出他語，
 * docs/08-design.md §5.2）。所以呼叫端拿到 null 要當成「這個語系沒有這個內容」，
 * **不可以退回去抓別的語系** —— 那正是規格禁止的行為。
 * </p>
 */
async function getOrNull<T>(path: string, opts?: FetchOptions): Promise<T | null> {
  try {
    return await get<T>(path, opts);
  } catch (e) {
    if (e instanceof ApiNotFound) return null;
    throw e;
  }
}

// ── 型別 ──────────────────────────────────────────────────────────────────

export type ImageVariant = { format: string; width: number; url: string };

/**
 * `variants` 是上傳當下產生的實體檔案清單。前端據此組 srcSet，
 * **不要自己拼檔名**（見 lib/image.ts 的說明）。
 */
export type MediaRef = {
  url: string;
  alt: string | null;
  variants: ImageVariant[] | null;
};
export type SlugName = { slug: string; name: string };

export type ProductListItem = {
  slug: string;
  name: string;
  sku: string | null;
  category: SlugName | null;
  subCategory: SlugName | null;
  collection: SlugName | null;
  bodyParts: string[];
  image: MediaRef | null;
  featuredBlurb: string | null;
  url: string;
};

export type SubCategoryRef = { slug: string; name: string; count: number };

/** 產品圖庫的一張。比 MediaRef 多一個 isPrimary；陣列已由 API 排好序。 */
export type ProductImage = MediaRef & { isPrimary: boolean };

export type Certification = {
  slug: string;
  mark: string;
  subLabel: string | null;
  description: string | null;
  logo: MediaRef | null;
};

export type Download = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  /** 檔案本身的語言，與站台語系無關（docs/05 §3.8） */
  fileLocale: string;
  fileExt: string;
  sizeBytes: number;
  url: string;
};

export type RelatedProduct = {
  slug: string;
  name: string;
  image: MediaRef | null;
  url: string;
};

/**
 * 產品詳情。JSON 欄位（features / useCases / specs / sizeChart / conditions）
 * 在 DB 是自由形狀的 JSON，由後台的產品表單填寫 —— 因此這裡的型別是
 * **樂觀的**，元件一律要能吃到 null 或形狀不符。
 */
export type ProductDetail = {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  category: SlugName | null;
  subCategory: SlugName | null;
  collection: SlugName | null;
  bodyParts: string[];
  conditions: string[] | null;
  summary: string | null;
  description: string | null;
  images: ProductImage[];
  features: { icon?: string; title?: string; body?: string }[] | null;
  useCaseImage: MediaRef | null;
  useCases: { title?: string; body?: string }[] | null;
  specs: { label?: string; value?: string }[] | null;
  sizeChart: {
    measureLabel?: string;
    sizes?: string[];
    rows?: { label?: string | null; values?: string[] }[];
    footnote?: string | null;
  } | null;
  certifications: Certification[];
  downloads: Download[];
  relatedProducts: RelatedProduct[];
  seo: { title: string | null; description: string | null; ogImage: string | null };
  publishedAt: string | null;
};

export type Stat = { value: string; label: string };

// ── 文章（News / Insights 共用同一個實體，以 type 分流）─────────────────────

export type ArticleListItem = {
  slug: string;
  /** 'news' | 'insight' */
  type: string;
  title: string;
  excerpt: string | null;
  category: SlugName | null;
  publishedAt: string | null;
  readMinutes: number | null;
  author: string | null;
  cover: MediaRef | null;
  url: string;
};

export type ArticleRef = {
  slug: string;
  title: string;
  cover: MediaRef | null;
  url: string;
};

/** News 專屬的活動資訊面板。 */
export type NewsEvent = {
  datesLabel: string | null;
  startDate: string | null;
  endDate: string | null;
  venue: string | null;
  booth: string | null;
  contactEmail: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
};

export type ArticleDetail = {
  slug: string;
  type: string;
  category: SlugName | null;
  title: string;
  standfirst: string | null;
  excerpt: string | null;
  publishedAt: string | null;
  author: string | null;
  readMinutes: number | null;
  cover: MediaRef | null;
  /** 已淨化的 HTML，且 H2 的 anchor id 已由伺服器回填（docs/13 Phase 6）*/
  body: string | null;
  /** 由 body 的 H2 伺服器端推導，與 body 內的 id 一一對應 */
  toc: { id: string; text: string }[];
  tags: SlugName[];
  disclaimer: string | null;
  gallery: MediaRef[];
  event: NewsEvent | null;
  prev: ArticleRef | null;
  next: ArticleRef | null;
  related: ArticleRef[];
  seo: { title: string | null; description: string | null; ogImage: string | null };
};

// ── FAQ / 下載 / 據點 ──────────────────────────────────────────────────────

export type Faq = {
  id: string;
  question: string;
  /** 已由 API 淨化的 HTML（Services/HtmlSanitizers.cs）*/
  answer: string;
  category: SlugName | null;
};

export type DownloadFile = {
  id: string;
  title: string;
  description: string | null;
  /** 'catalog' | 'manual' | 'certificate' —— 固定字彙，標籤由前端依語系對照 */
  type: string;
  /** 檔案本身的語言（docs/05 §3.8），與站台語系無關 */
  fileLocale: string;
  fileExt: string;
  sizeBytes: number;
  url: string;
};

export type SalesLocation = {
  name: string;
  address: string | null;
  note: string | null;
  phone: string | null;
  websiteUrl: string | null;
  countryCode: string;
};

export type SalesLocations = {
  domestic: SalesLocation[];
  /** 伺服器端已分組；未填 region 者集中在最後一組（docs/04 §4）*/
  international: { region: string | null; items: SalesLocation[] }[];
};

// ── 應用方案 ──────────────────────────────────────────────────────────────

export type ApplicationListItem = {
  slug: string;
  /** 'body-part' | 'special-care' */
  type: string;
  name: string;
  lead: string | null;
  image: MediaRef | null;
  productCount: number;
  url: string;
};

/** 人體圖的一個熱區。座標在 API 的 viewBox 座標系內（見 BodyMap 元件）。 */
export type BodyMapSpot = {
  slug: string;
  name: string;
  productCount: number;
  copy: string | null;
  ctaLabel: string | null;
  map: { hotspot: { cx: number; cy: number }; chip: { cx: number; cy: number } } | null;
  url: string;
};

export type ApplicationDetail = {
  slug: string;
  type: string;
  name: string;
  lead: string | null;
  body: string | null;
  heroImage: MediaRef | null;
  stats: Stat[] | null;
  concerns: { title?: string; body?: string }[] | null;
  supportLevels:
    | { collection?: SlugName; body?: string; bestFor?: string; linkUrl?: string }[]
    | null;
  recommendedProducts: ProductListItem[];
  howTo: { title?: string; body?: string }[] | null;
  fittingImage: MediaRef | null;
  disclaimer: string | null;
  related: { slug: string; name: string; productCount: number; url: string }[];
  seo: { title: string | null; description: string | null; ogImage: string | null };
};

export type CategoryDetail = {
  slug: string;
  name: string;
  description: string | null;
  heroImage: MediaRef | null;
  stats: Stat[] | null;
  supportLevels: {
    title?: string;
    lead?: string;
    items?: { collection?: SlugName; body?: string }[];
  } | null;
  subCategories: SubCategoryRef[];
  seo: { title: string | null; description: string | null; ogImage: string | null };
};

// ── 端點 ──────────────────────────────────────────────────────────────────

export const api = {
  category: (locale: string, slug: string) =>
    getOrNull<CategoryDetail>(`/categories/${enc(slug)}?locale=${enc(locale)}`),

  subCategory: (locale: string, category: string, sub: string) =>
    getOrNull<CategoryDetail>(
      `/sub-categories/${enc(category)}/${enc(sub)}?locale=${enc(locale)}`,
    ),

  product: (locale: string, category: string, sub: string, slug: string) =>
    getOrNull<ProductDetail>(
      `/products/${enc(category)}/${enc(sub)}/${enc(slug)}?locale=${enc(locale)}`,
    ),

  applications: (locale: string) =>
    get<ApplicationListItem[]>(`/applications?locale=${enc(locale)}`),

  bodyMap: (locale: string) => get<BodyMapSpot[]>(`/applications/body-map?locale=${enc(locale)}`),

  application: (locale: string, slug: string) =>
    getOrNull<ApplicationDetail>(`/applications/${enc(slug)}?locale=${enc(locale)}`),

  faqs: (locale: string, category?: string) => {
    const q = new URLSearchParams({ locale, facets: 'true' });
    if (category) q.set('category', category);
    return get<FacetedResult<Faq>>(`/faqs?${q}`);
  },

  downloads: (locale: string, type?: string) => {
    const q = new URLSearchParams({ locale, facets: 'true' });
    if (type) q.set('type', type);
    return get<FacetedResult<DownloadFile>>(`/downloads?${q}`);
  },

  salesLocations: (locale: string) =>
    get<SalesLocations>(`/sales-locations?locale=${enc(locale)}`),

  articles: (locale: string, kind: 'news' | 'insights', category?: string) => {
    const q = new URLSearchParams({ locale, facets: 'true' });
    if (category) q.set('category', category);
    return get<FacetedResult<ArticleListItem>>(`/${kind}?${q}`);
  },

  article: (locale: string, kind: 'news' | 'insights', slug: string) =>
    getOrNull<ArticleDetail>(`/${kind}/${enc(slug)}?locale=${enc(locale)}`),

  categories: (locale: string) =>
    get<CategoryDetail[]>(`/categories?locale=${enc(locale)}&include=subCategories`),

  products: (locale: string, params: Record<string, string | undefined>) => {
    const q = new URLSearchParams({ locale });
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    return get<FacetedResult<ProductListItem>>(`/products?${q}`);
  },
};

const enc = encodeURIComponent;
