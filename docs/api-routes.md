# API 路由表

> 本專案**不產生 OpenAPI/Swagger**（`Microsoft.Azure.Functions.Worker.Extensions.OpenApi` 在 .NET 10 上有已知的 `TypeLoadException`）。
> **這份表就是 API 契約。** 與 [`Api/Routing/AppRouter.cs`](../Api/Routing/AppRouter.cs) 必須逐條一致 —— 改路由時兩邊同步，否則視為不完整的變更。
>
> 端點規格（DTO 形狀、查詢參數、錯誤碼）見 [04-api.md](04-api.md)。回應一律包在 `ApiResponse` 信封內。
> 所有路徑省略 `/api` 前綴（`host.json` 的 `routePrefix`）。
>
> ⚠️ **URL 裡沒有版本段。** 早期文件寫過 `/api/v1`，那是錯的 —— `AppRouter` 比對的是
> `["collections"]` 這種形狀，實際端點就是 `/api/collections`。
> 把 `API_BASE` 設成 `/api/v1` 會讓前台每一頁都 500。

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
| POST | `/admin/users` | Admin | 建立的帳號一律 `mustChangePassword = true`；密碼下限由 `Auth__MinPasswordLength` 決定（預設 12）|
| GET | `/admin/users/{id}` | Admin | |
| PUT/PATCH | `/admin/users/{id}` | Admin | 可改 email（撞號回 409）／名稱／角色／啟用狀態／重設密碼／`unlock` 解鎖 |
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
| GET | `/products/{category}/{sub}/{slug}` | 公開 | 三段皆驗證歸屬，不符回 404；`images[]`（含 `isPrimary` 與 `variants[]`）、`bodyParts[]`、`downloads[]`（由 `ProductDownload` 掛載）皆已補齊 |
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
| DELETE | `/admin/pages/{key}/sections/{sectionKey}?locale=` | Author+ | 移除**一個語系**的內容。冪等；刪光所有語系是允許的（區段本身由 schema 目錄決定，永遠找得回來）|

> 沒有 DELETE 的話，區段內容**只進不出** —— schema 驗證要求必填欄位，
> 連「存成空的」都做不到，編輯者填錯語系只剩改資料庫一途。
> 與產品的翻譯刪除是同一個問題（見 docs/13 踩坑）。
| POST | `/admin/maintenance/sync-page-sections` | Admin + `X-Maintenance-Key` | 手動重跑；啟動時本來就會自動跑 |

> **不提供** `POST` / `DELETE` sections —— 區段集合由 schema registry 與同步器決定（版面鎖定）。

