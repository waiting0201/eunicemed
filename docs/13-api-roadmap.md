# 13 · API 實作路線圖與進度

> 上層導覽見 [CLAUDE.md](../CLAUDE.md)。端點規格見 [04-api.md](04-api.md)、路由契約見 [api-routes.md](api-routes.md)、本機環境見 [12-local-dev.md](12-local-dev.md)。
>
> 進度看 [../STATUS.md](../STATUS.md)。本檔記錄各階段**做什麼、怎麼驗收**，以及**踩到的坑**（最重要的一節，在最下方）。

---

## 進度

**狀態一律記在 [../STATUS.md](../STATUS.md)**，不在本檔重複維護 —— 兩邊各記一份很快就會互相矛盾。
本檔負責的是各階段的**內容、驗收方式，以及累積的踩坑紀錄**。

估時合計約 **33–43 人日**（單人）。規模參考：54 張表、~90 個端點、60 個頁面區段 JSON Schema、13 個媒體 preset。

---

## 架構前提（已定案，不再討論）

整套骨架對齊 [Jabez/Api](/Users/tim/webapps/Jabez/Api) —— 同一位開發者的既有專案，跑在同樣的 Flex Consumption 上，架構已被 ~230 條路由驗證過。

| 項目 | 決定 |
|---|---|
| 專案結構 | 單一 `Api` 專案（**非**四專案分層） |
| 路由 | `RouterFunction` catch-all `{*route}` → `AppRouter` C# list-pattern 分派 |
| 資料存取 | **Dapper 讀 / EF Core 寫**，**禁止** Repository Pattern |
| 回應格式 | `ApiResponse{success,data,message,errors,timestamp}` 信封（**非** RFC 7807） |
| Migration | 永遠在 `Program.cs` 啟動時 `MigrateAsync()`，CI 不碰 DB |
| 影像 | SkiaSharp（MIT），**不用** ImageSharp（Six Labors Split License 有年營收條款） |
| 測試 | 不建測試專案，QA 走人工實測（照 Jabez 慣例），`Api/http/*.http` 為回歸清單 |

> **寫任何新程式碼前，先讀 Jabez 對應的同類型檔案當範本。** 不確定怎麼寫時，找 3 份相似的既有檔案取多數派寫法。寧可「不完美但統一」，不要「個別完美但分散」。

---

## 各階段內容與驗收

### ✅ Phase 0 — 骨架 + 文件同步

`git init`、`EuniceMed.sln`、`Api.csproj`（net10.0）、`global.json`、`.gitignore`。
從 Jabez 整段沿用：`ApiResponse` / `PagedResult` / `AppException` / `ExceptionMiddleware` / `RouterFunction` / `AppDbContextFactory` / `host.json`。

**驗收**：`func start` → `curl localhost:7071/api/health` 回 200。

### ✅ Phase 1 — 端到端切片：Collection

挑 `Collection` 是因為它有 translation 表、只有 3 筆、無媒體、無 status、無軟刪除 —— 剛好只驗證多語系這一件事。

Entity + translation → `Data/Configurations/CollectionConfiguration.cs`（含 `HasData` seed）→ 首支 migration → `Common/LocaleQuery.cs` → `Services/Dapper/CollectionReadService.cs` → `Handlers/CollectionHandler.cs` → `AppRouter` 三條路由。

**驗收**：[`Api/http/phase1-collections.http`](../Api/http/phase1-collections.http) 全 10 條通過，且 plan cache 顯示 `(@locale varchar(10))`。

### ✅ Phase 2 — Auth / RBAC / AuditLog / CRUD 骨架

