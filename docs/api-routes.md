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

### 驗證 Auth

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| POST | `/auth/login` | 公開 | 回 accessToken + refreshToken + user。IP 限流 30/分；連續失敗 5 次鎖 15 分鐘 |
| POST | `/auth/refresh` | 公開 | **單次使用**：舊 token 立即撤銷並發新的一組 |
| POST | `/auth/logout` | 公開 | 撤銷該 refresh token；冪等，找不到也回 200 |
| POST | `/auth/change-password` | 登入 | 成功後撤銷該使用者所有 refresh token |

### 後台：使用者

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/admin/users` | Admin | |
| POST | `/admin/users` | Admin | 建立的帳號一律 `mustChangePassword = true` |
| GET | `/admin/users/{id}` | Admin | |
| PUT/PATCH | `/admin/users/{id}` | Admin | 可改名／角色／啟用狀態／重設密碼／`unlock` 解鎖 |
| DELETE | `/admin/users/{id}` | Admin | 擋：刪自己、刪最後一個 Admin |

> 自我保護：不可停用自己、不可移除自己的 Admin 角色、不可刪除自己。

### 後台：產品系列（後台 CRUD 的參考實作）

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/admin/collections` | 登入 | 回全部語系（後台要對照翻譯） |
| POST | `/admin/collections` | Author+ | slug 重複回 409 |
| GET | `/admin/collections/{id}` | 登入 | |
| PUT/PATCH | `/admin/collections/{id}` | Author+ | 翻譯 upsert：**未帶到的語系維持原狀** |
| DELETE | `/admin/collections/{id}` | Author+ | |

### 產品（公開）

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/products?locale=&category=&subCategory=&collection=&bodyPart=&featured=&facets=&page=&pageSize=&sort=` | 公開 | facet 同維度不收斂、跨維度收斂 |
| GET | `/products/{category}/{sub}/{slug}` | 公開 | 三段皆驗證歸屬，不符回 404 |
| GET | `/products/by-slug/{slug}` | 公開 | 扁平查詢（預覽、舊 URL 301 解析） |

### 分類 / 子分類 / 認證（公開）

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/categories?include=subCategories` | 公開 | `stats[].value = "auto"` 由 API 代入產品數 |
| GET | `/categories/{slug}` | 公開 | 分類落地頁 |
| GET | `/sub-categories?category=` | 公開 | 含各子分類的已發布產品數 |
| GET | `/sub-categories/{category}/{sub}` | 公開 | 兩段驗證歸屬，不符回 404 |
| GET | `/certifications` | 公開 | About 認證帶與產品頁標章列共用 |

### 頁面區段

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/pages/{key}?locale=` | 公開 | `sections{}` 物件 + `refs`；media 已解析；未翻譯或內容不足的區段省略 |
| GET | `/admin/page-schema/{key}` | 登入 | 該頁全部區段 schema，`x-mediaPreset` 已展開成尺寸與提示 |
| GET | `/admin/pages` | 登入 | 18 頁清單 |
| GET | `/admin/pages/{key}` | 登入 | 全區段 × 全語系（media 回原始 mediaId） |
| PUT | `/admin/pages/{key}/sections/{sectionKey}` | Author+ | 驗證失敗回 400，errors 帶 JSON Pointer |
| PATCH | `/admin/pages/{key}/sections/{sectionKey}/enabled` | Author+ | |
| POST | `/admin/maintenance/sync-page-sections` | Admin + `X-Maintenance-Key` | 手動重跑；啟動時本來就會自動跑 |

> **不提供** `POST` / `DELETE` sections —— 區段集合由 schema registry 與同步器決定（版面鎖定）。

### 後台：媒體

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/admin/media-presets` | 登入 | 13 個 preset 的機器可讀規格；後台提示文字來源 |
| POST | `/admin/media` | Author+ | multipart 代傳，必帶 `presetKey`；415/413/400 硬拒絕、`warnings[]` 軟提醒 |
| GET | `/admin/media?search=&presetKey=` | 登入 | 媒體庫 |
| GET | `/admin/media/{id}/usages` | 登入 | 引用反查（含埋在 `DataJson` 內的，schema 驅動） |
| DELETE | `/admin/media/{id}` | Editor+ | 有引用時回 409 |
| POST | `/admin/uploads/sas` | Author+ | PDF 直傳用的 Blob SAS |

