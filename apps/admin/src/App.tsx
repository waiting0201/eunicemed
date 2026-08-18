import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { Shell } from './components/Shell';
import { Login } from './routes/Login';
import { Products } from './routes/Products';
import { auth } from './lib/api';

/**
 * 路由。`basename` 是 `/admin` —— 後台掛在公開站底下（CLAUDE.md §2）。
 *
 * <p>
 * 尚未建立的畫面用同一個 <see cref="Placeholder"/>，
 * 而不是讓連結指向 404：側欄是本後台的地圖，斷掉的項目比「還沒做」更難理解。
 * </p>
 */
export function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<RequireAuth />}>
          <Route element={<Shell />}>
            <Route path="/products" element={<Products />} />
            <Route path="/pages" element={<Placeholder title="頁面內容" />} />
            <Route path="/applications" element={<Placeholder title="應用方案" />} />
            <Route path="/articles" element={<Placeholder title="文章" />} />
            <Route path="/faqs" element={<Placeholder title="FAQ" />} />
            <Route path="/downloads" element={<Placeholder title="下載" />} />
            <Route path="/locations" element={<Placeholder title="銷售據點" />} />
            <Route path="/categories" element={<Placeholder title="分類與子分類" />} />
            <Route path="/collections" element={<Placeholder title="系列" />} />
            <Route path="/certifications" element={<Placeholder title="認證" />} />
            <Route path="/media" element={<Placeholder title="媒體庫" />} />
            <Route path="/menus" element={<Placeholder title="導覽選單" />} />
            <Route path="/redirects" element={<Placeholder title="轉址" />} />
            <Route path="/settings" element={<Placeholder title="設定" />} />
            <Route path="/users" element={<Placeholder title="使用者" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/products" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function RequireAuth() {
  // token 在 sessionStorage —— 重新整理仍在，關掉分頁就登出
  return auth.access ? <Outlet /> : <Navigate to="/login" replace />;
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="px-8 py-6">
      <div className="label-condensed text-ink-faint">尚未建立</div>
      <h1 className="font-display text-[1.6rem] font-normal">{title}</h1>
      <p className="mt-3 max-w-[52ch] text-[0.92rem] text-ink-soft">
        這個畫面還沒做。API 已經就緒，版面沿用產品列表的骨架。
      </p>
    </div>
  );
}
