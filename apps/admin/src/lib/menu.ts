import type { IconName } from '@/components/Icon';

/**
 * 側欄選單。
 *
 * <p>
 * **分群的判準是「多久會動一次」**，不是資料的種類 —— 這是 2026-08-28 的
 * 後台範圍檢討結論（docs/15-cms-scope.md）。編輯者每天面對的是一份工作清單，
 * 不是一張資料表關聯圖，所以：
 * </p>
 *
 * <ul>
 *   <li><b>日常</b>：每天到每月會開。來信、產品上下架、發文章。</li>
 *   <li><b>內容</b>：每季到每年。應用方案、FAQ、下載、據點、素材。</li>
 *   <li><b>進階</b>：幾乎不動，且動了會波及全站 —— 分類 slug 一改，
 *       底下所有產品網址就失效。這一群預設摺疊，不是因為它不重要，
 *       而是因為它不該在找「今天要做什麼」時擋在路上。</li>
 * </ul>
 */
export type MenuLink = {
  label: string;
  url: string;
  icon: IconName;
  /**
   * 側欄右端那一格量測什麼。預設是三段完整度儀表（en/zh-TW 雙軌）；
   * `count` 改成未處理筆數的徽章 —— 收件匣沒有翻譯這個維度，
   * 但它有一個同樣每天要回答的問題：**有幾封在等我**。
   */
  meter?: 'count';
};

export type MenuGroup = {
  label: string;
  items: MenuLink[];
  /** 可摺疊的群組預設收起來。收合側欄（minified）時一律忽略摺疊態。 */
  collapsible?: boolean;
};

export const menuGroups: MenuGroup[] = [
  {
    label: '日常',
    items: [
      { label: '表單收件匣', url: '/contact-submissions', icon: 'inbox', meter: 'count' },
      { label: '產品', url: '/products', icon: 'box' },
      { label: '文章', url: '/articles', icon: 'file' },
      { label: '頁面內容', url: '/pages', icon: 'layers' },
    ],
  },
  {
    label: '內容',
    items: [
      { label: '應用方案', url: '/applications', icon: 'body' },
      { label: 'FAQ', url: '/faqs', icon: 'help' },
      { label: '下載', url: '/downloads', icon: 'download' },
      { label: '銷售據點', url: '/locations', icon: 'pin' },
      { label: '媒體庫', url: '/media', icon: 'image' },
    ],
  },
  {
    label: '進階',
    collapsible: true,
    items: [
      { label: '分類與子分類', url: '/categories', icon: 'tag' },
      { label: '系列', url: '/collections', icon: 'grade' },
      { label: '認證', url: '/certifications', icon: 'seal' },
      { label: '導覽選單', url: '/menus', icon: 'menu' },
      { label: '轉址', url: '/redirects', icon: 'arrows' },
      { label: '設定', url: '/settings', icon: 'sliders' },
      { label: '使用者', url: '/users', icon: 'users' },
    ],
  },
];