### 後台：媒體

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/admin/media-presets` | 登入 | 14 個 preset 的機器可讀規格；後台提示文字來源 |
| POST | `/admin/media` | Author+ | multipart 代傳，必帶 `presetKey`；415/413/400 硬拒絕、`warnings[]` 軟提醒 |
| GET | `/admin/media?search=&presetKey=` | 登入 | 媒體庫 |
| GET | `/admin/media/{id}/usages` | 登入 | 引用反查（含埋在 `DataJson` 內的，schema 驅動） |
| PUT/PATCH | `/admin/media/{id}` | Author+ | 目前只有 `altText`；空白會正規化成 null。**不換圖** —— 換圖等於換一筆媒體 |
| DELETE | `/admin/media/{id}` | Editor+ | 有引用時回 409 |
| POST | `/admin/uploads/sas` | Author+ | PDF 直傳用的 Blob SAS |
| POST | `/admin/uploads/register` | Author+ | 直傳完成後把 PDF 登記成一筆 Media（**沒有這步，PDF 進不了下載模組**）。大小取自 blob 本身，不採信前端數字；同一個檔名重覆登記回既有那筆 |

> 順序敏感：`media-presets` 與 `uploads` 必須排在 `["admin","media",{id}]` 之前。

### 後台：資料匯入

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| POST | `/admin/products/import?path=` | Admin | 匯入 149 筆舊站產品；冪等（SKU → (子分類,名稱) 備用鍵） |

### 後台：產品

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/admin/products?status=&search=&category=&subCategory=&page=&pageSize=` | 登入 | `search` 比對 Name（任一語系）與 Sku，**不比對 slug**；`status` 收 draft/published/archived |
| POST | `/admin/products` | Author+ | 一律建為草稿；slug 重複回 409 |
| GET | `/admin/products/{id}` | 登入 | 回全部語系 + 全部關聯 + base64 `rowVersion` |
| PUT/PATCH | `/admin/products/{id}` | Author+ | **null = 不動它、空陣列 = 清空**；`translations` 的值為 null = **刪除該語系**（刪到剩 0 個回 400）；帶 `rowVersion` 才啟用 409 併發保護 |
| DELETE | `/admin/products/{id}` | Author+ | 軟刪除，連帶清 `ProductRelated` 兩側與 `MediaUsage` |
| POST | `/admin/products/{id}/publish` | **Editor+** | 沒有任何語系翻譯時回 400（發布了前台也看不到） |
| POST | `/admin/products/{id}/unpublish` | Editor+ | 退回草稿，**`PublishedAt` 保留**（那是首次發布時間） |
| GET | `/admin/products/{id}/related` | 登入 | 只回人工指定的，不含自動遞補 |
| PUT | `/admin/products/{id}/related` | Editor+ | 陣列順序即畫面順序；空陣列 = 回到自動計算 |

> 寫入時驗證子分類必須屬於指定分類（不符回 400）—— 否則資料存得下去但三段 URL 永遠 404。
> `images` 的主圖唯一性由應用層保證：未指定時取第一張，指定多張時只認第一張。
> 順序敏感：`import` 與 `{id}/publish|unpublish|related` 都必須排在 `["admin","products",{id}]` 之前。

### 後台：標籤

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/admin/tags` | 登入 | 產品與文章共用同一張表，各自帶掛載數 |
| POST | `/admin/tags` | Editor+ | 未給 slug 時由 `nameEn` 產生；撞號回 409 |
| PUT/PATCH | `/admin/tags/{id}` | Editor+ | `nameZhTw` 送空字串＝清空（回到「中文站顯示英文名」）|
| DELETE | `/admin/tags/{id}` | Editor+ | 仍掛在**未刪除**的產品或文章上時回 409；只剩軟刪除內容的關聯列會一併清掉 |

> 名稱用 `NameEn` / `NameZhTw` 雙語欄位，不建 translation 表（同部位，docs/05 §3.2）。
> 沒有中文名稱的標籤在中文站顯示英文名 —— 這是語言純度規則的唯一例外：
> 標籤是篩選器的一顆按鈕，隱藏它會讓那一組內容在中文站永遠篩不出來。

### 後台：分類 / 子分類 / 認證 / 部位

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/admin/categories` | 登入 | 回全部語系 + 子分類數 + 產品數 |
| POST · PUT/PATCH · DELETE | `/admin/categories[/{id}]` | Editor+ | 軟刪除；仍有子分類或產品引用時回 409 |
| GET | `/admin/sub-categories?category=` | 登入 | |
| POST · PUT/PATCH · DELETE | `/admin/sub-categories[/{id}]` | Editor+ | slug **全站唯一**；底下有產品時不可換分類、不可刪除（皆 409） |
| GET | `/admin/certifications` | 登入 | |
| POST · PUT/PATCH · DELETE | `/admin/certifications[/{id}]` | Editor+ | **硬刪除**（此表無 IsDeleted）；仍掛在產品上時回 409 |
| GET | `/admin/body-parts` | 登入 | 7 筆固定 |
| PUT/PATCH | `/admin/body-parts/{id}` | Editor+ | 只能改名稱 / ShowOnBodyMap / 排序，**slug 不可改** |

