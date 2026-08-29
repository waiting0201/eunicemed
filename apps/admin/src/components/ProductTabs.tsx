import { NavLink } from 'react-router';

/**
 * 產品區的分頁列。
 *
 * <p>
 * 分類與系列**是產品的屬性，不是另一個模組** —— 它們曾經各佔一個側欄位置，
 * 於是「幫這個產品換分類」要在兩個選單之間來回。這一列把三者放進同一個畫面。
 * </p>
 *
 * <p>
 * 路由仍是頂層的 `/categories`、`/collections`，不是 `/products/...` ——
 * 後者會與 `/products/:id`（產品編輯）撞在一起。側欄「產品」的亮起判斷
 * 因此改由 `activeMenuUrl()` 處理（見 `lib/menu.ts`）。
 * </p>
 *
 * <p>樣式與 <see cref="LocaleTabs"/> 同一組值 —— 分頁就是分頁，不另發明一套。</p>
 */
const TABS = [
  { url: '/products', label: '產品清單' },
  { url: '/categories', label: '分類與子分類' },
  { url: '/collections', label: '系列' },
];

export function ProductTabs() {
  return (
    <div
      className="mb-5 flex flex-wrap gap-1 border-b"
      style={{ borderColor: 'var(--border)' }}
      role="tablist"
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.url}
          to={tab.url}
          end
          role="tab"
          className="px-4 py-2 text-[0.9rem]"
          style={({ isActive }) => ({
            borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: isActive ? 600 : 400,
            marginBottom: '-1px',
          })}
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
