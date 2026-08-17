# 專案進度總表

> **這份文件是「做到哪裡了」的單一真相來源。** 每完成一項就更新對應那格。
>
> 分工：本檔記錄**狀態**；[docs/13-api-roadmap.md](docs/13-api-roadmap.md) 記錄 API 各階段的**內容、驗收方式與踩坑紀錄**；
> [docs/api-routes.md](docs/api-routes.md) 是**路由契約**（與 `Api/Routing/AppRouter.cs` 逐條對應）。
> 三份不要互相抄，各司其職。

**最後更新**：2026-08-17

---

## 一句話現況

後端 API 的骨架、驗證授權、產品與分類的公開讀取已可運作並實測通過；媒體變體階梯已定案，Phase 3 可開工；
**前端、後台介面、部署都尚未開始**。整體約完成 **15%**。

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
| 資料模型 | 🟡 43% | 54 張表完成 23 張 |
| API | 🟡 29% | 約 90 個端點完成 26 個 |
| 前台 `apps/web` | ⬜ | 尚未建立專案 |
| 後台 `apps/admin` | ⬜ | 尚未建立專案；介面需先跑 `frontend-design` skill |
| 基礎設施 `infra/` | ⬜ | Bicep 尚未撰寫 |
| CI/CD `.github/` | ⬜ | workflow 尚未撰寫 |

---

## 二、資料模型（54 張表）

已建立 **23** 張，4 支 migration。遷移於 Function App 啟動時自動套用。

### ✅ 已完成

| 模組 | 資料表 | Seed |
|---|---|---|
| 系列 | `Collection` `CollectionTranslation` | ✅ 3 筆 × 雙語 |
| 分類 | `Category` `CategoryTranslation` | ✅ 3 筆 × 雙語 |
| 子分類 | `SubCategory` `SubCategoryTranslation` | ✅ 17 筆 × 雙語 |
| 認證 | `Certification` `CertificationTranslation` | 🟡 5 筆 × 雙語，**文案為佔位，待品牌方提供** |
| 部位 | `BodyPart` | ✅ 7 筆（4 筆顯示於人體圖） |
| 標籤 | `Tag` `ProductTag` | — 無 seed |
| 產品 | `Product` `ProductTranslation` `ProductImage` `ProductRelated` `ProductBodyPart` `ProductCertification` | ✅ 149 筆（皆為草稿） |
| 媒體 | `Media` | — 僅資料表，管線見 Phase 3 |
| 使用者 | `User` `Role` `UserRole` `RefreshToken` | ✅ 4 角色 + 預設管理者（環境變數注入） |
| 稽核 | `AuditLog` | — |

### ⬜ 未建立（31 張）

| 模組 | 資料表 | 排定 |
|---|---|---|
| 媒體變體與引用 | `MediaVariant` `MediaUsage` | Phase 3（階梯已定案，可開工） |
| 應用方案 | `Application` `ApplicationTranslation` `ProductApplication` | Phase 6 |
| 文章 | `Article` `ArticleTranslation` `ArticleCategory` `ArticleCategoryTranslation` `ArticleImage` `ArticleTag` `NewsEvent` `NewsEventTranslation` | Phase 6 |
| FAQ | `Faq` `FaqTranslation` `FaqCategory` `FaqCategoryTranslation` | Phase 6 |
| 下載 | `Download` `DownloadTranslation` `ProductDownload` | Phase 6 |
| 據點 | `SalesLocation` `SalesLocationTranslation` | Phase 6 |
| 頁面區段 | `Page` `PageSection` `PageSectionTranslation` | Phase 5 |
| 導覽與轉址 | `MenuItem` `MenuItemTranslation` `Redirect` | Phase 7 |
| 表單與設定 | `ContactSubmission` `Setting` `SettingTranslation` | Phase 7 |

---

## 三、API 端點

已實作 **26** 個。完整契約見 [docs/api-routes.md](docs/api-routes.md)。

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
| 產品詳情（三段路徑 + by-slug） | 🟡 | `images`、`bodyParts` 回空陣列，等 Phase 3 媒體管線 |
| 分類 `categories` | ✅ | |
| 子分類 `sub-categories` | ✅ | |
| 認證 `certifications` | ✅ | |
| 應用方案 `applications` / 人體圖 | ⬜ | Phase 6 |
| 文章 `news` / `insights` | ⬜ | Phase 6 |
| `faqs` / `downloads` / `sales-locations` | ⬜ | Phase 6 |
| 頁面區段 `pages/{key}` | ⬜ | Phase 5 |
| `menus` / `settings` / `sitemap` | ⬜ | Phase 7 |
| `POST /contact` | ⬜ | Phase 7 |

### 後台

| 模組 | 狀態 | 缺什麼 |
|---|---|---|
| 使用者 `admin/users` | ✅ | 含三項自我保護（不可停用／降權／刪除自己） |
| 系列 `admin/collections` | ✅ | **後台 CRUD 的參考實作**，其餘模組照此形狀寫 |
| 舊站匯入 `admin/products/import` | ✅ | 冪等，149 筆 |
| 產品 `admin/products` | ⬜ | 含 publish / unpublish / related |
| 分類／子分類／認證／部位 | ⬜ | |
| 媒體庫 `admin/media` | ⬜ | 變體階梯已定案（2026-08-17），可開工 |
| 頁面區段 `admin/pages` | ⬜ | Phase 5 |
| 其餘內容模組 | ⬜ | Phase 6 |
| 表單收件匣／選單／轉址／設定 | ⬜ | Phase 7 |

---

## 四、前台頁面（18 頁）

`apps/web` **尚未建立**。版型已由 `mockup4/` 鎖定，切版時照著做。

| 頁面 | 路由 | API 是否就緒 |
|---|---|---|
| Home | `/[locale]` | ⬜ 需 `pages/home` |
| About | `/[locale]/about` | ⬜ 需 `pages/about` |
| Products | `/[locale]/products` | 🟡 產品列表就緒，頁面文案未就緒 |
| Product Category | `/[locale]/products/{category}` | ✅ |
| Sub-category | `/[locale]/products/{category}/{sub}` | ✅ |
| Product Detail | `/[locale]/products/{category}/{sub}/{slug}` | 🟡 缺圖片 |
| Applications／Detail | `/[locale]/applications[/{slug}]` | ⬜ |
| Partnership | `/[locale]/partnership` | ⬜ |
| Resources | `/[locale]/resources` | ⬜ |
| FAQ | `/[locale]/faq` | ⬜ |
| Insights／Article Detail | `/[locale]/insights[/{slug}]` | ⬜ |
| News／News Detail | `/[locale]/news[/{slug}]` | ⬜ |
| Downloads | `/[locale]/downloads` | ⬜ |
| Where to Buy | `/[locale]/where-to-buy` | ⬜ |
| Contact | `/[locale]/contact` | ⬜ |
| Privacy | `/[locale]/privacy` | ⬜ |

前台共通項目：i18n 語系前綴 ⬜、`output: 'standalone'` 與 250MB gate ⬜、
圖片走 Blob 直連（**不可用 SWA 圖片優化**）⬜、`.swa` 路徑排除 ⬜、安全標頭 ⬜、sitemap ⬜。

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