> **讀取一律「登入即可」，只有寫入需 Editor+。** Author 編產品時就是要從這幾張表挑分類與部位，
> 連讀都擋掉的話產品表單填不出來。
> 部位刻意不提供 POST / DELETE：7 筆是固定的，人體圖熱區與版型都以 slug 對應。

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

### 後台：文章 / 文章分類 / 活動 / 圖庫

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/admin/articles?type=&status=&category=&search=&page=&pageSize=` | 登入 | 未發布排最前 —— 後台清單是「還有什麼要處理」 |
| POST | `/admin/articles` | Author+ | 一律建為草稿 |
| GET | `/admin/articles/{id}` | 登入 | |
| PUT/PATCH | `/admin/articles/{id}` | Author+ | `publishedAt` 可填未來時間做**排程發布**；已發布者改 `type` 回 409（網址會從 /news 變 /insights） |
| DELETE | `/admin/articles/{id}` | Author+ | 軟刪除 |
| POST | `/admin/articles/{id}/publish` | **Editor+** | `PublishedAt` 用 `??=` —— 已排程者不可被覆寫成立刻上線 |
| POST | `/admin/articles/{id}/unpublish` | Editor+ | `PublishedAt` 保留 |
| GET/PUT/DELETE | `/admin/articles/{id}/event` | Author+ | NewsEvent（共用主鍵 1:1）；PUT 兼建立與更新；掛到 insight 回 400 |
| GET/PUT | `/admin/articles/{id}/gallery` | Author+ | 整批取代，陣列順序即畫面順序 |
| GET | `/admin/article-categories?kind=` | 登入 | 含 articleCount |
| POST · PUT/PATCH · DELETE | `/admin/article-categories[/{id}]` | Editor+ | slug **只在同一個 kind 內唯一**；有文章時不可換 kind、不可刪除（皆 409） |

> **`ArticleCategory.Kind` 必須等於 `Article.Type`**，不符回 400。這條 FK 表達不了
> （需要複合 FK），只能在應用層擋 —— 否則文章會出現在分類計數裡但點進分類找不到。

### 後台：應用方案

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/admin/applications?type=&status=&bodyPart=` | 登入 | 含 productCount |
| POST | `/admin/applications` | Author+ | 一律建為草稿；`productIds` 內嵌，順序即排序 |
| GET | `/admin/applications/{id}` | 登入 | |
| PUT/PATCH | `/admin/applications/{id}` | Author+ | `mapPosition` 形狀為 `{hotspot:{cx,cy},chip:{cx,cy}}`，四個值皆須為數字，否則 400 |
| DELETE | `/admin/applications/{id}` | Author+ | 軟刪除，連帶清 `ProductApplication` |
| POST | `/admin/applications/{id}/publish` | **Editor+** | `showOnBodyMap` 為 true 卻無座標時回 400 |
| POST | `/admin/applications/{id}/unpublish` | Editor+ | |

> `type=1`（依部位）必須指定 `bodyPartId` —— 公開端點的產品數是
> 「手動關聯 ∪ 同 BodyPart 的產品」，沒綁部位就永遠是 0。
> Application **沒有 `PublishedAt`**，不做排程發布（與 Article 不同，不要照抄）。

