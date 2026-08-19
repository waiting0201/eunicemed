# 專案進度總表

> **這份文件是「做到哪裡了」的單一真相來源。** 每完成一項就更新對應那格。
>
> 分工：本檔記錄**狀態**；[docs/13-api-roadmap.md](docs/13-api-roadmap.md) 記錄 API 各階段的**內容、驗收方式與踩坑紀錄**；
> [docs/api-routes.md](docs/api-routes.md) 是**路由契約**（與 `Api/Routing/AppRouter.cs` 逐條對應）。
> 三份不要互相抄，各司其職。

**最後更新**：2026-08-18

---

## 一句話現況

後端 API 與前端已串通，媒體管線可運作：分類與子分類兩頁能顯示真實產品圖與響應式 srcSet、雙語切換正確。
內容模組（文章／FAQ／下載／據點／應用方案）的**公開端點已全數完成並實測**，含伺服器端 TOC 推導與排程發布。
**Phase 4 與 Phase 6 已全數完成**：所有內容模組的後台 CRUD 皆已實作並實測 ——
產品、分類骨架、文章（含排程發布、活動面板、圖庫）、應用方案（含人體圖座標驗證）、FAQ、下載、據點。
產品詳情的 `images` / `bodyParts` 也補齊了。**API 只剩 Phase 7 的表單／設定／選單／轉址／sitemap**。
**後台介面與部署尚未開始**。整體約完成 **58%**。

---

## 圖例

| 記號 | 意義 |
|---|---|
| ✅ | 完成且已實測通過 |
| 🟡 | 部分完成（格內註明缺什麼） |
| ⬜ | 未開始 |
| 🔴 | 被待決事項擋住（見 [CLAUDE.md](CLAUDE.md) §7） |
| — | 本階段不適用 |

---

## 一、總覽

| 層 | 狀態 | 說明 |
|---|---|---|
| 規格文件 | ✅ | 14 份，見 [CLAUDE.md](CLAUDE.md) §3 |
| 資料模型 | 🟡 98% | 54 張表完成 53 張（只剩 `ContactSubmission`）|
| API | 🟡 97% | 已實作 **141** 條路由（新增標籤 CRUD 4 條、PDF 登記 1 條、頁面區段語系刪除）。Phase 0–7 除**表單**外全數完成 —— `POST /contact` 與收件匣擋於 SMTP 帳密 |
| 前台 `apps/web` | 🟡 | 18 頁全數切版可運作；只剩 Contact 表單擋於 SMTP |
| 後台 `apps/admin` | 🟡 | 全部畫面可運作（列表＋編輯＋富文字）；只剩相關產品拖曳與表單收件匣 |
| 基礎設施 `infra/` | ✅ | 已部署至 `EuniceMedUS`（West US 2）：Storage／Function App／SWA 共 13 個資源 |
| CI/CD `.github/` | 🟡 | infra 與 web 兩支已實際部署成功；api 部署成功但健康檢查失敗（等 SQL 連線字串）|

---

## 二、資料模型（54 張表）

已建立 **53** 張，7 支 migration。遷移於 Function App 啟動時自動套用。

### ✅ 已完成

