/**
 * 18 個頁面的中文名稱與網址（docs/06-sitemap.md 的 IA）。
 *
 * <p>
 * 後端只回 `key`（`about`、`product-detail`…）——
 * 那是給程式看的識別字串，不是給編輯者看的名稱。
 * 對照表放前端：頁面集合由 schema 目錄決定，不是可編輯內容。
 * </p>
 */
export const PAGE_LABELS: Record<string, { label: string; path?: string; note?: string }> = {
  home: { label: '首頁', path: '/' },
  about: { label: '關於我們', path: '/about' },
  products: { label: '產品總覽', path: '/products' },
  'product-category': { label: '分類／子分類頁', note: '共用文案，套用於所有分類頁' },
  'product-detail': { label: '產品詳情頁', note: '共用文案，套用於所有產品' },
  applications: { label: '應用方案總覽', path: '/applications' },
  'application-detail': { label: '應用方案內頁', note: '共用文案' },
  partnership: { label: '合作夥伴', path: '/partnership' },
  resources: { label: '資源中心', path: '/resources' },
  faq: { label: 'FAQ', path: '/faq' },
  insights: { label: '專欄文章列表', path: '/insights' },
  'article-detail': { label: '專欄內頁', note: '共用文案' },
  news: { label: '最新消息列表', path: '/news' },
  'news-detail': { label: '消息內頁', note: '共用文案' },
  downloads: { label: '下載中心', path: '/downloads' },
  'where-to-buy': { label: '銷售據點', path: '/where-to-buy' },
  contact: { label: '聯絡我們', path: '/contact', note: '表單待 Phase 7' },
  privacy: { label: '隱私權與法律聲明', path: '/privacy' },
};

export function pageLabel(key: string): string {
  return PAGE_LABELS[key]?.label ?? key;
}