`User` / `Role` / `UserRole` / `RefreshToken` / `AuditLog`。`AuthHandler`（login / refresh / logout，BCrypt，refresh 單次使用後撤銷）、`JwtService`（照 Jabez，`MapInboundClaims = false`）。
`AppRouter` 的守門方法：`IsPublicRoute` / `GetRequiredRole` / `RequireRole`，外加 EuniceMed 特有的一條 —— **Author 可建草稿但不可發布**。
`AuditLogInterceptor`（`SaveChangesInterceptor`，需要 `EntityEntry.OriginalValues`）。`/auth/login` 速率限制 + DB 登入失敗鎖定。

**驗收**：[`Api/http/phase2-auth.http`](../Api/http/phase2-auth.http) 全數通過，含 RBAC 矩陣、
token 輪替（單次使用）、帳號鎖定與解鎖、改密碼撤銷所有 session、三項自我保護（不能停用／降權／刪除自己）。

> `rowVersion` 併發衝突（409）延後到 Phase 4 —— `Collection` 依 docs/05 §1 沒有 `ROWVERSION` 欄位，
> 要等有該欄位的實體（`Product` / `Article` 等 6 張表）才驗得到。`ExceptionMiddleware` 已接好
> `DbUpdateConcurrencyException → 409`。

### ⬜ Phase 3 — 媒體管線 · 4–5 天

`Media` / `MediaVariant` / `MediaUsage`。`Media/media-presets.json`（13 個 preset，已建立）+ `GET /admin/media-presets`。
`ImageService`（SkiaSharp）：依 preset 寬**等比只縮不放** → WebP q78 + 原格式 → 去 EXIF、轉 sRGB、檔名正規化加短雜湊 → 寫 Blob（master / variants / 原檔進 `media-originals`）。
硬拒絕 415/413/400 與非阻擋 `warnings[]` 兩套規則（[11](11-media-specs.md) §4）。SVG 清洗（僅 `logo-mark` 收 SVG）。

**變體階梯已定案（2026-08-17）**：WebP 出完整階梯、原格式只出 preset 寬度那一張，每次上傳 1–5 個檔。
定義見 [11-media-specs.md](11-media-specs.md) §2a，程式一律讀 `Api/Media/media-presets.json` 的 `output` 欄位。
連帶：**Function App 實例需 2048MB**，且上傳端點要有進度回饋（最壞情況 5 次編碼）。

### 🟡 Phase 4 — 分類 + 產品（進行中）

`Category` / `SubCategory` / `Certification` / `BodyPart` / `Tag` 與其 translation、join 表；`Product` 全家族（8 張關聯表）。
公開端點含 **facets**、三段所有權驗證、`stats[].value == "auto"` 代入實際產品數、相關產品自動遞補。
`Data/Seed/LegacyProductImporter.cs` 匯入 `reference/legacy/products.json`（149 筆）。

> ⚠️ 該檔 17 個 key 中有 **6 個帶 `-1` 後綴**（`knee-support-1`、`back-support-1`、`wrist-support-1`、`stockings-for-venous-therapy-1`、`travel-stockings-1`、`diabetic-socks-1`），必須去除才對得上 [05](05-database.md) §4 的 `SubCategory.Slug`。

**已完成**：全部實體與設定（含 8 張關聯表）、3 支 migration、seed（3 分類 / 17 子分類 / 5 認證 / 7 部位，皆含雙語翻譯）、
Dapper 讀取層、`FacetFolder`、公開端點（products 列表+facets、三段路徑、by-slug、categories、sub-categories、certifications）、
相關產品自動遞補、`POST /admin/products/import`。驗收見 [`Api/http/phase4-products.http`](../Api/http/phase4-products.http)。

**尚未完成（Phase 4 剩餘工作）**：
- 後台產品 CRUD：`GET/POST/PUT/DELETE /admin/products`、`/publish`、`/unpublish`、`/related`
- 後台分類／子分類／認證／部位 CRUD
- 產品詳情的 `images` 與 `bodyParts` 兩個欄位（目前回空陣列，待 Phase 3 的媒體管線接上）
- `rowVersion` 併發 409 的實測（`Product` 已有 `ROWVERSION` 欄位，等後台 PUT 做完才驗得到）