| 模組 | 資料表 | Seed |
|---|---|---|
| 系列 | `Collection` `CollectionTranslation` | ✅ 3 筆 × 雙語 |
| 分類 | `Category` `CategoryTranslation` | ✅ 3 筆 × 雙語 |
| 子分類 | `SubCategory` `SubCategoryTranslation` | ✅ 17 筆 × 雙語 |
| 認證 | `Certification` `CertificationTranslation` | 🟡 5 筆 × 雙語，**文案為佔位，待品牌方提供** |
| 部位 | `BodyPart` | ✅ 7 筆（4 筆顯示於人體圖） |
| 標籤 | `Tag` `ProductTag` `ArticleTag` | 🟡 seed 2 筆（掛在文章上），產品端未掛 |
| 產品 | `Product` `ProductTranslation` `ProductImage` `ProductRelated` `ProductBodyPart` `ProductCertification` | ✅ 149 筆（匯入後已發布） |
| 媒體 | `Media` `MediaVariant` `MediaUsage` | ✅ 管線可運作，已上傳 12 張測試圖 |
| 使用者 | `User` `Role` `UserRole` `RefreshToken` | ✅ 4 角色 + 預設管理者（環境變數注入） |
| 稽核 | `AuditLog` | — |
| 頁面區段 | `Page` `PageSection` `PageSectionTranslation` | ✅ 18 頁；區段由 schema 目錄同步（目前 6 個） |
| 應用方案 | `Application` `ApplicationTranslation` `ProductApplication` | ✅ 7 筆 × 雙語（4 筆含人體圖座標）；內容文案待撰寫 |
| 文章 | `Article` `ArticleTranslation` `ArticleCategory` `ArticleCategoryTranslation` `ArticleImage` `ArticleTag` `NewsEvent` `NewsEventTranslation` | ✅ 分類 6 筆 × 雙語；`NewsEvent` 為共用 PK 的 1:1 |
| FAQ | `Faq` `FaqTranslation` `FaqCategory` `FaqCategoryTranslation` | ✅ 分類 3 筆 × 雙語；題目待填 |
| 下載 | `Download` `DownloadTranslation` `ProductDownload` | ✅ 表已建；`FileLocale` 與介面語系刻意分離 |
| 據點 | `SalesLocation` `SalesLocationTranslation` | ✅ 表已建；資料來源待客戶提供 |
| 導覽 | `MenuItem` `MenuItemTranslation` | ✅ 自參照樹（最多兩層）；header/footer 各一組 |
| 轉址 | `Redirect` | ✅ `FromPath` 唯一；前端 middleware 執行 |
| 設定 | `Setting` `SettingTranslation` | ✅ 主鍵是 `Key`；翻譯值覆寫不翻譯值 |

### ⬜ 未建立（1 張）

| 模組 | 資料表 | 排定 |
|---|---|---|
| 表單 | `ContactSubmission` | Phase 7（擋於 SMTP）|

---

## 三、API 端點

已實作 **133** 條。完整契約見 [docs/api-routes.md](docs/api-routes.md)。

### 系統與驗證

| 端點 | 狀態 |
|---|---|
| `GET /health`（含 client IP 診斷） | ✅ |
| `POST /auth/login`（速率限制 + 失敗鎖定） | ✅ |
| `POST /auth/refresh`（單次使用輪替） | ✅ |
| `POST /auth/logout` | ✅ |
| `POST /auth/change-password`（撤銷所有 session） | ✅ |
| RBAC 四角色 + Author 不可發布 | ✅ |
| `AuditLog` 自動記錄所有寫入 | ✅ |

### 公開讀取

| 模組 | 狀態 | 缺什麼 |
|---|---|---|
| 系列 `collections` | ✅ | |
| 產品列表 `products`（含 facets） | ✅ | |
| 產品詳情（三段路徑 + by-slug） | ✅ | `images[]`（含 `isPrimary` 與 `variants[]`）、`bodyParts[]`、`downloads[]` 皆已補齊 |
| 分類 `categories` | ✅ | |
| 子分類 `sub-categories` | ✅ | |
| 認證 `certifications` | ✅ | |
| 應用方案 `applications` / 人體圖 | ✅ | `stats` auto 代入、`supportLevels` 解析系列名、推薦產品自動遞補 |
| 文章 `news` / `insights` | ✅ | 伺服器端 TOC（含回填 anchor）、排程發布、prev/next、event/gallery |
| `article-categories` | ✅ | 回 `{kind,slug,name,count}`；`sponsorship` 兩種 kind 各一筆 |
| `faqs` / `faq-categories` | ✅ | 計數與列表同口徑（皆 join 翻譯表） |
| `downloads` | ✅ | `fileLocale` 與站台語系分離；type facet 不自我收斂 |
| `sales-locations` | ✅ | 伺服器端分組；未填 region 者集中於最後一組 |
| 頁面區段 `pages/{key}` | ✅ | `sections{}` + `refs`、media 已解析、未翻譯區段自動省略 |
| `menus` / `settings` / `sitemap` / `redirects` | ✅ | sitemap 的語系判定共用 `IsRenderable`，不會宣告空白頁 |
| `POST /contact` | 🔴 | 擋於 SMTP 帳密 |

