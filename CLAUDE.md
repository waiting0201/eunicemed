# CLAUDE.md — EuniceMed 官網重建專案

> 本檔為專案的「檢索入口」與「開發規範」。任何 AI 代理或開發者進入本專案時，**先讀本檔**，再依需求跳轉到 `docs/` 內對應文件。

---

## 1. 專案是什麼

重建 **EuniceMed** 醫療器材品牌官方網站 <https://www.eunicemed.com/>。

- **品牌方／母公司**：康得適 Comfort Plus Corporation
  - 地址：24158 新北市三重區興德路 123-9 號 11 樓
  - 電話：+886 2 8511 3758　信箱：service@comfortplus-medical.com
  - 營業時間：週一至週五 09:00–18:00（UTC+8）
- **品牌主張**：*Not Just a Motion — enhancing your quality of life*
- **網站性質**：企業形象 + 產品型錄 + 內容行銷（非電商，無線上金流；以諮詢／經銷導流為主）
- **語系**：多語系，英文（`en`）為主、繁體中文（`zh-TW`）次之，架構保留擴充其他語系空間

### 產品分類（Category → SubCategory）
| 分類 | 說明 | 子分類 |
|------|------|--------|
| Medical Compression Stockings 醫療彈性襪 | 改善循環、緩解並延緩靜脈曲張 | Venous / Edema / Antiembolism / Everyday / Travel / Diabetic（6） |
| Orthopedic Support 矯型護具 | 膝/踝/肘/腕/背的穩定、對位與保護 | Knee / Back / Ankle / Wrist / Elbow / Shoulder / Neck（7） |
| Footcare & Insoles 足部護理與鞋墊 | 醫療級矽膠，處理足跟痛、足底筋膜炎、骨刺等 | Silicone / Gel / Moisturizing / High Heel Sandals（4） |

> 子分類（17 筆）**有獨立 URL 作 SEO 落地頁**，產品 URL 為四段 `/products/{category}/{sub}/{slug}`。
> 完整 slug 對照見 [docs/10-legacy-content.md](docs/10-legacy-content.md) §5.4。

### 產品系列（Collection，依支撐強度）
- **Care**：日常輕度緩解（專色 Pantone 7746c）
- **Protect**：高強度活動的強力支撐（專色 Pantone 5415c）
- **Advance**：復健導向的針對性保護（專色 Pantone 5125c）

> ⚠️ **`reference/` 與 `mockup4/` 不在版控裡**（本 repo 為公開，那些是客戶與代理商的素材，
> 且含授權待確認的商業字型）。clone 之後需另外索取，見 [docs/14-assets.md](docs/14-assets.md)。
> 底下所有對這兩個目錄的引用，都是指**本機工作目錄**裡的檔案。

### 主要頁面（依 Weypro/subkarma 網站架構提案 260626 V01，見 `reference/sbk/`）
`Home` · `About 關於我們`（品牌故事/里程碑/製造品質/認證）· `Products 產品` · `Applications 應用方案`（依部位/特殊照護）· `Partnership 合作夥伴`（OEM/ODM/經銷）· `Resources 資源中心`（FAQ/Insights/Downloads/News）· `Where to Buy 銷售據點` · `Contact`（浮動按鈕＋footer）· `Privacy & Legal`

> 舊站導覽（News/Find Your Product/Behind the Motion/Download）已被上述新 IA 取代；完整結構與轉址見 [docs/06-sitemap.md](docs/06-sitemap.md)。

### 品牌識別（摘要，完整見 [docs/08-design.md](docs/08-design.md)）
- **品牌色**（數位）：青 `#00B5CD`（Pantone 7466c）、灰 `#898989`（Pantone 423c）
- **字型**：英文 Myriad Variable Concept（variable font 已入庫 `reference/fonts/myriad-variable-concept/`）、中文微軟正黑體（web 以 Noto Sans TC 替代）
- **設計來源檔**：`reference/sbk/`（logo 規範 PDF、Weypro 網站架構 PDF、素材總表 .ai）

---

## 2. 技術選型（已定案）

