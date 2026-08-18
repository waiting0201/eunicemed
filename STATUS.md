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
| 資料模型 | 🟡 89% | 54 張表完成 48 張 |
| API | 🟡 86% | 已實作 **121** 條路由。Phase 0–6 全數完成，只剩 Phase 7（表單／設定／選單／轉址／sitemap，約 20 條） |
| 前台 `apps/web` | 🟡 | Next.js 15 已建立，2 頁可運作；部署限制已實測 |
| 後台 `apps/admin` | ⬜ | 尚未建立專案；介面需先跑 `frontend-design` skill |
| 基礎設施 `infra/` | ⬜ | Bicep 尚未撰寫 |
| CI/CD `.github/` | ⬜ | workflow 尚未撰寫 |

---

## 二、資料模型（54 張表）

已建立 **28** 張，6 支 migration。遷移於 Function App 啟動時自動套用。

### ✅ 已完成

| 模組 | 資料表 | Seed |
|---|---|---|
| 系列 | `Collection` `CollectionTranslation` | ✅ 3 筆 × 雙語 |
| 分類 | `Category` `CategoryTranslation` | ✅ 3 筆 × 雙語 |
| 子分類 | `SubCategory` `SubCategoryTranslation` | ✅ 17 筆 × 雙語 |
| 認證 | `Certification` `CertificationTranslation` | 🟡 5 筆 × 雙語，**文案為佔位，待品牌方提供** |
| 部位 | `BodyPart` | ✅ 7 筆（4 筆顯示於人體圖） |
| 標籤 | `Tag` `ProductTag` | — 無 seed |
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

### ⬜ 未建立（6 張）

| 模組 | 資料表 | 排定 |
|---|---|---|
| 導覽與轉址 | `MenuItem` `MenuItemTranslation` `Redirect` | Phase 7 |
| 表單與設定 | `ContactSubmission` `Setting` `SettingTranslation` | Phase 7 |

---

## 三、API 端點

已實作 **121** 條。完整契約見 [docs/api-routes.md](docs/api-routes.md)。

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
| `menus` / `settings` / `sitemap` | ⬜ | Phase 7 |
| `POST /contact` | ⬜ | Phase 7 |

### 後台

| 模組 | 狀態 | 缺什麼 |
|---|---|---|
| 使用者 `admin/users` | ✅ | 含三項自我保護（不可停用／降權／刪除自己） |
| 系列 `admin/collections` | ✅ | **後台 CRUD 的參考實作**，其餘模組照此形狀寫 |
| 舊站匯入 `admin/products/import` | ✅ | 冪等，149 筆；已補上 Admin only 的授權規則 |
| 產品 `admin/products` | ✅ | 含 publish / unpublish / related、軟刪除連帶清理、`rowVersion` 409 |
| 分類／子分類／認證／部位 | ✅ | 讀取登入即可、寫入 Editor+；刪除先擋引用回 409 |
| 媒體庫 `admin/media` | 🟡 | 上傳／列表／引用反查／刪除保護／SAS／SVG 清洗皆可用；缺 reprocess |
| 頁面區段 `admin/pages` | ✅ | 含 schema 端點、JSON Pointer 驗證、跨語系同步、同步器 |
| 文章 `admin/articles` | ✅ | 含排程發布、活動面板（1:1）、圖庫排序、kind/type 一致性驗證 |
| 文章分類 `admin/article-categories` | ✅ | slug 只在同 kind 內唯一 |
| 應用方案 `admin/applications` | ✅ | 人體圖座標形狀驗證、產品關聯內嵌 |
| FAQ／下載／據點 | ✅ | 寫入為 Editor+（無草稿工作流，存檔即生效） |
| 表單收件匣／選單／轉址／設定 | ⬜ | Phase 7 |

---

## 四、前台頁面（18 頁）

Next.js **15**（非 16 —— SWA hybrid 的支援是 preview，文件內容仍是 Next 13/14 時期，
不在已經是 preview 的部署目標上再疊一個未驗證的大版本）。版型由 `mockup4/` 鎖定，切版照著做。

**已驗證可運作**：語系前綴 middleware（含 `.swa` 排除）、`ApiResponse` 信封拆解、
語言純度（缺翻譯回 404 不 fallback，且**未翻譯的區段整段不渲染**而非露出他語）、
facet 篩選、standalone 產物 66MB／250MB。