### 後台

| 模組 | 狀態 | 缺什麼 |
|---|---|---|
| 使用者 `admin/users` | ✅ | 含三項自我保護（不可停用／降權／刪除自己） |
| 系列 `admin/collections` | ✅ | **後台 CRUD 的參考實作**，其餘模組照此形狀寫 |
| 舊站匯入 `admin/products/import` | ✅ | 冪等，149 筆；已補上 Admin only 的授權規則 |
| 產品 `admin/products` | ✅ | 含 publish / unpublish / related、軟刪除連帶清理、`rowVersion` 409 |
| 分類／子分類／認證／部位 | ✅ | 讀取登入即可、寫入 Editor+；刪除先擋引用回 409 |
| 媒體庫 `admin/media` | 🟡 | 上傳／列表／引用反查／刪除保護／SAS **＋登記**／SVG 清洗／alt 文字更新皆可用；缺 reprocess |
| 頁面區段 `admin/pages` | ✅ | 含 schema 端點、JSON Pointer 驗證、跨語系同步、同步器、**媒體 preset 比對** |
| 文章 `admin/articles` | ✅ | 含排程發布、活動面板（1:1）、圖庫排序、kind/type 一致性驗證 |
| 文章分類 `admin/article-categories` | ✅ | slug 只在同 kind 內唯一 |
| 標籤 `admin/tags` | ✅ | 產品與文章共用；刪除擋未刪除內容的引用，軟刪除留下的關聯列一併清掉 |
| 應用方案 `admin/applications` | ✅ | 人體圖座標形狀驗證、產品關聯內嵌 |
| FAQ／下載／據點 | ✅ | 寫入為 Editor+（無草稿工作流，存檔即生效） |
| 選單／轉址／設定 | ✅ | 選單整棵樹取代、轉址路徑正規化、設定 Admin only |
| 表單收件匣 | 🔴 | 擋於 SMTP 帳密 |

---

## 四、前台頁面（18 頁）

Next.js **15**（非 16 —— SWA hybrid 的支援是 preview，文件內容仍是 Next 13/14 時期，
不在已經是 preview 的部署目標上再疊一個未驗證的大版本）。版型由 `mockup4/` 鎖定，切版照著做。

**已驗證可運作**：語系前綴 middleware（含 `.swa` 排除）、`ApiResponse` 信封拆解、
語言純度（缺翻譯回 404 不 fallback，且**未翻譯的區段整段不渲染**而非露出他語）、
facet 篩選、standalone 產物 66MB／250MB。

