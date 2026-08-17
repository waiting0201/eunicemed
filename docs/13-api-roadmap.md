# 13 · API 實作路線圖與進度

> 上層導覽見 [CLAUDE.md](../CLAUDE.md)。端點規格見 [04-api.md](04-api.md)、路由契約見 [api-routes.md](api-routes.md)、本機環境見 [12-local-dev.md](12-local-dev.md)。
>
> 這份文件是 API 開發的**進度單一真相來源**。完成一個階段就把狀態改掉，並把該階段的實際發現寫進「踩到的坑」。

---

## 目前進度

| 階段 | 內容 | 狀態 |
|---|---|---|
| 0 | 骨架 + 文件同步 | ✅ 完成（2026-08-17） |
| 1 | 端到端切片：Collection | ✅ 完成（2026-08-17） |
| 2 | Auth / RBAC / AuditLog / CRUD 骨架 | ⬜ 未開始 |
| 3 | 媒體管線（SkiaSharp） | ⬜ 未開始 · **被待決事項擋住** |
| 4 | 分類 + 產品 | ⬜ 未開始 |
| 5 | 頁面區段 + JSON Schema registry | ⬜ 未開始 |
| 6 | 文章 / FAQ / 下載 / 據點 / 應用方案 | ⬜ 未開始 |
| 7 | 表單 / 設定 / 選單 / 轉址 / sitemap | ⬜ 未開始 |
| 8 | 部署（Bicep + GitHub Actions） | ⬜ 未開始 |

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

### ⬜ Phase 2 — Auth / RBAC / AuditLog / CRUD 骨架 · 3–4 天

`User` / `Role` / `UserRole` / `RefreshToken` / `AuditLog`。`AuthHandler`（login / refresh / logout，BCrypt，refresh 單次使用後撤銷）、`JwtService`（照 Jabez，`MapInboundClaims = false`）。
`AppRouter` 的守門方法：`IsPublicRoute` / `GetRequiredRole` / `RequireRole`，外加 EuniceMed 特有的一條 —— **Author 可建草稿但不可發布**。
`AuditLogInterceptor`（`SaveChangesInterceptor`，需要 `EntityEntry.OriginalValues`）。`/auth/login` 速率限制 + DB 登入失敗鎖定。

**驗收**：登入拿到 token；無 header 打受保護路由 → 401；Author token 打 `/publish` → 403；PUT 後 `AuditLog` 有 diff 列；帶舊 `rowVersion` 的 PUT → 409。

### ⬜ Phase 3 — 媒體管線 · 4–5 天 · ⚠️ 被待決事項擋住

`Media` / `MediaVariant` / `MediaUsage`。`Media/media-presets.json`（13 個 preset，已建立）+ `GET /admin/media-presets`。
`ImageService`（SkiaSharp）：依 preset 寬**等比只縮不放** → WebP q78 + 原格式 → 去 EXIF、轉 sRGB、檔名正規化加短雜湊 → 寫 Blob（master / variants / 原檔進 `media-originals`）。
硬拒絕 415/413/400 與非阻擋 `warnings[]` 兩套規則（[11](11-media-specs.md) §4）。SVG 清洗（僅 `logo-mark` 收 SVG）。

**開工前需先答**：變體階梯是「2 張」還是「一組寬度階梯」？見 [CLAUDE.md](../CLAUDE.md) §7。

### ⬜ Phase 4 — 分類 + 產品 · 6–8 天（最大一階）

`Category` / `SubCategory` / `Certification` / `BodyPart` / `Tag` 與其 translation、join 表；`Product` 全家族（8 張關聯表）。
公開端點含 **facets**、三段所有權驗證、`stats[].value == "auto"` 代入實際產品數、相關產品自動遞補。
`Data/Seed/LegacyProductImporter.cs` 匯入 `reference/legacy/products.json`（149 筆）。

> ⚠️ 該檔 17 個 key 中有 **6 個帶 `-1` 後綴**（`knee-support-1`、`back-support-1`、`wrist-support-1`、`stockings-for-venous-therapy-1`、`travel-stockings-1`、`diabetic-socks-1`），必須去除才對得上 [05](05-database.md) §4 的 `SubCategory.Slug`。

**驗收**：`/products/footcare-insoles/knee-support/knee-support-iu` → 404；`?category=X&facets=true` 時 categories facet 仍顯示全部三類、subCategories facet 被收斂；匯入跑兩次仍是 149 筆。

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

### 2026-08-17 · `.wrangler/` 含 Cloudflare account_id

`.wrangler/cache/pages.json` 內有 `account_id`，已加入 `.gitignore`。這是先前把 mockup 部署到 Cloudflare Pages 預覽留下的。