| 層 | 技術 | 說明 |
|----|------|------|
| 前端 Frontend | **Next.js 15 (React, App Router)**，**純 SSR** | 部署於 Azure Static Web Apps **Free**（hybrid，preview，`output: 'standalone'`）、語系前綴 i18n、SEO/sitemap |
| API | **Azure Functions（.NET 10 isolated, C#, HTTP trigger）** | 無伺服器 RESTful API |
| CMS | **自建後台**（React Admin SPA，**掛在同一個 SWA 的 `/admin`**） | 產品/應用方案/文章(News·Insights)/FAQ/下載/據點/頁面內容維護 |
| 資料庫 DB | **Azure SQL Database（SQL Server）**，**由客戶提供** | 透過 EF Core（.NET 10）存取 |
| 媒體儲存 | **Azure Blob Storage**（匿名讀取容器，**無 CDN**） | 圖片、PDF；兼作 Function App 部署包儲存 |
| 部署 Hosting | **Azure，6 個資源**：SWA Free（Next.js SSR hybrid + `/admin`）＋ Function App（**Flex Consumption**，獨立非 SWA linked）＋ Blob Storage ＋ Azure SQL（客戶提供）＋ **Log Analytics workspace + Application Insights** | 見部署文件 |

> 架構原則：**Headless**。前端與 CMS 後台都只透過 Functions API 取用資料；資料庫不直接對外。
>
> **部署方案硬性邊界（已定案）**：全站只有上述資源、只有**一套 prod 環境**。
> **不使用** Front Door／CDN、Key Vault、Communication Services、Container Registry、Entra ID、APIM、Defender for Storage。
>
> ⚠️ **Application Insights 原本也在排除清單上，2026-08-19 因實測推翻**：
> 沒有 `APPLICATIONINSIGHTS_CONNECTION_STRING` 的 Flex Consumption app 起不來
> （host 回 500，且因為記錄管線就是它，連錯誤訊息都拿不到）。
> 同訂用帳戶四個正常運作的 Flex app 全都設了這一項。見 [docs/13](docs/13-api-roadmap.md) 踩坑。
> 這帶來數個必須在開發時就遵守的限制（SWA Free 100GB/月頻寬與 250MB 產物上限、無 WAF/IP 限制、無分散式追蹤、無雲端 staging）——**動手寫任何前端圖片邏輯、部署設定或安全機制前，先讀 [docs/07-azure-deployment.md](docs/07-azure-deployment.md) §7～§12**。

---

## 3. 文件索引（docs/）