| 頁面 | 路由 | API 是否就緒 |
|---|---|---|
| Home | `/[locale]` | ✅ **已切版可運作**（7 個 schema 已建立；輪播為純 CSS 無 client JS）<br>🔴 **zh-TW 區段文案全缺 → 中文首頁是空白的**，上線前必補 |
| About | `/[locale]/about` | ✅ **已切版可運作**（6 個區段全部接上 `GET /pages/about`）|
| Products | `/[locale]/products` | ✅ **已切版可運作**（hero／cta 兩個 schema + 動態分類卡與產品格）|
| Product Category | `/[locale]/products/{category}` | ✅ **已切版可運作** |
| Sub-category | `/[locale]/products/{category}/{sub}` | ✅ **已切版可運作** |
| Product Detail | `/[locale]/products/{category}/{sub}/{slug}` | ✅ **已切版可運作**（缺 §08 詢價表單，待 Phase 7 的 `POST /contact`）|
| Applications／Detail | `/[locale]/applications[/{slug}]` | ✅ **已切版可運作**（含人體圖 SVG 互動）|
| Partnership | `/[locale]/partnership` | ✅ **已切版可運作**（表單本體待 Phase 7）|
| Resources | `/[locale]/resources` | ✅ **已切版可運作**（含 `ref:Article` / `ref:Download` 解析）|
| FAQ | `/[locale]/faq` | ✅ **已切版可運作**（分類篩選 + 原生 details 手風琴）|
| Insights／Article Detail | `/[locale]/insights[/{slug}]` | ✅ **已切版可運作**（含伺服器端 TOC）|
| News／News Detail | `/[locale]/news[/{slug}]` | ✅ **已切版可運作**（含活動面板、圖庫、prev/next）|
| Downloads | `/[locale]/downloads` | ✅ **已切版可運作**（類型篩選）|
| Where to Buy | `/[locale]/where-to-buy` | ✅ **已切版可運作**（伺服器端分組）|
| Contact | `/[locale]/contact` | 🔴 擋於 Phase 7 的 `POST /contact`（SMTP 帳密未提供）|
| Privacy | `/[locale]/privacy` | ✅ **已切版可運作**（Legal 淨化 profile）|

前台共通項目：i18n 語系前綴 ✅、`output: 'standalone'` 與 250MB gate ✅（目前 66MB）、
圖片走 Blob 直連（`unoptimized: true` + 自訂 srcSet）✅、`.swa` 路徑排除 ✅、安全標頭 ✅、
純 SSR 全路由為 `ƒ Dynamic` ✅、sitemap.xml ✅（含 hreflang）、robots.txt ✅（非正式環境整站 Disallow）、舊網址轉址 ✅（middleware，5 分鐘快取）。

---

## 五、後台介面

`apps/admin` **尚未建立**。

⚠️ **動工前必須先啟動 `frontend-design` skill** —— 後台沒有 mockup、沒有設計稿，
是要現場設計的。約束見 [docs/03-cms.md](docs/03-cms.md) §8.1。技術選型：Tailwind CSS + shadcn/ui。

> **視覺方向已定案**（2026-08-18，`frontend-design` skill）：見 [docs/03-cms.md](docs/03-cms.md) §8.1。
> 簽名元素是**完整度儀表** —— 三段軌道 × 雙語系，讓「缺什麼」一眼可見。
> 側欄每項自帶迷你儀表，**因此不做 Dashboard 頁**。

| 畫面 | 狀態 |
|---|---|
| 登入 | ✅ 可運作（含 refresh token 單次使用的併發處理）|
| Dashboard | — 刻意不做，改由側欄儀表取代 |
| 頁面內容（18 頁動態表單） | ✅ 可運作 —— 表單由 `GET /admin/page-schema/{key}` 動態生成<br>已涵蓋 26 個區段、168 個欄位，10 種 `x-fieldType` 全支援；richtext 走 TipTap（lazy chunk）|
| 產品列表 | ✅ 可運作（搜尋／狀態篩選／分頁／完整度儀表）|
| 產品編輯 | 🟡 可運作（雙語分頁、三個 repeater、圖庫＋主圖、使用情境照、部位／認證多選、尺寸表編輯器、發布／取消發布、`rowVersion` 併發、移除語系）<br>缺：相關產品拖曳|
| 分類 / 子分類 | ✅ 可運作（分類與子分類同一張表、雙語＋SEO、卡片圖／頁首大圖、子分類狀態、`rowVersion` 併發、移除語系）<br>不提供新增／刪除 —— 那等於改全站 URL 結構 |
| 系列 | ✅ 可運作（三筆固定，雙語名稱與說明、排序、移除語系）|
| 認證 | ✅ 可運作（標章文字不翻譯、標章圖、狀態、雙語小字與說明、掛載產品數）|
| 應用方案編輯（含人體圖座標選取器） | ✅ 可運作（兩種型態、雙語、三張圖、四組 repeater、推薦產品、發布／取消發布、移除語系、刪除）<br>人體圖選取器：點放／拖曳／方向鍵微調、顯示其他方案的既有座標避免疊圖|
| 文章列表 | ✅ 可運作（型態／狀態篩選、搜尋、分頁、可進編輯頁）|
| 文章編輯 | ✅ 可運作（News/Insights 共用、雙語、封面、標籤、排程發布、活動面板、圖庫、移除語系、刪除）|
| 應用方案列表 | ✅ 可運作（含人體圖旗標與產品數，可進編輯頁）|
| FAQ 列表／編輯 | ✅ 可運作（分類篩選、新增／編輯／刪除、雙語問答、狀態）|
| 下載列表／編輯 | ✅ 可運作（類型篩選、新增／編輯／刪除、PDF 直傳＋登記、`fileLocale` 與介面語系分開）|
| 據點列表／編輯 | ✅ 可運作（台灣／國際分頁、新增／編輯／刪除、地區標籤、未分組標紅）|

