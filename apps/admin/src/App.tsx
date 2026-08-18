import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { Shell } from './components/Shell';
import { Login } from './routes/Login';
import { Products } from './routes/Products';
import { ProductEdit } from './routes/ProductEdit';
import { Articles } from './routes/Articles';
import { Applications } from './routes/Applications';
import { Faqs } from './routes/Faqs';
import { Downloads } from './routes/Downloads';
import { Locations } from './routes/Locations';
import { Pages } from './routes/Pages';
import { PageEdit } from './routes/PageEdit';
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
            <Route path="/products/:id" element={<ProductEdit />} />
            <Route path="/pages" element={<Pages />} />
            <Route path="/pages/:key" element={<PageEdit />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/faqs" element={<Faqs />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/locations" element={<Locations />} />
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
    <>
      <div className="eyebrow">尚未建立</div>
      <h1 className="page-title">{title}</h1>
      <p className="mt-3 max-w-[52ch] text-[0.92rem]" style={{ color: 'var(--text-secondary)' }}>
        這個畫面還沒做。API 已經就緒，版面沿用產品列表的骨架。
      </p>
    </>
  );
}