| 文件 | 內容 | 何時讀 |
|------|------|--------|
| [STATUS.md](STATUS.md) | **專案進度總表（單一真相來源）**：每個模組／端點／頁面的完成狀態、當下擋住的事項 | **每次進專案先看這份**、回報進度時 |
| [docs/01-architecture.md](docs/01-architecture.md) | 系統架構總覽、元件關係、資料流、環境分層 | 想了解全貌、做跨層決策時 |
| [docs/02-frontend.md](docs/02-frontend.md) | Next.js 前端：路由、i18n、資料抓取、元件、效能 | 開發前端頁面/元件時 |
| [docs/03-cms.md](docs/03-cms.md) | 自建 CMS：後台功能、角色權限、內容工作流、媒體管理 | 開發後台/內容模型時 |
| [docs/04-api.md](docs/04-api.md) | Azure Functions API：專案結構、端點規格、驗證、`ApiResponse` 格式、分頁 | 串接或新增 API 時 |
| [docs/api-routes.md](docs/api-routes.md) | **路由總表（API 契約）**。本案不產 OpenAPI，此表與 `Api/Routing/AppRouter.cs` 必須逐條一致 | 新增/修改任何端點時 |
| [docs/05-database.md](docs/05-database.md) | SQL Server schema、資料表、關聯、索引、遷移策略 | 改資料模型/寫查詢時 |
| [docs/06-sitemap.md](docs/06-sitemap.md) | 網站地圖（IA）、URL 結構、sitemap.xml、SEO、結構化資料 | 規劃頁面/URL/SEO 時 |
| [docs/07-azure-deployment.md](docs/07-azure-deployment.md) | Azure 資源清單、CI/CD、環境變數、監控、成本 | 部署/維運時 |
| [docs/08-design.md](docs/08-design.md) | 品牌定位、色彩系統、logo 使用、字型、視覺風格（清秀原則） | 開發 UI/設計 token/選字型配色時 |
| [docs/09-page-blocks.md](docs/09-page-blocks.md) | **逐頁區段規格（依 mockup4 的 18 頁）**、每頁具名欄位、人體圖互動規格、JSON Schema registry | 切版/開發任一頁面時、規劃後台欄位時 |
| [docs/10-legacy-content.md](docs/10-legacy-content.md) | 舊站內容盤點、slug 對照、轉址來源 | 內容遷移、對照舊站時 |
| [docs/11-media-specs.md](docs/11-media-specs.md) | **圖片尺寸 preset 總表（唯一真相來源）**、上傳提示規則、伺服器縮圖規格、欄位↔preset 對照 | 新增任何上傳欄位、處理圖片／縮圖、交付素材時 |
| [docs/12-local-dev.md](docs/12-local-dev.md) | **本機環境設定與每日啟動指令**、migration 操作、常見問題、多語系參數型別檢查 | **第一次進專案時先讀這份**、環境跑不起來時 |
| [docs/13-api-roadmap.md](docs/13-api-roadmap.md) | API 各階段的**內容與驗收方式**、架構前提、**累積的踩坑紀錄** | 接續開發時、遇到怪問題時先翻踩坑那節 |
| [docs/14-assets.md](docs/14-assets.md) | **不進版控的素材**（`reference/`、`mockup4/`）：內容、用途、取得方式 | 新機器 clone 之後發現找不到設計稿或字型時 |
| [docs/15-cms-scope.md](docs/15-cms-scope.md) | **後台可編輯範圍決議**：哪些內容進 CMS、哪些回程式碼，逐支 schema 的裁決與理由；§7 是「一個單元在它露出的地方維護」的側欄收斂，§8 是拿掉稽核紀錄 | **新增或移除任何 `PageSchemas/*.json` 之前**、**在側欄加一個模組之前**、覺得某段文案「怎麼不能在後台改」時 |

---

## 4. 倉庫結構

> **目前進度見 [STATUS.md](STATUS.md)。** 下列目錄全數已建立並已部署至 Azure。
> 各階段做法與踩坑見 [docs/13-api-roadmap.md](docs/13-api-roadmap.md)；本機怎麼跑見 [docs/12-local-dev.md](docs/12-local-dev.md)。

```
EuniceMed/
├── CLAUDE.md                  # 本檔
├── EuniceMed.sln
├── global.json                # SDK 10.0.100, rollForward latestFeature
├── docs/                      # 規格與規範文件
├── Api/                       # Azure Functions（.NET 10 isolated）— **單一專案**
│   ├── Functions/             # RouterFunction.cs：唯一 HTTP entry point
│   ├── Routing/               # AppRouter.cs：list-pattern 分派全部路由 + 權限表
│   ├── Handlers/              # 一個模組一支
│   ├── Services/Dapper/       # 讀取服務（公開端點）
│   ├── Data/                  # AppDbContext、Configurations、Migrations、Seed
│   ├── Models/{Entities,Dtos}/
│   ├── Common/                # ApiResponse、PagedResult、AppException、LocaleQuery
│   ├── PageSchemas/           # {pageKey}.{sectionKey}.json（19 支 / 6 個 pageKey，見 docs/15）
│   └── http/                  # 各階段 .http 驗收檔
├── apps/
│   ├── web/                   # Next.js 前端（公開網站）— 唯一部署到 SWA 的 app
│   └── admin/                 # 自建 CMS 後台（React Admin SPA）— build 後併入 web 的 /admin
├── infra/                     # Bicep 基礎設施即程式碼（IaC）
└── .github/workflows/         # CI/CD pipeline
```

> 前端用 pnpm workspace；後端是**單一 .NET 專案**，結構與 [Jabez/Api](/Users/tim/webapps/Jabez/Api) 完全對齊。
> **不採用**多專案分層（Core/Data/Tests 拆分）、**不採用** Repository Pattern —— 見 [docs/04-api.md](docs/04-api.md) §8。

