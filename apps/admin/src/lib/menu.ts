import type { IconName } from '@/components/Icon';

/**
 * 側欄選單。結構對齊 Jabez/Admin 的 `data.ts`：
 * `isTitle` 是群組標題，其餘是連結。
 *
 * 對照 docs/03-cms.md §5 的 Screen Map。
 */
export type MenuEntry =
  | { isTitle: true; label: string }
  | { isTitle?: false; label: string; url: string; icon: IconName };

export const menuItems: MenuEntry[] = [
  { isTitle: true, label: '內容' },
  { label: '頁面內容', url: '/pages', icon: 'layers' },
  { label: '產品', url: '/products', icon: 'box' },
  { label: '應用方案', url: '/applications', icon: 'body' },
  { label: '文章', url: '/articles', icon: 'file' },
  { label: 'FAQ', url: '/faqs', icon: 'help' },
  { label: '下載', url: '/downloads', icon: 'download' },
  { label: '銷售據點', url: '/locations', icon: 'pin' },

  { isTitle: true, label: '分類' },
  { label: '分類與子分類', url: '/categories', icon: 'tag' },
  { label: '系列', url: '/collections', icon: 'grade' },
  { label: '認證', url: '/certifications', icon: 'seal' },

  { isTitle: true, label: '素材' },
  { label: '媒體庫', url: '/media', icon: 'image' },

  { isTitle: true, label: '系統' },
  { label: '導覽選單', url: '/menus', icon: 'menu' },
  { label: '轉址', url: '/redirects', icon: 'arrows' },
  { label: '設定', url: '/settings', icon: 'sliders' },
  { label: '使用者', url: '/users', icon: 'users' },
];
