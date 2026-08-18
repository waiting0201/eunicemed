import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { Shell } from './components/Shell';
import { Login } from './routes/Login';
import { Products } from './routes/Products';
import { ProductEdit } from './routes/ProductEdit';
import { Articles } from './routes/Articles';
import { ArticleEdit } from './routes/ArticleEdit';
import { Applications } from './routes/Applications';
import { Faqs } from './routes/Faqs';
import { Downloads } from './routes/Downloads';
import { Locations } from './routes/Locations';
import { Pages } from './routes/Pages';
import { PageEdit } from './routes/PageEdit';
import { Media } from './routes/Media';
import { Users } from './routes/Users';
import { Redirects } from './routes/Redirects';
import { Settings } from './routes/Settings';
import { Menus } from './routes/Menus';
import { Taxonomy } from './routes/Taxonomy';
import { Collections } from './routes/Collections';
import { Certifications } from './routes/Certifications';
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
            <Route path="/articles/:id" element={<ArticleEdit />} />
            <Route path="/faqs" element={<Faqs />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/categories" element={<Taxonomy />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/certifications" element={<Certifications />} />
            <Route path="/media" element={<Media />} />
            <Route path="/menus" element={<Menus />} />
            <Route path="/redirects" element={<Redirects />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/users" element={<Users />} />
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