---

## 5. 開發規範（Conventions）

### 5.1 通用
- **語言**：程式碼註解與 commit 用英文；面向團隊的文件可用繁中。
- **預設語系/SEO**：所有頁面皆須有 `<title>`、`meta description`、`canonical`、`hreflang`（en/zh-TW）。任何新頁面都要同步更新 sitemap，見 [docs/06-sitemap.md](docs/06-sitemap.md)。
- **Secrets**：一律放 **Function App / SWA 的 App Settings** 與 **GitHub Actions Secrets**（本案無 Key Vault），**禁止**寫入程式碼或 commit。連線字串、API 金鑰皆然；能改用 **Managed Identity** 的（SQL、Blob）就不要存密碼。
- **多語系**：所有面向使用者的內容欄位都要有對應語系版本（DB 採 translation 表，見 DB 文件）。**語言純度**：英文版頁面不得出現中文、中文版不得出現英文（品牌符號如 logo/AerGo/slogan/CARE·PROTECT·ADVANCE/ISO·CE/型號除外），未翻譯內容在該語系隱藏而非露出他語，詳見 [docs/08-design.md](docs/08-design.md) §5.2。

### 5.2 前端（Next.js）
- App Router + Server Components 優先；client component 僅在需要互動時使用。
- 渲染採 **純 SSR**（部署於 Azure Static Web Apps **Free** 方案的 Next.js hybrid，preview）；**不使用 ISR**。表單等互動走 client component。
- Next.js 須設 **`output: 'standalone'`**（SWA Free 有 250MB 應用大小上限）。
- 路由**一律帶語系前綴**：`/[locale]/...`（如 `/en/products`、`/zh-TW/products`）；根路徑 `/` 重導至預設語系。
- 圖片一律用 `next/image`；外部媒體網域（Blob/CDN）需列入 `next.config` 白名單。
- **公開站的版型樣式一律以 `css`…`` 樣板逐字照抄 `mockup4/`**（見 `apps/web/lib/css.ts`）。
  mockup4 沒有 stylesheet，18 頁共 1,837 個 inline `style`、全站只有 5 個 class ——
  所謂「照著切」就是把那些字串原封搬進 `style={{…}}`，讓 review 能逐字比對。
  用 `pnpm --filter web mockup:check` 驗證（目前 18 頁全數 100%、零自創宣告）。
  刻意的偏離一律寫進 `tools/mockup-diff/allow.json` 並附理由。
- Tailwind 保留給 inline style 表達不了的東西：hover／pseudo-class、`@keyframes`、
  以及套用在 API 產生的 HTML 上的排版（`globals.css` 的 `.m4-*`）。
- **響應式**：mockup4 沒有任何斷點，所以手機／平板這一層是**現場設計**的，
  規則集中在 `globals.css` 最後一段（全站唯一允許 `!important` 的地方 —— class 打不過 inline）。
  作法與 `data-r` 標記的意思見 [docs/rwd-backlog.md](docs/rwd-backlog.md)；
  用 `tools/mockup-diff/viewport-check.mjs` 量測有無橫向溢出。
- **版面文案不進 CMS**：區段標題、按鈕文字、`All news →` 這類標籤與 mockup4 綁死，
  一律寫成該頁的 `COPY: Record<Locale, …>` 常數（英文逐字取自 mockup4）。
  CMS 只管會換的東西 —— 圖片、引用清單、檔期文案。判準與逐支裁決見 [docs/15-cms-scope.md](docs/15-cms-scope.md)。
  **連結一律在渲染時就地組 `/${locale}/…`**，不存進 CMS 也不存進常數表。
- 元件庫集中於 `apps/web/components`。

### 5.2a 後台 UI（CMS `/admin`）
- **一個單元的內容，在它露出的地方維護** —— 不要為了對齊資料表而多開一個側欄項。
  認證在「關於我們」裡改、分類與系列在「產品」的分頁上、圖片在用到它的那個欄位上傳。
  判準與逐項裁決見 [docs/15-cms-scope.md](docs/15-cms-scope.md) §7。