**已驗收通過**：
- facet 同維度不收斂：篩 `category=orthopedic-support` 後 categories 仍回全部三類（60/45/44），
  subCategories 收斂到該分類的 7 筆
- 三段歸屬：錯 category 或錯 sub 皆回 404
- 語言純度：產品只有 en 翻譯時，`locale=zh-TW` 回 404
- 匯入冪等：空庫連跑三次 → 149 / 149 / 149，slug 全唯一

### ⬜ Phase 5 — 頁面區段 + JSON Schema registry · 6–8 天（含約 3 天寫 60 個 schema）

`Page` / `PageSection` / `PageSectionTranslation`。`SchemaRegistry`（embedded resource，**lazy per key**）。`JsonSchema.Net` 驗證 → JSON Pointer 錯誤。`x-localeInvariant` 跨語系同步。`SectionMediaWalker`。`refs` 解析。`PageSectionSynchronizer`。

先寫 `about` 的 6 個 schema 打通全流程，再量產其餘 54 個。

### ⬜ Phase 6 — 文章 / FAQ / 下載 / 據點 / 應用方案 · 6–8 天

`Article` 全家族（含共用 PK 的 `NewsEvent`）、`ArticleCategory`、`Faq`、`Download`、`SalesLocation`、`Application`。`toc` 由 body 的 H2 伺服器端推導並回填 anchor id（AngleSharp）。

### ⬜ Phase 7 — 表單 / 設定 / 選單 / 轉址 / sitemap · 3–4 天

`POST /contact`（**先入庫再寄信**，SMTP 失敗仍回 201）、MailKit、收件匣、`menus`（整棵樹 diff）、`redirects`、`settings`、`sitemap`。

### ⬜ Phase 8 — 部署 · 2–3 天

`.github/workflows/api-deploy.yml`（照抄 Jabez：`dotnet publish` → `azure/login@v2` OIDC → `Azure/functions-action@v1`；Flex Consumption 不支援 publish profile）。
`infra/main.bicep`（SWA Free、Flex plan + Function App、Storage 三容器、SQL 以 `existing` 參照）。
平台層 CORS 設 `https://www.eunicemed.com` —— **不要在 worker 內自己寫 CORS**，平台會先攔 `OPTIONS`，會變成雙重 header。

---

## 踩到的坑（累積記錄）

新發現請往下加，附日期。這一節是給未來的自己與新對話看的。

### 2026-08-17 · `Locale` 參數型別

DB 的 `Locale` 是 `varchar(10)`。若 EF/Dapper 送 `NVARCHAR` 參數，SQL Server 會在欄位側加隱含轉換，`UX_*Tr` 索引失效，每個公開請求變成掃描 —— **不會有任何錯誤訊息，只會慢**。
處置：EF 設 `.HasColumnType("varchar(10)").IsUnicode(false)`；Dapper 用 `DbType.AnsiString`。驗證方式見 [12-local-dev.md](12-local-dev.md) §7。

### 2026-08-17 · 兩份 JSON 設定都要寫

`Program.cs` 必須同時設 `services.Configure<JsonOptions>`（管 `IActionResult` 輸出）**和** `services.ConfigureHttpJsonOptions`（管 `req.ReadFromJsonAsync` 輸入）。只設一個會造成輸入輸出命名規則不對稱。Jabez 也是兩個都設。

### 2026-08-17 · Clock 刻意與 Jabez 不同

Jabez 的 `Clock.Now` 回台北時間；本專案回 **UTC**，因為 [05](05-database.md) §1 規定 `datetime2` 存 UTC，且這是對外多語系網站。要顯示營業時間時才用 `Clock.Taipei(utc)`。**從 Jabez 複製程式碼時注意這個差異。**

### 2026-08-17 · seed 了主表卻沒 seed 翻譯表 = 該實體完全消失