| 媒體庫 | ✅ 可運作（圖片上傳含尺寸提示與非阻擋警告、**PDF 直傳＋登記**、alt 編輯、引用反查、刪除保護）<br>缺：reprocess（API 也還沒做）|
| 導覽選單 | ✅ 可運作（兩層樹、整棵取代、缺標籤語系標紅）|
| 轉址 | ✅ 可運作（含自我轉址與重複來源的錯誤提示）|
| 設定 | ✅ 可運作（區分「需翻譯」與「所有語系共用」兩種鍵）|
| 使用者 | ✅ 可運作（角色、停用、重設密碼、解鎖、刪除）|
| 表單收件匣 | 🔴 擋於 Phase 7 的 SMTP |

---

## 六、部署與維運

| 項目 | 狀態 |
|---|---|
| Azure 資源建立（SWA / Function App / Storage） | ✅ `EuniceMedUS` / West US 2 |
| `infra/main.bicep` | ✅ 已部署（13 個資源，含 MI 的 4 個角色指派）|
| `.github/workflows/api-deploy.yml` | 🟡 build／publish／deploy 皆成功；健康檢查 🔴 擋於 SQL 連線字串 |
| `.github/workflows/web.yml` | ✅ 已部署成功，站台可存取 |
| `.github/workflows/infra.yml` | ✅ 已執行成功（PR 跑 what-if）|
| 自訂網域 + HTTPS | ⬜ 目前為 `zealous-sand-0bdf5e01e.7.azurestaticapps.net` |
| 平台層 CORS | ✅ Function App 的 allowedOrigins 已由 Bicep 設定 |
| Azure Monitor 告警 | ⬜ |
| 客戶 Azure SQL 連線資訊 | 🔴 待提供 |

本機開發環境 ✅ 可運作，步驟見 [docs/12-local-dev.md](docs/12-local-dev.md)。

---

## 六之二、正式環境狀態（2026-08-19）

**全站已在 Azure 上運作。** <https://zealous-sand-0bdf5e01e.7.azurestaticapps.net>

| 元件 | 狀態 |
|---|---|
| 前台 18 頁 | ✅ `/en`、`/zh-TW`、產品／About／FAQ 等皆 200，內容來自正式 API |
| 後台 `/admin` | ✅ 200 |
| API | ✅ `/api/health` healthy；公開端點回真實資料 |
| Azure SQL | ✅ 客戶提供（Basic 5 DTU），schema 已套用，collation `_CI_` |
| sitemap.xml | ✅ |
| 資源（`EuniceMedUS` / West US 2） | Storage、Function App（Flex FC1）、SWA Free、Log Analytics、Application Insights |