- **每個上傳欄位下方一律顯示建議尺寸與比例**，文字由 `GET /admin/media-presets` 帶出，
  不在畫面寫死（見 [docs/11](docs/11-media-specs.md) §1.1）。
- **樣式一律 Tailwind CSS**，與公開站共用同一份設定與品牌 token。UI 元件用 **shadcn/ui**（Tailwind 基底）。**不使用 Ant Design 或任何自帶設計系統的元件庫** —— 理由見 [docs/03-cms.md](docs/03-cms.md) §8。
- ⚠️ **任何後台介面工作（新畫面、改版面、調元件）開始前，必須先啟動 `frontend-design` skill。**
  公開站有 `mockup4/` 可照著切，**後台沒有任何設計稿**，是要現場設計的。不得憑感覺直接寫 Tailwind class。
  設計約束（資料密度、狀態可辨識性、中英並存、打包體積）見 [docs/03-cms.md](docs/03-cms.md) §8.1。
- `/admin` 的打包體積計入 SWA Free 的 **250MB** 上限（與公開站同一個 app），重量級套件一律 code-split 且不得進入公開頁 bundle。

### 5.3 API（Azure Functions, C#）
- **寫程式前先讀 [Jabez/Api](/Users/tim/webapps/Jabez/Api) 的同類型檔案當範本**，不要憑空想像架構。本專案的骨架刻意與它同源。
- RESTful、複數名詞、kebab/lower：`GET /api/products`。**URL 不帶版本段** —— 早期文件寫過 `v1`，實作沒有（見 [docs/api-routes.md](docs/api-routes.md)）。
- 公開讀取端點匿名可用；**所有寫入/後台端點需 JWT 驗證 + 角色授權**，且授權一律在 `AppRouter` 執行，**Handler 內禁止重複檢查角色**。
- 統一回應信封 `ApiResponse{success,data,message,errors,timestamp}`（**不是** ProblemDetails），統一分頁 `PagedResult`。
- **讀取走 Dapper read service、寫入走 EF Core**；Function 內**不拼接 SQL 字串**（防注入）。禁止 Repository Pattern。
- Dapper 查詢的 `Locale` 等 `varchar` 欄位必須以 `DbType.AnsiString` 傳送，否則索引失效。
- DB 遷移**在 Function App 啟動時自動套用**，CI 不碰資料庫。
- 詳見 [docs/04-api.md](docs/04-api.md)。

### 5.4 資料庫（SQL Server）
- 表名 PascalCase 單數（`Product`）；多對多用關聯表（`ProductTag`）。
- 主鍵 `Id`（`uniqueidentifier`/`bigint`，見 DB 文件決議）；皆含 `CreatedAt`/`UpdatedAt`。
- Schema 變更一律走 **EF Core Migration**，禁止手改正式庫；遷移檔需 code review。
- 遷移於 **Function App 啟動時自動套用**。因為 Flex Consumption 的 app init 有 30 秒硬上限且無 slot 可退，**破壞性變更一律拆成「擴張 → 遷移 → 收縮」三支 PR**，大型資料回填不得寫進 migration。
- 對外查詢欄位（slug、category、locale）建索引。詳見 [docs/05-database.md](docs/05-database.md)。

### 5.5 Git / CI
- 分支：`main`（正式）、`develop`（整合）、`feature/*`、`fix/*`。
- Commit 格式：Conventional Commits（`feat:`、`fix:`、`docs:`、`chore:`…）。
- PR 必過：build、lint、測試；資料庫遷移與 API 破壞性變更需在 PR 描述標註。

---

## 6. 環境分層

**雲端只有一套 prod 資源。**

| 環境 | 用途 | 位置 |
|------|------|------|
| 本機 | 開發 | `next dev` + `func start`；DB 用本機 container 或客戶 dev DB |
| PR 預覽 | 驗收 | SWA preview environment（Free 上限 3 個，且**所有環境合計 ≤ 500MB**） |
| `prod` | 正式 | www.eunicemed.com |

沒有雲端 dev/staging 環境 → **DB 遷移直接對 prod 套用**，須以 idempotent script + 人工核准 + 事前備份把關。詳見 [docs/07-azure-deployment.md](docs/07-azure-deployment.md)。