| 頁面 | 路由 | API 是否就緒 |
|---|---|---|
| Home | `/[locale]` | 🟡 暫代頁可運作；正式版型需 `home` 的 7 個 schema |
| About | `/[locale]/about` | 🟡 **API 已就緒**（6 個區段可編輯）；頁面未切 |
| Products | `/[locale]/products` | 🟡 產品列表就緒，頁面文案未就緒 |
| Product Category | `/[locale]/products/{category}` | ✅ **已切版可運作** |
| Sub-category | `/[locale]/products/{category}/{sub}` | ✅ **已切版可運作** |
| Product Detail | `/[locale]/products/{category}/{sub}/{slug}` | ✅ **已切版可運作**（缺 §08 詢價表單，待 Phase 7 的 `POST /contact`）|
| Applications／Detail | `/[locale]/applications[/{slug}]` | ✅ **已切版可運作**（含人體圖 SVG 互動）|
| Partnership | `/[locale]/partnership` | ⬜ |
| Resources | `/[locale]/resources` | ⬜ |
| FAQ | `/[locale]/faq` | ✅ **已切版可運作**（分類篩選 + 原生 details 手風琴）|
| Insights／Article Detail | `/[locale]/insights[/{slug}]` | ✅ **已切版可運作**（含伺服器端 TOC）|
| News／News Detail | `/[locale]/news[/{slug}]` | ✅ **已切版可運作**（含活動面板、圖庫、prev/next）|
| Downloads | `/[locale]/downloads` | ✅ **已切版可運作**（類型篩選）|
| Where to Buy | `/[locale]/where-to-buy` | ✅ **已切版可運作**（伺服器端分組）|
| Contact | `/[locale]/contact` | ⬜ |
| Privacy | `/[locale]/privacy` | ⬜ |

前台共通項目：i18n 語系前綴 ✅、`output: 'standalone'` 與 250MB gate ✅（目前 66MB）、
圖片走 Blob 直連（`unoptimized: true` + 自訂 srcSet）✅、`.swa` 路徑排除 ✅、安全標頭 ✅、
純 SSR 全路由為 `ƒ Dynamic` ✅、sitemap ⬜、robots ⬜。

---

## 五、後台介面

`apps/admin` **尚未建立**。

⚠️ **動工前必須先啟動 `frontend-design` skill** —— 後台沒有 mockup、沒有設計稿，
是要現場設計的。約束見 [docs/03-cms.md](docs/03-cms.md) §8.1。技術選型：Tailwind CSS + shadcn/ui。

| 畫面 | 狀態 |
|---|---|
| 登入 / Dashboard | ⬜ |
| 頁面內容（18 頁動態表單） | ⬜ |
| 產品 / 分類 / 子分類 / 系列 / 認證 | ⬜ |
| 應用方案（含人體圖座標選取器） | ⬜ |
| 文章 / 文章分類 / FAQ / 下載 / 據點 | ⬜ |
| 媒體庫 | ⬜ |
| 導覽 / 表單收件匣 / 使用者 / 設定 | ⬜ |

---

## 六、部署與維運

| 項目 | 狀態 |
|---|---|
| Azure 資源建立（SWA / Function App / Storage） | ⬜ |
| `infra/main.bicep` | ⬜ |
| `.github/workflows/api-deploy.yml` | ⬜ 照抄 Jabez（OIDC + functions-action） |
| `.github/workflows/web.yml` | ⬜ |
| 自訂網域 + HTTPS | ⬜ |
| 平台層 CORS | ⬜ |
| Azure Monitor 告警 | ⬜ |
| 客戶 Azure SQL 連線資訊 | 🔴 待提供 |

本機開發環境 ✅ 可運作，步驟見 [docs/12-local-dev.md](docs/12-local-dev.md)。

---

## 七、擋住的事項

完整清單見 [CLAUDE.md](CLAUDE.md) §7。當下真正擋住開發的：

| # | 事項 | 擋住 |
|---|---|---|
| 1 | SMTP 主機／帳密／每日寄送上限 | Phase 7 上線 |
| 2 | 客戶 Azure SQL 的 collation、連線數上限、能否設 Entra 管理員 | 部署 |
| 3 | 認證文案（5 筆的 SubLabel 與說明目前是佔位） | About 頁與產品頁上線 |
| 4 | 17 個子分類落地頁的敘述文案 | 子分類頁發布（缺文案者不應發布，會是薄內容頁） |

> **已解除**：媒體變體階梯（2026-08-17 定案採階梯，見 [docs/11](docs/11-media-specs.md) §2a）—— Phase 3 可開工。

---

## 八、怎麼維護這份文件

1. **完成一項就改一格**，不要累積到最後補。
2. 狀態改成 ✅ 之前，該項必須**實際跑過測試資料**（照 Jabez 慣例：不得只以目視或靜態檢查代替）。
   API 的驗收請求存在 [`Api/http/`](Api/http/)。
3. 只記狀態。**做法寫進 [docs/13-api-roadmap.md](docs/13-api-roadmap.md)、路由寫進 [docs/api-routes.md](docs/api-routes.md)** ——
   同一件事不要在三個地方各寫一份，那會很快互相矛盾。
4. 新發現的坑寫進 13 的「踩到的坑」，不要寫在這裡。
