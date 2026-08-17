# API 路由表

> 本專案**不產生 OpenAPI/Swagger**（`Microsoft.Azure.Functions.Worker.Extensions.OpenApi` 在 .NET 10 上有已知的 `TypeLoadException`）。
> **這份表就是 API 契約。** 與 [`Api/Routing/AppRouter.cs`](../Api/Routing/AppRouter.cs) 必須逐條一致 —— 改路由時兩邊同步，否則視為不完整的變更。
>
> 端點規格（DTO 形狀、查詢參數、錯誤碼）見 [04-api.md](04-api.md)。回應一律包在 `ApiResponse` 信封內。
> 所有路徑省略 `/api/v1` 前綴。

## 圖例

| 權限 | 意義 |
|---|---|
| 公開 | 匿名可用 |
| 登入 | 需有效 JWT，不限角色 |
| Author+ | Author / Editor / Admin |
| Editor+ | Editor / Admin（含發布動作） |
| Admin | 僅 Admin |

---

## 已實作

### 系統

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/health` | 公開 | 健康檢查 |

### 產品系列 Collections

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/collections?locale=` | 公開 | 全部系列，依 SortOrder |
| GET | `/collections/{slug}?locale=` | 公開 | 單一系列；缺該語系回 404 |

---

## 待實作

依 [計畫](../README.md) 的階段順序。詳細規格見 [04-api.md](04-api.md) §4–§6。

### Phase 2 — 驗證與後台骨架

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| POST | `/auth/login` | 公開 | 回 accessToken + refreshToken + user；有速率限制與失敗鎖定 |
| POST | `/auth/refresh` | 公開 | refresh token 單次使用後撤銷並輪替 |
| POST | `/auth/logout` | 登入 | 撤銷 refresh token |
| GET/POST/PUT/DELETE | `/admin/users[/{id}]` | Admin | 使用者管理 |
| GET/POST/PUT/DELETE | `/admin/collections[/{id}]` | Editor+ | 系列 CRUD（後台 CRUD 的參考實作） |

### Phase 3 — 媒體

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/admin/media-presets` | 登入 | 13 個 preset 的機器可讀規格；後台提示文字來源 |
| POST | `/admin/media` | Author+ | multipart 代傳，必帶 `presetKey`；415/413/400 硬拒絕、`warnings[]` 軟提醒 |
| GET | `/admin/media?search=&presetKey=` | 登入 | 媒體庫 |
| GET | `/admin/media/{id}/usages` | 登入 | 引用反查 |
| POST | `/admin/media/{id}/reprocess` | Editor+ | 以目前 preset 重新輸出 master 與 variants |
| DELETE | `/admin/media/{id}` | Editor+ | 有引用時回 409 |
| POST | `/admin/uploads/sas` | Author+ | PDF 直傳用的 Blob SAS |

### Phase 4 — 分類與產品

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/products?...&facets=true` | 公開 | 列表 + 分面計數；篩選見 04 §4 |
| GET | `/products/{category}/{sub}/{slug}` | 公開 | 三段歸屬皆驗證，不符回 404 |
| GET | `/products/by-slug/{slug}` | 公開 | 扁平查詢（預覽、舊 URL 301 解析） |
| GET | `/categories?include=subCategories` | 公開 | |
| GET | `/categories/{category}` | 公開 | 分類落地頁內容 |
| GET | `/sub-categories?category=` | 公開 | |
| GET | `/sub-categories/{category}/{sub}` | 公開 | 子分類落地頁內容 |
| GET | `/certifications` | 公開 | |
| GET/POST/PUT/DELETE | `/admin/products[/{id}]` | Author+ | |
| POST | `/admin/products/{id}/publish` | **Editor+** | Author 呼叫回 403 |
| POST | `/admin/products/{id}/unpublish` | Editor+ | |
| GET/PUT | `/admin/products/{id}/related` | Editor+ | 空陣列 = 回到自動計算 |
| POST | `/admin/products/import` | Admin | 匯入 149 筆舊站產品 |
| GET/POST/PUT/DELETE | `/admin/{categories,sub-categories,certifications}[/{id}]` | Editor+ | |
| GET/PUT | `/admin/body-parts[/{id}]` | Editor+ | ShowOnBodyMap、排序 |

### Phase 5 — 頁面區段

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/pages/{key}?locale=` | 公開 | `sections{}` 物件 + `refs`；缺語系的區段整段省略 |
| GET | `/admin/page-schema/{key}` | 登入 | 該頁全部區段的 JSON Schema |
| GET | `/admin/pages` | 登入 | 18 頁清單 |
| GET | `/admin/pages/{key}` | 登入 | 全區段 × 全語系 |
| PUT | `/admin/pages/{key}/sections/{sectionKey}` | Editor+ | Schema 驗證失敗回 400，errors 帶 JSON Pointer |
| PATCH | `/admin/pages/{key}/sections/{sectionKey}/enabled` | Editor+ | |
| POST | `/admin/maintenance/sync-page-sections` | Admin + `X-Maintenance-Key` | 手動重跑區段同步 |

> **不提供** `POST` / `DELETE` sections —— 區段集合由 schema registry 與 seed 同步器決定。

### Phase 6 — 文章、FAQ、下載、據點、應用方案

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/applications?type=` | 公開 | |
| GET | `/applications/body-map` | 公開 | 僅 `ShowOnBodyMap=1` 的 4 筆 |
| GET | `/applications/{slug}` | 公開 | |
| GET | `/news?category=&tag=&facets=true` | 公開 | |
| GET | `/news/{slug}` | 公開 | 含 event / gallery / prev / next |
| GET | `/insights?category=&facets=true` | 公開 | |
| GET | `/insights/{slug}` | 公開 | `toc` 由 body 的 H2 伺服器端推導 |
| GET | `/article-categories?kind=&facets=true` | 公開 | |
| GET | `/faqs?category=&facets=true` | 公開 | |
| GET | `/faq-categories?facets=true` | 公開 | |
| GET | `/downloads?type=&productSlug=&facets=true` | 公開 | |
| GET | `/sales-locations` | 公開 | 回 `{domestic,international}`，不分頁 |
| GET/POST/PUT/DELETE | `/admin/{applications,articles,article-categories,faqs,faq-categories,downloads,sales-locations}[/{id}]` | Editor+ | |
| POST | `/admin/{applications,articles}/{id}/publish` | **Editor+** | |
| GET/PUT/DELETE | `/admin/articles/{id}/event` | Editor+ | NewsEvent |
| GET/PUT | `/admin/articles/{id}/gallery` | Editor+ | ArticleImage 排序 |

### Phase 7 — 表單、設定、導覽

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| POST | `/contact` | 公開 | reCAPTCHA + honeypot + 速率限制；**先入庫再寄信**，SMTP 失敗仍回 201 |
| GET | `/menus?locale=` | 公開 | |
| GET | `/settings?locale=` | 公開 | |
| GET | `/sitemap` | 公開 | 全部可索引 URL + lastmod（無 locale 參數） |
| GET | `/admin/contact-submissions?type=&status=&page=` | 登入 | 含 Viewer |
| PATCH | `/admin/contact-submissions/{id}` | Editor+ | 標記已處理 |
| GET | `/admin/contact-submissions/export` | Editor+ | CSV |
| GET/PUT | `/admin/menus` | Editor+ | 整棵樹 diff |
| GET/POST/PUT/DELETE | `/admin/redirects[/{id}]` | Editor+ | |
| GET/PUT | `/admin/settings` | Admin | |
