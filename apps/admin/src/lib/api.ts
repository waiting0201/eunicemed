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
const BASE = "/api";

const ACCESS = "em.access";
const REFRESH = "em.refresh";

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
    this.name = "ApiError";
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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: token }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const body = (await res.json()) as ApiEnvelope<{
        accessToken: string;
        refreshToken: string;
      }>;
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

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = auth.access;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
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

/**
 * multipart 上傳。**不能走 `request()`** —— 那支在有 body 時會設
 * `Content-Type: application/json`，而 multipart 的 boundary 必須由瀏覽器產生。
 */
async function upload<T>(path: string, form: FormData): Promise<T> {
  const token = auth.access;

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || !body?.success) {
    throw new ApiError(
      res.status,
      body?.message ?? `上傳失敗（${res.status}）`,
      body?.errors ?? [],
    );
  }

  return body.data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: AdminUser }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    ),

  products: (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    return request<Paged<AdminProductListItem>>(`/admin/products?${q}`);
  },

  categories: () => request<AdminCategory[]>("/admin/categories"),

  subCategories: () => request<AdminSubCategory[]>("/admin/sub-categories"),

  saveCategory: (id: string, body: unknown) =>
    request<AdminCategory>(`/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  saveSubCategory: (id: string, body: unknown) =>
    request<AdminSubCategory>(`/admin/sub-categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  saveCollection: (id: string, body: unknown) =>
    request<AdminCollection>(`/admin/collections/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  saveCertification: (id: string, body: unknown) =>
    request<AdminCertification>(`/admin/certifications/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  collections: () => request<AdminCollection[]>("/admin/collections"),

  bodyParts: () => request<AdminBodyPart[]>("/admin/body-parts"),

  certifications: () => request<AdminCertification[]>("/admin/certifications"),

  summary: () => request<Record<string, SummaryEntry>>("/admin/summary"),

  users: () => request<AdminUserRow[]>("/admin/users"),

  createUser: (body: unknown) =>
    request<AdminUserRow>("/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateUser: (id: string, body: unknown) =>
    request<AdminUserRow>(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteUser: (id: string) =>
    request<null>(`/admin/users/${id}`, { method: "DELETE" }),

  redirects: (search?: string) =>
    request<AdminRedirect[]>(
      `/admin/redirects${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),

  createRedirect: (body: unknown) =>
    request<AdminRedirect>("/admin/redirects", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateRedirect: (id: string, body: unknown) =>
    request<AdminRedirect>(`/admin/redirects/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteRedirect: (id: string) =>
    request<null>(`/admin/redirects/${id}`, { method: "DELETE" }),

  adminSettings: () => request<AdminSetting[]>("/admin/settings"),

  saveSettings: (items: Record<string, unknown>) =>
    request<null>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ items }),
    }),

  adminMenus: () => request<AdminMenuItem[]>("/admin/menus"),

  saveMenu: (menu: string, items: unknown[]) =>
    request<null>("/admin/menus", {
      method: "PUT",
      body: JSON.stringify({ menu, items }),
    }),

  pages: () => request<AdminPageListItem[]>("/admin/pages"),

  page: (key: string) => request<AdminPage>(`/admin/pages/${key}`),

  pageSchema: (key: string) =>
    request<import("./schema").PageSchema>(`/admin/page-schema/${key}`),

  saveSection: (key: string, sectionKey: string, body: unknown) =>
    request<null>(`/admin/pages/${key}/sections/${sectionKey}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteSectionLocale: (key: string, sectionKey: string, locale: string) =>
    request<null>(
      `/admin/pages/${key}/sections/${sectionKey}?locale=${locale}`,
      {
        method: "DELETE",
      },
    ),

  toggleSection: (key: string, sectionKey: string, isEnabled: boolean) =>
    request<null>(`/admin/pages/${key}/sections/${sectionKey}/enabled`, {
      method: "PATCH",
      body: JSON.stringify({ isEnabled }),
    }),

  articles: (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    return request<Paged<AdminArticleListItem>>(`/admin/articles?${q}`);
  },

  article: (id: string) => request<AdminArticle>(`/admin/articles/${id}`),

  createArticle: (body: unknown) =>
    request<AdminArticle>("/admin/articles", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  saveArticle: (id: string, body: unknown) =>
    request<AdminArticle>(`/admin/articles/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteArticle: (id: string) =>
    request<null>(`/admin/articles/${id}`, { method: "DELETE" }),

  publishArticle: (id: string) =>
    request<AdminArticle>(`/admin/articles/${id}/publish`, { method: "POST" }),

  unpublishArticle: (id: string) =>
    request<AdminArticle>(`/admin/articles/${id}/unpublish`, {
      method: "POST",
    }),

  articleEvent: (id: string) =>
    request<AdminNewsEvent | null>(`/admin/articles/${id}/event`),

  saveArticleEvent: (id: string, body: unknown) =>
    request<AdminNewsEvent>(`/admin/articles/${id}/event`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteArticleEvent: (id: string) =>
    request<null>(`/admin/articles/${id}/event`, { method: "DELETE" }),

  articleGallery: (id: string) =>
    request<ArticleImage[]>(`/admin/articles/${id}/gallery`),

  saveArticleGallery: (
    id: string,
    images: { mediaId: string; sortOrder: number }[],
  ) =>
    request<ArticleImage[]>(`/admin/articles/${id}/gallery`, {
      method: "PUT",
      body: JSON.stringify({ images }),
    }),

  articleCategories: (kind?: string) =>
    request<AdminArticleCategory[]>(
      `/admin/article-categories${kind ? `?kind=${kind}` : ""}`,
    ),

  tags: () => request<AdminTag[]>("/admin/tags"),

  createTag: (body: unknown) =>
    request<AdminTag>("/admin/tags", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  saveTag: (id: string, body: unknown) =>
    request<AdminTag>(`/admin/tags/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteTag: (id: string) =>
    request<null>(`/admin/tags/${id}`, { method: "DELETE" }),

  applications: () =>
    request<AdminApplicationListItem[]>("/admin/applications"),

  faqs: () => request<AdminFaq[]>("/admin/faqs"),

  createFaq: (body: unknown) =>
    request<AdminFaq>("/admin/faqs", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  saveFaq: (id: string, body: unknown) =>
    request<AdminFaq>(`/admin/faqs/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteFaq: (id: string) =>
    request<null>(`/admin/faqs/${id}`, { method: "DELETE" }),

  saveFaqCategory: (id: string, body: unknown) =>
    request<AdminFaqCategory>(`/admin/faq-categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  createDownload: (body: unknown) =>
    request<AdminDownload>("/admin/downloads", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  saveDownload: (id: string, body: unknown) =>
    request<AdminDownload>(`/admin/downloads/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteDownload: (id: string) =>
    request<null>(`/admin/downloads/${id}`, { method: "DELETE" }),

  createSalesLocation: (body: unknown) =>
    request<AdminSalesLocation>("/admin/sales-locations", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  saveSalesLocation: (id: string, body: unknown) =>
    request<AdminSalesLocation>(`/admin/sales-locations/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteSalesLocation: (id: string) =>
    request<null>(`/admin/sales-locations/${id}`, { method: "DELETE" }),

  faqCategories: () => request<AdminFaqCategory[]>("/admin/faq-categories"),

  downloads: () => request<AdminDownload[]>("/admin/downloads"),

  salesLocations: () => request<AdminSalesLocation[]>("/admin/sales-locations"),

  mediaPresets: () =>
    request<{ presets: MediaPreset[] }>("/admin/media-presets"),

  uploadMedia: (presetKey: string, file: File, altText: string) => {
    const form = new FormData();
    form.set("presetKey", presetKey);
    form.set("altText", altText);
    form.set("file", file);
    return upload<UploadResult>("/admin/media", form);
  },

  /**
   * PDF 走三步：要 SAS → 直傳 Blob → 登記成 Media。
   *
   * 中間那一步**不經過 API**（避免大檔佔用 Function），
   * 所以第三步是必要的 —— 少了它，檔案在 Blob 裡但資料庫沒有那一列，
   * 下載模組永遠選不到它。
   */
  uploadDocument: async (file: File, displayName: string) => {
    const sas = await request<{ uploadUrl: string; blobUrl: string }>(
      "/admin/uploads/sas",
      {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          contentType: "application/pdf",
        }),
      },
    );

    const put = await fetch(sas.uploadUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": "application/pdf",
      },
      body: file,
    });
    if (!put.ok)
      throw new ApiError(put.status, `檔案上傳失敗（${put.status}）。`);

    return request<MediaItem>("/admin/uploads/register", {
      method: "POST",
      body: JSON.stringify({
        blobUrl: sas.blobUrl,
        displayName: displayName || file.name,
      }),
    });
  },

  updateMedia: (id: string, altText: string) =>
    request<null>(`/admin/media/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ altText }),
    }),

  deleteMedia: (id: string) =>
    request<null>(`/admin/media/${id}`, { method: "DELETE" }),

  mediaUsages: (id: string) =>
    request<MediaUsage[]>(`/admin/media/${id}/usages`),

  media: (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    return request<MediaItem[]>(`/admin/media?${q}`);
  },

  product: (id: string) => request<AdminProduct>(`/admin/products/${id}`),

  saveProduct: (id: string, body: unknown) =>
    request<AdminProduct>(`/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  createProduct: (body: unknown) =>
    request<AdminProduct>("/admin/products", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  publishProduct: (id: string) =>
    request<AdminProduct>(`/admin/products/${id}/publish`, { method: "POST" }),

  unpublishProduct: (id: string) =>
    request<AdminProduct>(`/admin/products/${id}/unpublish`, {
      method: "POST",
    }),
};

// ── 型別 ──────────────────────────────────────────────────────────────────

export type Paged<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
};

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
  sortOrder: number;
  imageMediaId: string | null;
  heroImageMediaId: string | null;
  productCount: number;
  subCategoryCount: number;
  translations: Record<string, TaxonomyTranslation>;
  rowVersion: string | null;
};

export type TaxonomyTranslation = {
  name?: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type AdminSubCategory = {
  id: string;
  categoryId: string;
  categorySlug: string;
  slug: string;
  sortOrder: number;
  status: number;
  productCount: number;
  imageMediaId: string | null;
  heroImageMediaId: string | null;
  translations: Record<string, TaxonomyTranslation>;
  rowVersion: string | null;
};

export type AdminCollection = {
  id: string;
  slug: string;
  strength: number;
  sortOrder: number;
  translations: Record<string, { name: string; description?: string | null }>;
};

export type AdminBodyPart = {
  id: string;
  slug: string;
  nameEn: string;
  nameZhTw: string;
};

export type AdminCertification = {
  id: string;
  slug: string;
  mark: string;
  logoMediaId: string | null;
  sortOrder: number;
  status: number;
  productCount: number;
  translations: Record<
    string,
    { subLabel?: string | null; description?: string | null }
  >;
};

export type ProductImageInput = {
  mediaId: string;
  isPrimary: boolean;
  sortOrder: number;
};

/**
 * 上傳尺寸規格。**畫面上的提示文字一律取自這裡**（docs/03 §5 全域規則）——
 * 尺寸調整只改 `Api/Media/media-presets.json`，全後台同步生效。
 */
/** 側欄儀表的資料來源。`locales` 是「有該語系翻譯的筆數」。 */
export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  isActive: boolean;
  mustChangePassword: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type AdminRedirect = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  createdAt: string;
};

export type AdminSetting = {
  key: string;
  /** 不需翻譯的值（email、電話、URL）*/
  value: unknown;
  /** 需翻譯的值（地址、營業時間）*/
  translations: Record<string, unknown>;
  updatedAt: string;
};

/** 後端回的是扁平清單，樹狀由前端組（最多兩層）*/
export type AdminMenuItem = {
  id: string;
  menu: string;
  parentId: string | null;
  url: string;
  sortOrder: number;
  labels: Record<string, string>;
};

export type AdminPageListItem = {
  key: string;
  /** singleton | template */
  kind: string;
  sectionCount: number;
  updatedAt: string;
};

export type AdminPageSection = {
  sectionKey: string;
  isEnabled: boolean;
  rowVersion: string | null;
  updatedAt: string;
  /** 每個語系一份 data。缺該語系就沒有那個 key */
  translations: Record<string, Record<string, unknown>>;
};

export type AdminPage = { key: string; sections: AdminPageSection[] };

export type SummaryEntry = {
  total: number;
  locales: { en: number; zhTw: number };
};

export type AdminArticleListItem = {
  id: string;
  slug: string;
  /** 1 = news、2 = insight */
  type: number;
  categorySlug: string | null;
  titleEn: string | null;
  titleZhTw: string | null;
  status: number;
  isFeatured: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

export type AdminApplicationListItem = {
  id: string;
  slug: string;
  /** 1 = 依部位、2 = 特殊照護 */
  type: number;
  bodyPartSlug: string | null;
  nameEn: string | null;
  nameZhTw: string | null;
  showOnBodyMap: boolean;
  status: number;
  sortOrder: number;
  productCount: number;
  updatedAt: string;
};

export type AdminFaq = {
  id: string;
  faqCategoryId: string;
  categorySlug: string | null;
  status: number;
  sortOrder: number;
  translations: Record<string, { question: string; answer: string }>;
  updatedAt: string;
};

export type AdminFaqCategory = {
  id: string;
  slug: string;
  sortOrder: number;
  status: number;
  faqCount: number;
  translations: Record<string, { name: string }>;
};

export type AdminDownload = {
  id: string;
  mediaId: string;
  fileUrl: string | null;
  type: number;
  /** 檔案本身的語言，與介面語系無關（docs/05 §3.8）*/
  fileLocale: string;
  status: number;
  sortOrder: number;
  productIds: string[];
  translations: Record<string, { title: string; description: string | null }>;
  createdAt: string;
};

export type AdminSalesLocation = {
  id: string;
  /** 1 = 台灣、2 = 國際 */
  locationType: number;
  countryCode: string;
  websiteUrl: string | null;
  phone: string | null;
  status: number;
  sortOrder: number;
  translations: Record<
    string,
    {
      name: string;
      address: string | null;
      regionLabel: string | null;
      note: string | null;
    }
  >;
  updatedAt: string;
};

export type MediaPreset = {
  key: string;
  label: Record<string, string>;
  aspect: string;
  width: number;
  height: number;
  maxBytes: number;
  formats: string[];
  hint: Record<string, string>;
};

/**
 * 上傳結果。`warnings` 是**非阻擋**的提醒（比例不符、檔案過大、解析度不足）——
 * 圖仍然存進去了，但那些問題會在前台看得出來（docs/11 §4）。
 */
export type UploadResult = MediaItem & {
  warnings?: {
    code: string;
    expected: string;
    actual: string;
    message: string;
  }[];
};

export type MediaUsage = {
  entity: string;
  entityId: string;
  locale: string | null;
  fieldPath: string;
};

export type MediaItem = {
  id: string;
  presetKey: string;
  url: string;
  fileName: string;
  altText: string | null;
  width: number;
  height: number;
  sizeBytes: number;
  variantCount: number;
  usageCount: number;
  /** 來源圖比 preset 窄 —— 放大顯示會糊，列表要標出來 */
  belowPresetWidth: boolean;
  createdAt: string;
};

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

export type ArticleTranslation = {
  title: string;
  standfirst?: string | null;
  body?: string | null;
  excerpt?: string | null;
  authorName?: string | null;
  disclaimer?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type AdminArticle = {
  id: string;
  slug: string;
  /** 1 = news、2 = insight */
  type: number;
  categoryId: string | null;
  coverMediaId: string | null;
  readMinutes: number | null;
  isFeatured: boolean;
  status: number;
  publishedAt: string | null;
  tagIds: string[];
  hasEvent: boolean;
  galleryCount: number;
  translations: Record<string, ArticleTranslation>;
  rowVersion: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminArticleCategory = {
  id: string;
  /** 1 = news、2 = insight —— slug 只在同一個 kind 內唯一 */
  kind: number;
  slug: string;
  sortOrder: number;
  status: number;
  articleCount: number;
  translations: Record<string, { name: string }>;
};

export type NewsEventTranslation = {
  datesLabel?: string | null;
  venue?: string | null;
  booth?: string | null;
  ctaLabel?: string | null;
};

export type AdminNewsEvent = {
  articleId: string;
  startDate: string | null;
  endDate: string | null;
  contactEmail: string | null;
  ctaUrl: string | null;
  translations: Record<string, NewsEventTranslation>;
  updatedAt: string;
};

export type ArticleImage = {
  mediaId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
};

export type AdminTag = {
  id: string;
  slug: string;
  nameEn: string;
  nameZhTw: string | null;
  productCount: number;
  articleCount: number;
};
