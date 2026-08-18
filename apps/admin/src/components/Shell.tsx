import { NavLink, Outlet, useNavigate } from 'react-router';
import { Gauge, type GaugeLevel } from './Gauge';
import { auth } from '@/lib/api';

/**
 * 後台外殼。
 *
 * <p>
 * **側欄每一項自帶迷你儀表，因此本後台沒有 Dashboard 頁。**
 * 一般後台會做一個滿是統計卡的首頁；那些數字看過一次就不再看。
 * 把缺漏程度直接掛在導覽上，打開後台的第一眼就是「哪一區最缺中文」——
 * 那才是每天都要回答的問題。
 * </p>
 */
type NavEntry = { to: string; label: string; level?: GaugeLevel };

const GROUPS: { title: string; items: NavEntry[] }[] = [
  {
    title: '內容',
    items: [
      { to: '/pages', label: '頁面內容' },
      { to: '/products', label: '產品' },
      { to: '/applications', label: '應用方案' },
      { to: '/articles', label: '文章' },
      { to: '/faqs', label: 'FAQ' },
      { to: '/downloads', label: '下載' },
      { to: '/locations', label: '銷售據點' },
    ],
  },
  {
    title: '分類',
    items: [
      { to: '/categories', label: '分類與子分類' },
      { to: '/collections', label: '系列' },
      { to: '/certifications', label: '認證' },
    ],
  },
  { title: '素材', items: [{ to: '/media', label: '媒體庫' }] },
  {
    title: '系統',
    items: [
      { to: '/menus', label: '導覽選單' },
      { to: '/redirects', label: '轉址' },
      { to: '/settings', label: '設定' },
      { to: '/users', label: '使用者' },
    ],
  },
];

export function Shell({ levels }: { levels?: Record<string, GaugeLevel> }) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-rule bg-surface">
        <div className="border-b border-rule px-5 py-4">
          <div className="label-condensed text-ink">EuniceMed</div>
          <div className="mt-0.5 text-[0.78rem] text-ink-faint">內容管理</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              <div className="label-condensed px-5 pb-1.5 text-ink-faint">
                {group.title}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-2 px-5 py-1.5 text-[0.9rem] transition ${
                      isActive
                        ? 'bg-rule-soft font-medium text-ink shadow-[inset_2px_0_0_var(--color-gauge)]'
                        : 'text-ink-soft hover:bg-rule-soft'
                    }`
                  }
                >
                  <span className="truncate">{item.label}</span>
                  {levels?.[item.to] !== undefined && (
                    <Gauge
                      level={levels[item.to]}
                      label={`${item.label} 的內容完整度`}
                      width="w-7"
                    />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => {
            auth.clear();
            navigate('/login', { replace: true });
          }}
          className="border-t border-rule px-5 py-3 text-left text-[0.85rem] text-ink-soft transition hover:bg-rule-soft"
        >
          登出
        </button>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