`Categories` 與 `Certifications` 都有 seed，但**忘了 seed 它們的翻譯表**。
公開查詢是 `INNER JOIN` 翻譯表（語言純度原則的實作方式），沒有翻譯列就等於不存在 ——
`GET /categories` 回空陣列、`GET /certifications` 回 0 筆，而且不會有任何錯誤。
**新增任何有翻譯表的實體 seed 時，主表與翻譯表必須同時 seed。**

### 2026-08-17 · 匯入器的兩個 bug（都只在重跑時才顯現）

1. **同批次 slug 相撞**：`UniqueSlugAsync` 逐筆查 DB，但同批次內尚未 `SaveChanges`
   的產品彼此看不見，兩個同名產品拿到同一個 slug → 撞 `UX_Product_Slug`。
   改為一次載入既有 slug 到 `HashSet`，配發時立即登記佔用（順帶省掉 149 次往返）。
2. **業務鍵覆蓋不足**：只用 `Sku` 對照，但來源 149 筆裡**只有 60 筆有 model**，
   另外 89 筆每次重跑都被當成新產品（實測第二次匯入變成 238 筆）。
   來源資料的 (子分類, 英文名稱) 完全無重複，足以當備用鍵。
   **教訓：匯入器的冪等性一定要用「空庫連跑三次」驗，跑一次看起來都是對的。**

### 2026-08-17 · sqlcmd 對有篩選索引的表需要 SET QUOTED_IDENTIFIER ON

`DELETE FROM Products` 會失敗並回 `Msg 1934 ... 'QUOTED_IDENTIFIER'`，
因為該表有篩選索引（`WHERE IsDeleted = 0`）。用 `docker exec ... sqlcmd` 手動清資料時，
指令開頭要加 `SET QUOTED_IDENTIFIER ON;`。
（我第一次把錯誤輸出導到 /dev/null，於是「以為清掉了」而誤判了後續的冪等測試 ——
**清資料的指令不要吞錯誤**。）

### 2026-08-17 · `IHttpContextAccessor` 在 Functions worker 不會被填充

`AuditLogInterceptor` 原本用 `IHttpContextAccessor` 取操作者，結果 `AuditLog.UserId` **永遠是 null** ——
稽核紀錄少了 docs/04 §6 要求的「誰」。原因是它靠 ASP.NET Core hosting layer 設定的 AsyncLocal，
而 isolated worker 的 pipeline 不經過那裡（即使開了 ASP.NET Core integration 也一樣）。
處置：改為 scoped 的 `Services/CurrentUser.cs`，由 `AppRouter` 在驗證通過後明確 `Set(principal)`。
**任何需要「目前使用者」的地方都走這個服務，不要用 `IHttpContextAccessor`。**

### 2026-08-17 · Core Tools 會剝掉 X-Forwarded-For，且速率限制不可與鎖定門檻同值

兩個獨立但互相放大的問題：

1. 本機的 Functions Core Tools host **不會把 `X-Forwarded-For` 傳給 worker**（實測為空字串），
   所有請求都退回 `RemoteIpAddress`（127.0.0.1）而擠進同一個 bucket。
   也就是**本機測不出 IP 分區**。`GET /health` 的 `client` 區塊就是為了讓這件事一眼可見。
   **上 Azure 後必須用該端點重新確認**；若正式環境也收不到 XFF，這個限制就是全域共用的。
2. IP 速率限制初版設 5/分，與帳號鎖定門檻（連續失敗 5 次）同值，結果是
   **IP 限制先觸發、帳號鎖定永遠跑不到**，等於白寫。已把 IP 上限放寬到 30/分。
   原則：**行程內的 IP 限制只是減速帶，帳號安全一律靠 DB 端的鎖定**（跨實例才準確）。

### 2026-08-17 · `.wrangler/` 含 Cloudflare account_id

`.wrangler/cache/pages.json` 內有 `account_id`，已加入 `.gitignore`。這是先前把 mockup 部署到 Cloudflare Pages 預覽留下的。