---

## 7. 尚待確認（Open Questions）

### 🔴 擋住開發，需優先解決

- [ ] **SMTP 主機／埠／帳密，以及該信箱的每日寄送量上限** —— 上限會回頭決定速率限制的數字。
      ⚠️ 2026-08-28 起**不再擋上線**：收件匣照常收件，只是不寄通知信（見 docs/15 §6）
- [ ] **客戶 Azure SQL 的連線數上限？** 決定 `Max Pool Size` 與 Function App 的 `maximumInstanceCount` —— Flex Consumption 每個實例各有一個連線池
- [ ] 客戶提供的 Azure SQL：是否可設 Entra 管理員以啟用 Managed Identity 連線？備份保留天數與還原程序為何？

### 🟡 規格缺漏，建議一支 migration 一起補

- [ ] `[User]` 沒有 `FailedLoginCount` / `LockedUntil`，但 [03](docs/03-cms.md) §7 與 [07](docs/07-azure-deployment.md) §7.4 都要求登入失敗鎖定
- [ ] `RefreshToken` 在 `UserId` / `TokenHash` 上沒有索引，而 refresh 是熱路徑
- [ ] `MediaUsage` 的 592 bytes 寬叢集主鍵建議改為 `Id BIGINT IDENTITY` + 該 tuple 作非叢集唯一索引

### 🟢 行為未定義，需拍板

- [ ] **巢狀翻譯的純度**：產品有 `en` 翻譯但它的分類沒有時，該隱藏產品，還是回傳 `category: null`？
      建議後者 —— 因分類漏翻而整個產品消失，是不會有人發現的靜默內容錯誤
- [ ] `ProductRelated` 空陣列在 [04](docs/04-api.md) §6 定義為「回到自動計算」，因此編輯者**無法**表達「這裡不要顯示相關產品」。若需要，`Product` 得加 `RelatedMode`（auto / manual / none）
- [ ] **產品詳情的 `certifications` 目前回全站 5 筆，不看 `ProductCertification`**（2026-08-18 發現）。
      後台已可逐產品掛認證，但公開端點忽略它 —— 編輯者掛了會是靜默的無效操作。
      改成逐產品的話，在內容建好之前所有產品頁的標章列會變成空的（目前 `ProductCertification` 0 筆），
      所以先維持現狀等拍板：標章列是「品牌共用」還是「逐產品」？
- [ ] **favicon 與後台收合側欄用的「單獨加號標記」規範未定義**（2026-08-27 起用）。
      形狀取自 `.ai` 原稿的加號，但單獨使用是本專案的延伸；完整 logo 在 16–32px 讀不出來。
      客戶若有正式 icon 版本，換掉 `apps/web/app/favicon.ico`、`apps/web/public/brand/eunicemed-mark.png`
      與 `apps/admin/src/assets/eunicemed-mark.png` 三處。見 [docs/08](docs/08-design.md) §3
- [ ] **同一個檔案上傳兩次會產生兩筆 `Media`，但它們共用同一個 blob，刪任一筆都會把另一筆的圖砍掉**（2026-08-30 實際踩到）。
      檔名帶的是內容雜湊，所以第二次上傳寫回同一組 blob；`POST /admin/media` 不去重，於是多一列。
      `DELETE /admin/media/{id}` 的 409 只檢查**被刪的那一列**有沒有引用，
      通過之後就把 blob 刪掉 —— 另一列（即使正被頁面引用）當場變成 404 的死連結，畫面上只看到破圖。
      兩個修法擇一：上傳時以檔名去重、直接回既有那一筆；或刪除時確認沒有別列共用該檔名才刪 blob。
      前者順便讓媒體庫不會長出一堆同圖不同列。
      ⚠️ `POST /admin/media/{id}/reprocess`（[docs/api-routes.md](docs/api-routes.md) 有列）**尚未實作**，
      所以踩到之後沒有「重新產生 blob」這條退路，只能刪掉整筆重傳。
