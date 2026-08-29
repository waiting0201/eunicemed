import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { Gauge } from './Gauge';
import { moduleLevel } from '@/lib/completeness';
import { activeMenuUrl, menuGroups, type MenuLink } from '@/lib/menu';
import { api, auth } from '@/lib/api';

/**
 * 後台外殼。版面結構對齊 Jabez/Admin：
 * `app-wrap` 格線（header 橫跨全寬、sidebar 貼齊左側）、可收合側欄、footer。
 *
 * <p>
 * 側欄每一項可帶一個迷你儀表 —— **因此本後台沒有 Dashboard 頁**。
 * 一般後台的統計卡首頁看過一次就不再看；把缺漏程度掛在導覽上，
 * 打開後台的第一眼就是「哪一區最缺中文」，那才是每天要回答的問題。
 * </p>
 */
export function Shell() {
  const navigate = useNavigate();

  /**
   * 側欄儀表的資料。**由專門的統計端點提供**，不是拿各列表來算 ——
   * 分頁的模組（產品 149 筆）只看得到第一頁，數字會騙人。
   *
   * 取不到就不顯示儀表，不擋畫面：導覽本身仍要能用。
   */
  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () => api.summary(),
    staleTime: 60_000,
  });

  const levelOfUrl = (url: string) => {
    const key = url.replace(/^\//, '');
    const entry = summary.data?.[key];
    return entry ? moduleLevel(entry) : undefined;
  };
  const [minified, setMinified] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const { pathname } = useLocation();

  return (
    <div className={`app-wrap ${minified ? 'nav-minified' : ''} ${navOpen ? 'nav-open' : ''}`}>
      <header className="app-header">
        <a className="app-logo" href="/admin/products">
          <Logo compact={minified} />
          {!minified && (
            <span className="eyebrow ml-1 whitespace-nowrap">內容管理</span>
          )}
        </a>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            // 桌機收合側欄；行動裝置開關抽屜。同一顆鈕，因為它們是同一件事
            setMinified((v) => !v);
            setNavOpen((v) => !v);
          }}
          aria-label={minified ? '展開側欄' : '收合側欄'}
        >
          <Icon name="panelLeft" className="icon" />
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            <Icon name="logout" className="icon icon-sm" />
            登出
          </button>
        </div>
      </header>

      <aside className="app-sidebar">
        <nav className="flex-1 py-2">
          {menuGroups.map((group) => (
            <div key={group.label}>
              <div className="nav-title">{group.label}</div>
              {group.items.map((item) => renderLink(item))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="app-body">
        <div className="content-wrapper">
          <Outlet />
        </div>

        <footer className="app-footer">
          <span className="mono">Comfort Plus Corporation</span>
          <span>© {new Date().getFullYear()}</span>
        </footer>
      </main>
    </div>
  );

  /** 側欄的一項。右端那一格依 `meter` 決定是完整度儀表還是未處理筆數。 */
  function renderLink(item: MenuLink) {
    const entry = summary.data?.[item.url.replace(/^\//, '')];
    const level = levelOfUrl(item.url);
    const pending = item.meter === 'count' ? (entry?.total ?? 0) : 0;

    return (
      <NavLink
        key={item.url}
        to={item.url}
        title={item.label}
        onClick={() => setNavOpen(false)}
        className={`nav-link ${activeMenuUrl(pathname) === item.url ? 'active' : ''}`}
      >
        <Icon name={item.icon} className="icon" />
        <span className="nav-label flex-1 truncate">{item.label}</span>

        {!minified && item.meter === 'count' && pending > 0 && (
          <span className="nav-count" aria-label={`${pending} 封未處理`}>
            {pending > 99 ? '99+' : pending}
          </span>
        )}

        {!minified && item.meter !== 'count' && level !== undefined && (
          <Gauge level={level} label={`${item.label} 的內容完整度`} width="w-7" onDark />
        )}
      </NavLink>
    );
  }

  function logout() {
    auth.clear();
    navigate('/login', { replace: true });
  }
}