### 後台：FAQ / 下載 / 據點

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/admin/faq-categories` | 登入 | 含 faqCount |
| POST · PUT/PATCH · DELETE | `/admin/faq-categories[/{id}]` | Editor+ | 底下有題目時不可刪（409） |
| GET | `/admin/faqs?category=&status=` | 登入 | |
| POST · PUT/PATCH · DELETE | `/admin/faqs[/{id}]` | Editor+ | `answer` 淨化後為空回 400（會變成點得開但空白的問答） |
| GET | `/admin/downloads?type=&status=&fileLocale=` | 登入 | 含 fileUrl 與掛載的 productIds |
| POST · PUT/PATCH · DELETE | `/admin/downloads[/{id}]` | Editor+ | 仍掛在產品或被認證引用時回 409 |
| GET | `/admin/sales-locations?type=&country=&status=` | 登入 | |
| POST · PUT/PATCH · DELETE | `/admin/sales-locations[/{id}]` | Editor+ | `countryCode` 一律轉大寫 |

> **這四個模組的寫入是 Editor+，不是 Author+。** 它們沒有發布端點，`status` 是 payload
> 裡的一個欄位、存檔即生效；開放 Author 寫入的話，他只要在建立時送 `status=1` 就直接上線，
> 等於繞過「Author 不可發布」。有草稿工作流的模組（產品、文章、應用方案）維持 Author+ ——
> 那些的 POST 一律建為草稿，PUT 不碰 `status`，發布只能走 `/publish`。
>
> `Download.FileLocale` 是**檔案本身的語言**，**刻意不套站台語系白名單**
> （可能有站台沒有的語言，如日文型錄），與翻譯的 `Locale`（介面語系）是兩件事。

### 導覽 / 設定 / 轉址 / Sitemap（公開）

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/menus?locale=&menu=` | 公開 | 回 `{header,footer}`；不帶 `menu` 時兩組都回。缺該語系標籤的項目不出現 |
| GET | `/settings?locale=` | 公開 | 翻譯值覆寫不翻譯值；不需翻譯的設定用 LEFT JOIN 保留 |
| GET | `/sitemap` | 公開 | **無 locale 參數**。每列的 `locales` 只列該語系確實有內容的 |
| GET | `/redirects` | 公開 | 供前端 middleware 載入（5 分鐘快取） |

> `sitemap` 的靜態頁語系判定共用 `PageHandler.IsRenderable`（看 schema 的 `required`），
> **不是**「翻譯列存在」—— 跨語系同步會補建只含圖片的列，那種頁面點進去是空白的。

### 後台：側欄統計

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/admin/summary` | 登入 | 各模組的 `{total, locales:{en, zhTw}}`；`locales` 是**有該語系翻譯的筆數** |

> 後台側欄每一項帶一個完整度儀表（**因此不做 Dashboard 頁**）。
> 由前端拿各列表來算是不行的：分頁的模組只看得到第一頁，數字會騙人。
>
> ⚠️ SQL 用 `LEFT JOIN` + `COUNT(DISTINCT CASE …)`，
> **不可寫成 `SUM(CASE WHEN EXISTS (子查詢))`** —— SQL Server 拒絕
> 「彙總函式內含子查詢」（Msg 130）。

### 後台：選單 / 轉址 / 設定

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/admin/menus` | 登入 | 全部語系的扁平清單 |
| PUT | `/admin/menus` | Editor+ | **整棵樹一次取代**（`{menu, items[]}`）；最多兩層，超過回 400 |
| GET | `/admin/redirects?search=` | 登入 | |
| POST · PUT/PATCH · DELETE | `/admin/redirects[/{id}]` | Editor+ | 路徑正規化；自我轉址 400、重複來源 409；狀態碼限 301/302/307/308 |
| GET | `/admin/settings` | Admin | 同時回不翻譯值與各語系值 |
| PUT | `/admin/settings` | Admin | 整批 upsert，未帶到的鍵維持原狀 |

---

## 待實作

依 [13-api-roadmap.md](13-api-roadmap.md) 的階段順序。詳細規格見 [04-api.md](04-api.md) §4–§6。

### Phase 3 剩餘 — 媒體

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| POST | `/admin/media/{id}/reprocess` | Editor+ | 以目前 preset 重新輸出 master 與 variants |

### Phase 7 剩餘 — 表單（擋於 SMTP）

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| POST | `/contact` | 公開 | reCAPTCHA + honeypot + 速率限制；**先入庫再寄信**，SMTP 失敗仍回 201 |
| GET | `/admin/contact-submissions?type=&status=&page=` | 登入 | 含 Viewer |
| PATCH | `/admin/contact-submissions/{id}` | Editor+ | 標記已處理 |
| GET | `/admin/contact-submissions/export` | Editor+ | CSV |
