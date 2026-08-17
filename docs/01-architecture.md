# 01 · 系統架構總覽

> 上層導覽見 [CLAUDE.md](../CLAUDE.md)。本文描述整體架構、元件職責、資料流與環境設計。

---

## 1. 架構風格

採 **Headless / JAMstack** 架構：

- 內容由**自建 CMS**維護 → 寫入 **Azure SQL**
- **Azure Functions API** 是唯一的資料出入口（前端與後台都只打 API）
- **Next.js** 公開網站採 **純 SSR**（部署於 Azure Static Web Apps **Free** 的 Next.js hybrid，preview），兼顧 SEO 與內容即時性；**不使用 ISR**
- 媒體（圖片/PDF）存 **Blob Storage**，**由瀏覽器直接讀取**（匿名讀取容器，無 CDN）

好處：前後端解耦、可獨立擴展、靜態頁快取友善、資料庫不直接曝險。

---

## 2. 元件圖

```
   訪客 (Browser) ────────────────┬──────────────────────────┐
                                  │ HTML/SSR                 │ 圖片/PDF
                                  ▼                          │
       ┌──────────────────────────────────────────┐          │
       │ Static Web Apps (Free) — 單一 app         │          │
       │  ├─ Next.js Web  SSR (no ISR)            │          │
       │  └─ /admin  自建 CMS（React SPA, client） │          │
       └───────┬──────────────────────┬───────────┘          │
               │ SSR fetch            │ 瀏覽器 XHR (CORS)     │
               ▼                      ▼                      │
       ┌──────────────────────────────────────────┐          │
       │ Azure Functions API (.NET 10, Flex)      │          │
       │  /api/v1/*                               │          │
       └───────┬──────────────────────┬───────────┘          │
               │ EF Core (MI)         │ 上傳 (MI)            │
               ▼                      ▼                      │
     ┌────────────────────┐   ┌──────────────────┐           │
     │ Azure SQL Database │   │ Blob Storage      │◄──────────┘
     │ （客戶提供）        │   │ media / 部署包     │  匿名讀取
     └────────────────────┘   └──────────────────┘
```

- 公開網站（Next.js）：每次請求於伺服器端（SWA managed backend）呼叫 API 取內容並渲染（純 SSR，無 ISR）。
- CMS Admin：**與前台同一個 SWA**，以 `/admin` 路由的 client-side React 區塊提供；登入後由瀏覽器呼叫 API 受保護端點。
- API（Functions）：唯一商業邏輯與資料存取層，分「公開讀取」與「後台讀寫」兩類端點。
- 媒體位元組不經過 SWA，由瀏覽器直接向 Blob 取用（保護 SWA Free 的 100GB/月頻寬）。

---

## 3. 元件職責

| 元件 | 職責 | 不負責 |
|------|------|--------|
| Next.js Web | 呈現公開頁、SEO、i18n、表單 UI、sitemap.xml、安全標頭 | 直接連 DB、商業邏輯 |
| CMS Admin（`/admin`） | 內容編輯介面、媒體上傳、預覽、發布 | 直接連 DB（一律走 API） |
| Functions API | 驗證授權、商業邏輯、資料存取、檔案上傳簽章、寄信、速率限制 | 畫面呈現 |
| Azure SQL | 結構化資料持久化 | 檔案二進位 |
| Blob Storage | 媒體儲存與對外供應、Functions 部署包 | 結構化查詢 |

---

## 4. 主要資料流

### 4.1 訪客瀏覽產品頁
1. 訪客請求 `/en/products/orthopedic-support/knee-support/knee-support-iu`。
2. 請求進入 SWA 的 managed backend。
3. SWA 上的 Next.js 以 SSR 並行呼叫 `GET /api/v1/products/{category}/{sub}/{slug}`（實體內容）與 `GET /api/v1/pages/product-detail`（共用文案）渲染頁面回傳（無 ISR、無邊緣快取；尖峰仰賴 DB 索引與 API 端快取）。
4. 頁面內圖片指向 **Blob 上已依尺寸 preset 產生的變體**（見 [11-media-specs.md](11-media-specs.md)），由瀏覽器直接取用，不經 SWA 圖片優化端點。

### 4.2 編輯發布內容
1. 編輯於 CMS 登入（取得 JWT）。
2. 編輯產品 → `PUT /api/v1/admin/products/{id}`；上傳圖 → `POST /api/v1/admin/media`（multipart 代傳，帶 `presetKey`；API 端 **SkiaSharp 依 preset 寬縮圖**後寫 Blob。PDF 則走 `POST /admin/uploads/sas` 直傳）。
3. 內容存入 Azure SQL，狀態 `Draft → Published`。
4. 發布僅更新 DB 狀態為 `Published`；因前端為**純 SSR**，下一次請求即反映最新內容，**無需 revalidation webhook**。

### 4.3 聯絡表單
1. 訪客送 `POST /api/v1/contact`。
2. API 驗證（含 reCAPTCHA/honeypot/速率限制）、寫入 `ContactSubmission`、再以**品牌方既有信箱的 SMTP** 寄信通知 service 信箱。寄信失敗只記 log，不讓端點回錯（避免訪客重複送出）。
3. 回傳成功；後台可於 CMS 檢視表單清單。

