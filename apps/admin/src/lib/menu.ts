import type { IconName } from '@/components/Icon';

/**
 * 側欄選單。
 *
 * <p>
 * **分群的判準是「多久會動一次」**，不是資料的種類（docs/15-cms-scope.md）。
 * 編輯者每天面對的是一份工作清單，不是一張資料表關聯圖：
 * </p>
 *
 * <ul>
 *   <li><b>日常</b>：每天到每月會開。來信、產品上下架、發文章、改頁面。</li>
 *   <li><b>內容</b>：每季到每年。應用方案、FAQ、下載、據點。</li>
 *   <li><b>帳號</b>：系統管理，與內容無關。</li>
 * </ul>
 *
 * <p>
 * **每個單元只在它自己的地方維護**（2026-08-29 第二次收斂）。所以側欄上
 * 找不到「認證」——它在頁面內容 → 關於我們裡面，因為那是它露出的地方；
 * 也找不到「分類與子分類」「系列」——它們是產品的屬性，在產品畫面的分頁上。
 * 同理移除了媒體庫（圖改成在各欄位就地上傳）、導覽選單、轉址與設定
 * （那三張表線上都是空的，站上跑的一直是前端的常數）。
 * </p>
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
    ],
  },
  {
    label: '帳號',
    items: [{ label: '使用者', url: '/users', icon: 'users' }],
  },
];

/**
 * 側欄項目「亮起來」的判斷。
 *
 * <p>
 * 分類與系列沒有自己的側欄項（它們在產品畫面的分頁上），
 * 但站在那兩個路由上時「產品」仍該是亮的 —— 否則使用者會覺得自己走丟了。
 * </p>
 */
const OWNED_BY: Record<string, string> = {
  '/categories': '/products',
  '/collections': '/products',
};

export function activeMenuUrl(pathname: string): string {
  const top = `/${pathname.split('/')[1] ?? ''}`;
  return OWNED_BY[top] ?? top;
}