- [ ] reCAPTCHA 用哪個版本（v2 checkbox / v2 invisible / v3 score）？v3 需決定分數門檻。另 [07](docs/07-azure-deployment.md) §6.4 只有後端 `Recaptcha__SecretKey`，缺前端 site key
- [ ] `mockup/`、`mockup2/`、`mockup3/`（共約 120MB 的早期版型）要不要納入版控？目前以 `.gitignore` 擋著 —— 圖片進了 git 歷史就拿不掉了

### 🔵 內容與範圍，不擋當前階段

- [ ] 語系是否一開始就上 zh-TW，或先 en 後補？（架構已支援，內容上線時程待定）
- [ ] 是否需要站內搜尋（Azure AI Search）？（V1 暫不納入，列為 V2）
- [ ] 既有網站內容/圖片是否需要資料遷移？遷移來源格式為何？
- [ ] 浮動按鈕的 **AI Agent** 範圍？（Weypro 提案有標示；V1 先做 Contact 浮動鈕、預留擴充位）
- [ ] Where to Buy 銷售據點的資料來源與涵蓋範圍（國家/經銷商清單）？國際經銷的 Region 標籤先採自由字串（目前 3 筆）
- [ ] 首頁客戶見證（Testimonial）影片自架 Blob mp4 或 YouTube/Vimeo 嵌入？影響 `video.source` 欄位型別
- [ ] 分類／子分類頁的 3 組統計數字自動計算或手填？（暫採手填，`value` 可填 `auto` 由 API 代入產品數）
- [ ] News 與 Insights 是否視 `sponsorship` 為同一分類？（暫以 `ArticleCategory.Kind` 分流、slug 各自獨立，避免 count 混算）
- [ ] Downloads 同一份文件是否會有多語版並列？若會需加 `DownloadGroupId`（mockup4 目前每列只顯示一個語言）
- [ ] 子分類落地頁的敘述文案由誰撰寫？產品數少的子分類（travel-stockings、diabetic-socks）需補足內容否則不發布

### 已封閉

- [x] CMS 後台管理者驗證：**自建 JWT + Identity**（方案內無 Entra ID 資源）
- [x] **客戶 Azure SQL 的 collation**：已確認為 `_CI_`（2026-08-19 上線時實測），slug 比對與本機一致
- [x] API 專案結構、回應格式、Migration 時機、影像套件：**全數對齊 [Jabez/Api](/Users/tim/webapps/Jabez/Api)**，見 [docs/13-api-roadmap.md](docs/13-api-roadmap.md)「架構前提」
- [x] **媒體變體階梯：採階梯**（2026-08-17）。WebP 出完整階梯、原格式只出 preset 寬度那一張，每次上傳 1–5 個檔。
      階梯定義見 [docs/11-media-specs.md](docs/11-media-specs.md) §2a，機器可讀版在 `Api/Media/media-presets.json` 的 `output` 欄位。
      **連帶決定：Function App 實例需 2048MB**（512MB 會在解碼大圖時 OOM），見 [docs/07](docs/07-azure-deployment.md) §10。
- [x] 表單送出後寄信通知 + 寫 DB：**兩者都要**。寄信走品牌方既有信箱的 SMTP（無 Azure Communication Services）；先入庫再寄信，寄信失敗不回錯。
      2026-08-28 起 **SMTP 未設定時跳過寄信但照樣入庫**，所以三支表單不再等帳密 —— 帳密到手只要設 `Smtp__Host`。
- [x] ~~客戶 SQL 防火牆是否允許 CI 動態增刪 runner IP 規則？~~ **此題已不存在** —— migration 改為在 Function App 啟動時套用，CI 完全不碰資料庫
- [x] 英文字型 **Myriad Variable Concept**：品牌方已提供下載點，字型檔入庫 `reference/fonts/myriad-variable-concept/`（來源與授權注意見 docs/08-design.md §4）
- [x] 網站風格：**客戶已定案採 `mockup4/`**（Clinical Airy 淺色版，18 頁）。後台內容模型已依此重新規劃，見 docs/03、05、09。設計準則見 docs/08-design.md §5.1／§5.1a（該文件內對 `mockup/` 的引用尚未更新，另案處理）