---

## 5. 技術堆疊摘要

| 範疇 | 選用 |
|------|------|
| 前端框架 | Next.js 15（SSR，部署於 Azure Static Web Apps **Free**）、React 19、TypeScript、Tailwind CSS |
| 後台框架 | React 19 client-side SPA，**掛在同一個 Next.js app 的 `/admin`**；**Tailwind CSS + shadcn/ui**（不用自帶設計系統的元件庫）。介面設計流程見 [03-cms.md](03-cms.md) §8.1 |
| API | Azure Functions v4、.NET 10 isolated、C#、**Flex Consumption（Linux）**；單一 `Api` 專案 + catch-all Router（見 [04-api.md](04-api.md) §8） |
| 資料存取 | **Dapper 讀 / EF Core 寫**（照 Jabez 慣例，不採 Repository Pattern）；EF 亦負責 Migration |
| 驗證 | JWT（後台）；公開讀取匿名 |
| DB | Azure SQL Database（SQL Server）—— **由客戶提供** |
| 媒體 | Azure Blob Storage（匿名讀取容器，**無 CDN**）；上傳縮圖以 **SkiaSharp**（MIT）於 Function 內處理 —— 不用 ImageSharp，其 Six Labors Split License 對年營收 > USD 1M 者需購商用授權 |
| 信件 | **既有信箱 SMTP**（MailKit） |
| 監控 | Azure Monitor 平台指標 + Function App log stream（**無 Application Insights**） |
| 機密 | App Settings + Managed Identity（**無 Key Vault**） |
| IaC | Bicep |
| CI/CD | GitHub Actions |

> 完整資源清單與 Free 方案硬限制見 [07-azure-deployment.md](07-azure-deployment.md)。全站只用 4 個 Azure 資源。

---

## 6. 環境分層

**雲端只有一套 prod 資源。**

| 用途 | 前端 | API | DB |
|------|------|-----|-----|
| 本機開發 | `next dev` | `func start` | 本機 SQL container 或客戶 dev DB |
| PR 預覽 | SWA preview environment（Free 上限 3、合計 500MB） | 共用 prod Function App | 共用 prod DB |
| prod | SWA(prod) | FuncApp(prod) | SQL（客戶提供） |

- 沒有雲端 dev/staging；**DB 遷移在 Function App 啟動時自動套用**（見 [05-database.md](05-database.md) §5），CI 不碰資料庫。
- 設定以 App Settings 區隔；詳見 [07-azure-deployment.md](07-azure-deployment.md)。

---

## 7. 非功能性需求（NFR）

| 項目 | 目標 |
|------|------|
| 效能 | 首頁 LCP < 2.5s（4G）、Lighthouse ≥ 90 |
| 可用性 | 盡力而為 —— **SWA Free 無 SLA**，且無 CDN／多區域備援；此為明示取捨 |
| SEO | 全頁 SSR、結構化資料、hreflang、sitemap |
| 無障礙 | WCAG 2.1 AA |
| 安全 | HTTPS-only、CSP、輸入驗證、JWT、最小權限、Managed Identity；**無 WAF**，防護在應用層（reCAPTCHA + 速率限制） |
| 隱私/法遵 | 表單同意條款、Cookie 告知；醫療宣稱用詞需法務審閱 |
| 擴展 | 多語系可加；產品/內容量級成長不需改架構 |

---

## 8. 風險與決策（ADR 摘要）

| 主題 | 決策 | 理由 |
|------|------|------|
| Headless vs 傳統 CMS | Headless（自建 + Functions） | 前後端解耦、SEO/效能、彈性 |
| 前端渲染 | 純 SSR（SWA Free hybrid，無 ISR） | SEO 友善且內容即時；SWA Free 已支援 Next.js hybrid（preview） |
| 後台驗證 | 自建 JWT | 自建 CMS、使用者少；無 Entra ID 資源 |
| 後台託管 | 併入同一個 SWA 的 `/admin` | 方案限定「一個 SWA」；同網域免 CORS、省一組資源 |
| API 專案結構 | 單一 `Api` 專案 + `AppRouter` 分派 | 對齊 [Jabez/Api](/Users/tim/webapps/Jabez/Api) 既有慣例；同一位開發者跨專案一致性優先 |
| 回應格式 | `ApiResponse` 信封（非 ProblemDetails） | 同上，與 Jabez 一致 |
| DB 遷移時機 | Function App 啟動時自動套用 | 繞開客戶 SQL 防火牆的未知數；Jabez 已用 119 支 migration 驗證 |
| 影像處理 | SkiaSharp（非 ImageSharp） | MIT，無年營收條款；native 僅約 12MB，對冷啟動友善 |
| 主鍵型別 | 見 DB 文件 | 兼顧索引效能與分散式產生 |
| 媒體儲存 | Blob（匿名讀取，無 CDN） | 與結構化資料分離、成本低；長 `Cache-Control` 取代邊緣快取 |
| 雲端環境數 | 只有 prod | 成本與資源數量限制；預覽靠 SWA preview environment |

> 後續正式 ADR 文件可於 `docs/adr/` 逐案補齊。