### 上線當天踩到的五個坑（全部記在 [docs/13](docs/13-api-roadmap.md)）

1. **Flex Consumption 沒有 Application Insights 就起不來** —— 方案原本明文排除它。
   缺的是記錄管線本身，所以失敗完全沒有訊息。
2. **runtime 版本要填 `10.0` 不是 `10`** —— `az functionapp list-flexconsumption-runtimes`
   回的是 `10`，照著填會讓 host 完全不回應。以 `az resource show` 對照正常的 app 才看得出來。
3. **`Jwt__Secret` 不是 `Jwt__SigningKey`** —— host 起得來但每個請求 500。
4. **host 儲存體與部署包要用連線字串** —— 同訂用帳戶四個正常的 Flex app 都是這樣。
5. **`API_BASE` 沒有 `/v1`** —— 實際端點是 `/api/collections`，早期文件寫的 `/api/v1` 從未實作，
   照抄會讓前台每一頁 500 而 API 本身正常。

> 找到 2～5 的方法都是同一招：**跟一個已知正常的同型資源逐項比對**，
> 以及**把正式環境的設定灌進本機跑一次**。在沒有可觀測性的環境裡，這兩招比猜快得多。

### 待辦

| 項目 | 說明 |
|---|---|
| 自訂網域 `www.eunicemed.com` | 尚未綁定，目前是 `*.azurestaticapps.net` |
| SMTP | 表單與收件匣仍擋在這裡 |
| Managed Identity 存取 SQL | 客戶 SQL 尚未設 Entra 管理員，目前用帳密連線字串 |
| 資料庫層級 | Basic 5 DTU；純 SSR 每頁多次查詢，有流量時需評估升級 |
| 內容 | 149 筆產品與首頁 7 區段的 zh-TW 文案仍缺（見下方§七）|

---

## 七、擋住的事項

完整清單見 [CLAUDE.md](CLAUDE.md) §7。當下真正擋住開發的：

| # | 事項 | 擋住 |
|---|---|---|
| 1 | SMTP 主機／帳密／每日寄送上限 | Phase 7 上線 |
| 2 | ~~collation~~（已確認 `_CI_`，無問題）；**連線數上限**與**能否設 Entra 管理員**仍待確認 | 部署調校與改用 Managed Identity |
| 3 | 認證文案（5 筆的 SubLabel 與說明目前是佔位） | About 頁與產品頁上線 |
| 4 | 17 個子分類落地頁的敘述文案 | 子分類頁發布（缺文案者不應發布，會是薄內容頁） |
| ~~5~~ | ~~首頁 7 個區段的 zh-TW 文案~~ | **已解除**（2026-08-19 譯自英文版並上線）|
| ~~6~~ | ~~149 筆產品的 zh-TW 翻譯~~ | **已解除**（2026-08-19，125 個品名 + 285 句 feature，品牌詞與型號保留英文）<br>⚠️ **譯文未經客戶審閱**，其中 features 屬醫療器材療效宣稱，正式對外前建議由客戶或法務確認 |

> **已解除**：媒體變體階梯（2026-08-17 定案採階梯，見 [docs/11](docs/11-media-specs.md) §2a）—— Phase 3 可開工。

---

## 八、怎麼維護這份文件

1. **完成一項就改一格**，不要累積到最後補。
2. 狀態改成 ✅ 之前，該項必須**實際跑過測試資料**（照 Jabez 慣例：不得只以目視或靜態檢查代替）。
   API 的驗收請求存在 [`Api/http/`](Api/http/)。
3. 只記狀態。**做法寫進 [docs/13-api-roadmap.md](docs/13-api-roadmap.md)、路由寫進 [docs/api-routes.md](docs/api-routes.md)** ——
   同一件事不要在三個地方各寫一份，那會很快互相矛盾。
4. 新發現的坑寫進 13 的「踩到的坑」，不要寫在這裡。