> 順序敏感：`media-presets` 與 `uploads` 必須排在 `["admin","media",{id}]` 之前。

### 後台：資料匯入

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| POST | `/admin/products/import?path=` | Admin | 匯入 149 筆舊站產品；冪等（SKU → (子分類,名稱) 備用鍵） |

### 應用方案 Applications

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/applications?locale=&type=body-part\|special-care` | 公開 | |
| GET | `/applications/body-map?locale=` | 公開 | 僅 `ShowOnBodyMap=1`；**路由必須排在 `{slug}` 之前** |
| GET | `/applications/{slug}?locale=` | 公開 | `stats` 的 `auto` 代入產品數；`supportLevels` 解析為 `collection:{slug,name}` |

> `productCount` ＝「`ProductApplications` 手動關聯 ∪ 同 `BodyPart` 的產品」，
> 條件與 `/products` 列表一致（含語系 join），兩邊數字才會對得上。

### 文章 News / Insights

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/news?locale=&category=&tag=&facets=&page=&pageSize=` | 公開 | |
| GET | `/news/{slug}?locale=` | 公開 | 含 event / gallery / prev / next |
| GET | `/insights?locale=&category=&tag=&facets=&page=&pageSize=` | 公開 | |
| GET | `/insights/{slug}?locale=` | 公開 | `event`/`gallery`/`prev`/`next` 恆為 null |
| GET | `/article-categories?locale=&kind=news\|insight` | 公開 | 回 `{kind,slug,name,count}` |

> **排程發布**：`PublishedAt` 為未來時間者列表與詳情都查不到（詳情回 404）。
> **`toc`** 由 body 的 H2 於伺服器端推導，**並回填 anchor id 到回傳的 body**（`Services/TocBuilder.cs`）。
> **`kind` 欄位不可省**：`ArticleCategory` 唯一鍵是 `(Kind, Slug)`，`sponsorship` 兩種 kind 各一筆。

### FAQ / 下載 / 據點

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/faqs?locale=&category=&facets=` | 公開 | 不分頁（折疊面板一次全載） |
| GET | `/faq-categories?locale=` | 公開 | 未被使用的分類仍回傳，count 為 0 |
| GET | `/downloads?locale=&type=&productSlug=&facets=` | 公開 | `fileLocale` 是**檔案語言**，與 `?locale=` 無關 |
| GET | `/sales-locations?locale=` | 公開 | 回 `{domestic,international}`；未填 region 者集中於最後一組 |

---

## 待實作

依 [13-api-roadmap.md](13-api-roadmap.md) 的階段順序。詳細規格見 [04-api.md](04-api.md) §4–§6。

### Phase 4 剩餘 — 後台產品 CRUD

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/admin/products[/{id}]` | Author+ | 刪除前須先清 ProductRelated 兩側（FK 為 Restrict） |
| POST | `/admin/products/{id}/publish` | **Editor+** | Author 呼叫回 403（授權規則已就緒） |
| POST | `/admin/products/{id}/unpublish` | Editor+ | |
| GET/PUT | `/admin/products/{id}/related` | Editor+ | 空陣列 = 回到自動計算 |
| GET/POST/PUT/DELETE | `/admin/{categories,sub-categories,certifications}[/{id}]` | Editor+ | |
| GET/PUT | `/admin/body-parts[/{id}]` | Editor+ | ShowOnBodyMap、排序 |

### Phase 3 剩餘 — 媒體

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| POST | `/admin/media/{id}/reprocess` | Editor+ | 以目前 preset 重新輸出 master 與 variants |

### Phase 6 剩餘 — 後台 CRUD

| Method | Path | 權限 | 說明 |
|---|---|---|---|
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
