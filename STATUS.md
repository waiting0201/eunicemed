# 專案進度總表

> **這份文件是「做到哪裡了」的單一真相來源。** 每完成一項就更新對應那格。
>
> 分工：本檔記錄**狀態**；[docs/13-api-roadmap.md](docs/13-api-roadmap.md) 記錄 API 各階段的**內容、驗收方式與踩坑紀錄**；
> [docs/api-routes.md](docs/api-routes.md) 是**路由契約**（與 `Api/Routing/AppRouter.cs` 逐條對應）。
> 三份不要互相抄，各司其職。

**最後更新**：2026-08-31

---

## 一句話現況

**全站已在 Azure 上運作**（見 §六之二），前台 18 頁、`/admin` 後台、API 與 Azure SQL 皆已上線。
API 的 Phase 0–7 全數完成，**表單收件匣已於 2026-08-28 補上並不再擋於 SMTP** ——
送件成功的定義是入庫成功，SMTP 未設定時跳過寄信只記 log，三支前台表單因此恢復運作。

同日完成**後台範圍收斂**（[docs/15](docs/15-cms-scope.md)）：頁面區段 25 → 19 支，
版面文案回到前端常數，側欄依「多久會動一次」重分三群。
連帶把 About / Resources / Products / Partnership / Privacy 五頁**線上原本空白的內容**補齊
—— 那五頁的區段從來沒人填過，先前只渲染出一個標題。

**2026-08-29 第二次收斂**（[docs/15](docs/15-cms-scope.md) §7）：判準從「多久動一次」進一步變成
**「一個單元的內容在它露出的地方維護」**。側欄 16 → 9 項 —— 認證收進「關於我們」、
分類與系列收進「產品」、媒體庫拆掉改成每個欄位就地上傳本機檔（每格附尺寸與比例提示）、
導覽選單與設定回到前端常數、轉址改由 `RedirectWriter` 在 slug 變動時自動產生。
同時修好一個線上缺漏：頁尾的 LinkedIn 連結（原本靠一個從未填過的 Setting 鍵）。

**2026-08-30 收尾**（[docs/15](docs/15-cms-scope.md) §9）：`GET /admin/pages` 改為只回有區段的頁，
後台不再列出 12 頁「尚未開放編輯」—— 那是定案，寫成待辦只會被反覆追問。
順帶補上又一個線上缺漏：Applications／FAQ／Insights／News／Downloads／Where to Buy
**六頁的頁頂 band 從來沒有渲染過**（圖來源是 CMS，而那六頁沒有 schema），
現以靜態品牌圖樣寫死。`mockup:check` 一直是 100% —— 宣告集合比對證明不了元素有被渲染。

**2026-08-31 內容上線**：先前只灌本機的 mockup4 示意內容 —— FAQ 9 則、Privacy 6 節條文、
6 個據點、Resources 引用的三份文件 —— 已灌進**正式站**，en 與 zh-TW 皆齊（以公開端點實測）。
同時修掉切換語系會跳回首頁、以及國際經銷商列表在寬螢幕下裂成兩塊。

**2026-08-31 reCAPTCHA v3**：三支表單接上 Google reCAPTCHA v3。**低分不擋件** ——
未達門檻（預設 0.5）的來信照樣入庫、狀態直接記成 `spam` 並跳過通知信，
分數存下來給收件匣顯示；金鑰未設定時整段跳過，表單行為與接上之前相同（見 [docs/13](docs/13-api-roadmap.md)）。

**2026-08-31 媒體修正**：同一個檔案上傳兩次會產生兩列 `Media` 共用同一組 blob，
刪任一列就把另一列的圖砍成死連結（畫面上只看到破圖）。改為**上傳以檔名去重**
（雜湊改算「內容 + presetKey」）＋**刪除只刪沒有別列共用的 blob**，並補上
`POST /admin/media/{id}/reprocess` —— 先前踩到之後沒有退路，只能刪掉整筆重傳。

剩下的是內容工作（17 個子分類落地頁文案、認證文案）與上線收尾（自訂網域、監控告警）。

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
| 規格文件 | ✅ | 15 份，見 [CLAUDE.md](CLAUDE.md) §3 |
| 資料模型 | ✅ | **53 張表**全數完成（`ContactSubmission` 於 2026-08-28 補上，含 `IX_Contact_Ip`；`AuditLog` 於 2026-08-30 移除）|
| API | ✅ | `AppRouter` 共 **141** 條分派（`PUT or PATCH` 合併寫的算一條）。Phase 0–7 全數完成，契約表上**已無待實作端點**（2026-08-31 補上 `media/{id}/reprocess` 與 reCAPTCHA v3）|
| 前台 `apps/web` | ✅ | 18 頁全數可運作，**版型已逐元素照抄 mockup4**（`mockup:check` 18/18 100%，見 §四）；手機／平板已完成並實測；三支表單已恢復送出 |
| 後台 `apps/admin` | 🟡 | 全部畫面可運作（含表單收件匣）。**2026-08-29 第二次收斂**：側欄 16 → 9 項，圖片改為欄位就地上傳，認證收進「關於我們」、分類與系列收進「產品」（見 [docs/15](docs/15-cms-scope.md) §7）。2026-08-31 補上**相關產品編輯器**（先前後台完全沒有這一格）—— API 端已實測，**UI 尚未有人在瀏覽器點過** |
| 基礎設施 `infra/` | ✅ | 已部署至 `EuniceMedUS`（West US 2）：Storage／Function App／SWA 共 13 個資源 |
| CI/CD `.github/` | ✅ | 三支都在跑：infra／web／api 皆實際部署成功，api 的啟動健康檢查自 2026-08-19 起通過（最近一次 2026-08-30）|

---

## 二、資料模型（53 張表）

**53 張全數建立**，12 支 migration。遷移於 Function App 啟動時自動套用。

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
| 頁面區段 | `Page` `PageSection` `PageSectionTranslation` | ✅ 18 頁；區段由 schema 目錄同步（目前 6 個）。`privacy` 兩支已填雙語（取自 mockup4 的**示意條文**，本機與正式站皆已灌）|
| 應用方案 | `Application` `ApplicationTranslation` `ProductApplication` | ✅ 7 筆 × 雙語（4 筆含人體圖座標）；內容文案待撰寫 |
| 文章 | `Article` `ArticleTranslation` `ArticleCategory` `ArticleCategoryTranslation` `ArticleImage` `ArticleTag` `NewsEvent` `NewsEventTranslation` | ✅ 分類 6 筆 × 雙語；`NewsEvent` 為共用 PK 的 1:1 |
| FAQ | `Faq` `FaqTranslation` `FaqCategory` `FaqCategoryTranslation` | ✅ 分類 3 筆 × 雙語；題目 9 筆 × 雙語（取自 mockup4，本機與正式站皆已灌）|
| 下載 | `Download` `DownloadTranslation` `ProductDownload` | ✅ 表已建；`FileLocale` 與介面語系刻意分離 |
| 據點 | `SalesLocation` `SalesLocationTranslation` | ✅ 表已建；6 筆 × 雙語（3 台灣 + 3 國際，取自 mockup4 的**示意資料**，本機與正式站皆已灌）；正式清單待客戶提供 |
| 導覽 | `MenuItem` `MenuItemTranslation` | ⚠️ 表在但**已無端點也無 UI**，線上一直是空的；導覽寫在前端（docs/15 §7.4）|
| 表單 | `ContactSubmission` | ✅ 2026-08-28 建表，含 `IX_Contact_Ip`；2026-08-31 加 `RecaptchaScore`（nullable，擴張式）|
| 轉址 | `Redirect` | ✅ `FromPath` 唯一；前端 middleware 執行。slug 改動時由 `RedirectWriter` 自動寫入 |
| 設定 | `Setting` `SettingTranslation` | ⚠️ 同導覽，表留著但已無端點；公司資訊寫在 `apps/web/lib/company.ts` |

### ⬜ 未建立

無。`AuditLog` 是唯一被移除的表（2026-08-30，[docs/15](docs/15-cms-scope.md) §8）。

---

## 三、API 端點

`AppRouter` 共 **141** 條分派（`PUT or PATCH` 合併寫的算一條）。完整契約見 [docs/api-routes.md](docs/api-routes.md)。

> ✅ **2026-08-31 已逐條核對過**：把兩邊都展開成「方法 + 正規化路徑」後各為 **158 條，完全一致**
> （`AppRouter` 的 141 條分派裡有 17 條是 `PUT or PATCH` 合寫的；契約表的 `[/{id}]` 是一組 CRUD 的壓縮寫法）。
> 核對時修掉的落差：8 支後台模組的 `GET /{id}` 契約表漏列、表單收件匣被放在「待實作」區。
> 當時唯一的差異 `POST /admin/media/{id}/reprocess`（契約表有、程式沒有）已於同日實作，**待實作區現在是空的**。

### 系統與驗證

| 端點 | 狀態 |
|---|---|
| `GET /health`（含 client IP 診斷） | ✅ |
| `POST /auth/login`（速率限制 + 失敗鎖定） | ✅ |
| `POST /auth/refresh`（單次使用輪替） | ✅ |
| `POST /auth/logout` | ✅ |
| `POST /auth/change-password`（撤銷所有 session） | ✅ |
| RBAC 四角色 + Author 不可發布 | ✅ |

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
| `POST /contact` | ✅ | 蜜罐＋速率限制＋必填＋**reCAPTCHA v3**；先入庫再寄信，SMTP 未設定就跳過寄信。低分不擋件，狀態記成 `spam` 並跳過通知信；未設 `Recaptcha__SecretKey` 時整段跳過 |

### 後台

| 模組 | 狀態 | 缺什麼 |
|---|---|---|
| 使用者 `admin/users` | ✅ | 含三項自我保護（不可停用／降權／刪除自己） |
| 系列 `admin/collections` | ✅ | **後台 CRUD 的參考實作**，其餘模組照此形狀寫 |
| 舊站匯入 `admin/products/import` | ✅ | 冪等，149 筆；已補上 Admin only 的授權規則 |
| 產品 `admin/products` | ✅ | 含 publish / unpublish / related、軟刪除連帶清理、`rowVersion` 409 |
| 分類／子分類／認證／部位 | ✅ | 讀取登入即可、寫入 Editor+；刪除先擋引用回 409 |
| 媒體 `admin/media` | ✅ | 上傳（**同內容同 preset 去重，回既有那筆**）／列表／引用反查／刪除保護（**不刪別列共用的 blob**）／`reprocess`／SAS ＋登記／SVG 清洗／alt 文字更新皆可用。**後台已無媒體庫畫面**，引用反查、刪除與 reprocess 沒有 UI 使用，走 `.http`（docs/15 §7.3）|
| 頁面區段 `admin/pages` | ✅ | 含 schema 端點、JSON Pointer 驗證、跨語系同步、同步器、**媒體 preset 比對** |
| 文章 `admin/articles` | ✅ | 含排程發布、活動面板（1:1）、圖庫排序、kind/type 一致性驗證 |
| 文章分類 `admin/article-categories` | ✅ | slug 只在同 kind 內唯一 |
| 標籤 `admin/tags` | ✅ | 產品與文章共用；刪除擋未刪除內容的引用，軟刪除留下的關聯列一併清掉 |
| 應用方案 `admin/applications` | ✅ | 人體圖座標形狀驗證、產品關聯內嵌 |
| FAQ／下載／據點 | ✅ | 寫入為 Editor+（無草稿工作流，存檔即生效） |
| 轉址 | ✅ | 路徑正規化、自我轉址 400、重複來源 409。**沒有後台畫面** —— 舊站對照走 `.http`，日常由 `RedirectWriter` 自動產生 |
| ~~選單／設定~~ | — | **端點已移除**（2026-08-29，docs/15 §7.4）|
| 表單收件匣 | ✅ | 列表（篩選＋分頁）／詳情／標記狀態／CSV 匯出；未處理筆數併進 `/admin/summary`。詳情帶 `recaptchaScore` |

---

## 四、前台頁面（18 頁）

Next.js **15**（非 16 —— SWA hybrid 的支援是 preview，文件內容仍是 Next 13/14 時期，
不在已經是 preview 的部署目標上再疊一個未驗證的大版本）。版型由 `mockup4/` 鎖定，切版照著做。

**已驗證可運作**：語系前綴 middleware（含 `.swa` 排除）、`ApiResponse` 信封拆解、
語言純度（缺翻譯回 404 不 fallback，且**未翻譯的區段整段不渲染**而非露出他語）、
facet 篩選、standalone 產物 66MB／250MB。

| 頁面 | 路由 | API 是否就緒 |
|---|---|---|
| Home | `/[locale]` | ✅ **可運作**（4 個 schema；hero／01 標題／02／03／05 的文案為前端常數，見 [docs/15](docs/15-cms-scope.md)；輪播為純 CSS 無 client JS）|
| About | `/[locale]/about` | ✅ **可運作**（5 個 schema；文案為前端常數）<br>2026-08-28 前線上只有一個 h1 + 五段 `null` —— 區段從沒人填過 |
| Products | `/[locale]/products` | ✅ **可運作**（hero／cta 只剩圖片 + 動態分類卡與產品格）|
| Product Category | `/[locale]/products/{category}` | ✅ **已切版可運作** |
| Sub-category | `/[locale]/products/{category}/{sub}` | ✅ **已切版可運作** |
| Product Detail | `/[locale]/products/{category}/{sub}/{slug}` | ✅ **可運作**（§08 詢價面板送出已恢復）|
| Applications／Detail | `/[locale]/applications[/{slug}]` | ✅ **已切版可運作**（含人體圖 SVG 互動；頁頂 band 為靜態品牌圖樣）|
| Partnership | `/[locale]/partnership` | ✅ **可運作**（§03 洽詢表單送出已恢復；hero 文案改為前端常數）|
| Resources | `/[locale]/resources` | ✅ **可運作**（含 `ref:Article` / `ref:Download` 解析）<br>2026-08-28 前線上是**完全空白**的 —— 五個區段都沒填，其中三個已定案改為前端常數 |
| FAQ | `/[locale]/faq` | ✅ **已切版可運作**（分類篩選 + 原生 details 手風琴；頁頂 band 為靜態品牌圖樣）|
| Insights／Article Detail | `/[locale]/insights[/{slug}]` | ✅ **已切版可運作**（含伺服器端 TOC；列表頁頂 band 為靜態品牌圖樣）|
| News／News Detail | `/[locale]/news[/{slug}]` | ✅ **已切版可運作**（含活動面板、圖庫、prev/next；列表頁頂 band 為靜態品牌圖樣）|
| Downloads | `/[locale]/downloads` | ✅ **已切版可運作**（類型篩選；頁頂 band 為靜態品牌圖樣）|
| Where to Buy | `/[locale]/where-to-buy` | ✅ **已切版可運作**（伺服器端分組；頁頂 band 為靜態品牌圖樣）<br>2026-08-31 灌入 6 筆據點（en + zh-TW，本機與正式站）—— mockup4 的示意資料，網址全為 `#` 故留空 |
| Contact | `/[locale]/contact` | ✅ **可運作**，送出已恢復（2026-08-28）；2026-08-31 接上 reCAPTCHA v3（無 widget，表單下方為 Google 要求的聲明）|
| Privacy | `/[locale]/privacy` | ✅ **可運作**（Legal 淨化 profile）<br>2026-08-28 前線上是**完全空白**的；條文仍留在 CMS，頁首文案改為前端常數<br>2026-08-31 灌入 band 與 6 節條文（en + zh-TW，本機與正式站）—— **mockup4 的示意文案，待法務定稿** |

**2026-08-28 逐元素照抄**（原分支 `feat/mockup4-verbatim`，已併入 `main`）：
先前兩輪校正是把 mockup4 的 inline style **翻譯**成 Tailwind arbitrary value，翻譯就會漂移 ——
保真度因此很不平均（`PageHero` 幾乎完美，About §02 幾乎每個值都不同）。
本輪改為**逐字照搬**：`apps/web/lib/css.ts` 的 `css`…`` 樣板讓兩邊維持同一種語法，
review 與 `tools/mockup-diff` 都能逐字比對。**18 頁全數 100%，零自創宣告。**

過程中修掉的實質錯誤（非僅數值）：首頁圓點是 26×4 藥丸而非 8×8 白點、見證引言漏了
`font-stretch:108%`、播放鈕與浮動 chip 的動畫整個沒接、全型錄卡有兩個點擊目標、
About §02 里程碑的格線與分隔線做反、系列徽章用了壓深的文字色而非 Pantone 填色、
產品卡在分類頁少了整個外框版本、分類頁完全沒有分頁器（第 25 個產品點不到）、
News 與 Insights 的卡被當成同一種、麵包屑最後一節顏色錯。

**2026-08-28 響應式**：mockup4 沒有斷點，所以這一層是現場設計的
（[docs/rwd-backlog.md](docs/rwd-backlog.md)）。四個需要真的設計的地方都已處理：
手機導覽（新增 `MobileNav`，mockup4 完全沒有）、人體圖 chip、側欄篩選、尺寸表橫向捲動。
18 頁 × 390／768／1280px 以 CDP 實測**無橫向溢出**，桌機版與照抄結果一致（`mockup:check` 仍 18/18 100%）。

前台共通項目：i18n 語系前綴 ✅、`output: 'standalone'` 與 250MB gate ✅（目前 66MB）、
圖片走 Blob 直連（`unoptimized: true` + 自訂 srcSet）✅、`.swa` 路徑排除 ✅、安全標頭 ✅、
純 SSR 全路由為 `ƒ Dynamic` ✅、sitemap.xml ✅（含 hreflang）、robots.txt ✅（非正式環境整站 Disallow）、舊網址轉址 ✅（middleware，5 分鐘快取）。

---

## 五、後台介面

`apps/admin` 已建立並上線（`/admin`）。**側欄依維護頻率分三群**（日常／內容／進階，
進階預設摺疊），判準見 [docs/15](docs/15-cms-scope.md) §4.4。

⚠️ **動工前必須先啟動 `frontend-design` skill** —— 後台沒有 mockup、沒有設計稿，
是要現場設計的。約束見 [docs/03-cms.md](docs/03-cms.md) §8.1。技術選型：Tailwind CSS + shadcn/ui。

> **視覺方向已定案**（2026-08-18，`frontend-design` skill）：見 [docs/03-cms.md](docs/03-cms.md) §8.1。
> 簽名元素是**完整度儀表** —— 三段軌道 × 雙語系，讓「缺什麼」一眼可見。
> 側欄每項自帶迷你儀表，**因此不做 Dashboard 頁**。

| 畫面 | 狀態 |
|---|---|
| 登入 | ✅ 可運作（含 refresh token 單次使用的併發處理）|
| Dashboard | — 刻意不做，改由側欄儀表取代 |
| 頁面內容 | ✅ 可運作 —— 表單由 `GET /admin/page-schema/{key}` 動態生成<br>**19 個區段、6 個 pageKey**（2026-08-28 收斂，見 [docs/15](docs/15-cms-scope.md)）；10 種 `x-fieldType` 全支援；richtext 走 TipTap（lazy chunk）<br>清單只列這 6 頁，其餘 12 頁由 `GET /admin/pages` 濾掉（2026-08-30，見 [docs/15](docs/15-cms-scope.md) §9）—— 那些頁的版面文案與頁頂 band 寫死在前端 |
| 產品列表 | ✅ 可運作（搜尋／狀態篩選／分頁／完整度儀表）|
| 產品編輯 | 🟡 可運作（雙語分頁、三個 repeater、圖庫＋主圖、使用情境照、部位／認證多選、尺寸表編輯器、發布／取消發布、`rowVersion` 併發、移除語系）<br>2026-08-31 補上**相關產品**：搜尋加入、上下箭頭排序、移除，空著時說明會自動挑選。<br>⚠️ **排序用箭頭不是拖曳** —— 後台沒有任何拖拉互動，為一份最多 8 筆的清單引進 dnd-kit 要付打包體積（[docs/03](docs/03-cms.md) §8.1）；`Repeater` 與圖庫也都是箭頭。<br>待驗：UI 尚未有人在瀏覽器點過（API 端已實測）|
| 分類 / 子分類 | ✅ 可運作，**在「產品」畫面的分頁上**（分類與子分類同一張表、雙語＋SEO、卡片圖／頁首大圖、子分類狀態、`rowVersion` 併發、移除語系）<br>不提供新增／刪除 —— 那等於改全站 URL 結構。改 slug 或換分類會自動產生轉址 |
| 系列 | ✅ 可運作，**在「產品」畫面的分頁上**（三筆固定，雙語名稱與說明、排序、移除語系）|
| 認證 | ✅ 可運作，**位置在「頁面內容 → 關於我們 → 05 認證」**（無獨立畫面）：就地選、就地編輯（標章文字不翻譯、標章圖、狀態、雙語小字與說明）、可新增。區段頂端固定提示與產品頁標章列共用 |
| 應用方案編輯（含人體圖座標選取器） | ✅ 可運作（兩種型態、雙語、三張圖、四組 repeater、推薦產品、發布／取消發布、移除語系、刪除）<br>人體圖選取器：點放／拖曳／方向鍵微調、顯示其他方案的既有座標避免疊圖|
| 文章列表 | ✅ 可運作（型態／狀態篩選、搜尋、分頁、可進編輯頁）|
| 文章編輯 | ✅ 可運作（News/Insights 共用、雙語、封面、標籤、排程發布、活動面板、圖庫、移除語系、刪除）|
| 應用方案列表 | ✅ 可運作（含人體圖旗標與產品數，可進編輯頁）|
| FAQ 列表／編輯 | ✅ 可運作（分類篩選、新增／編輯／刪除、雙語問答、狀態）|
| 下載列表／編輯 | ✅ 可運作（類型篩選、新增／編輯／刪除、PDF 直傳＋登記、`fileLocale` 與介面語系分開）|
| 據點列表／編輯 | ✅ 可運作（台灣／國際分頁、新增／編輯／刪除、地區標籤、未分組標紅）|

| 媒體欄位（無獨立畫面）| ✅ 每個圖片／檔案欄位就地上傳本機檔：尺寸與比例提示、非阻擋警告、alt 輸入格、圖庫可多選依序上傳、**PDF 直傳＋登記**<br>刻意放棄：引用反查、刪除媒體、reprocess |
| ~~導覽選單／轉址／設定~~ | **已移除**（2026-08-29，見 [docs/15](docs/15-cms-scope.md) §7.4／§7.5）|
| 使用者 | ✅ 可運作（角色、停用、重設密碼、解鎖、刪除）|
| 表單收件匣 | ✅ 可運作（依類型／狀態篩選、分頁、詳情對話框、標記已處理／垃圾、CSV 匯出、詳情顯示 reCAPTCHA 分數）<br>不掛完整度儀表 —— 來信沒有翻譯這個維度；側欄改用未處理筆數徽章 |

---

## 六、部署與維運

| 項目 | 狀態 |
|---|---|
| Azure 資源建立（SWA / Function App / Storage） | ✅ `EuniceMedUS` / West US 2 |
| `infra/main.bicep` | ✅ 已部署（13 個資源，含 MI 的 4 個角色指派）|
| `.github/workflows/api-deploy.yml` | ✅ build／publish／deploy／啟動健康檢查皆通過（需 `prod` environment 人工核准）|
| `.github/workflows/web.yml` | ✅ 已部署成功，站台可存取 |
| `.github/workflows/infra.yml` | ✅ 已執行成功（PR 跑 what-if）|
| 自訂網域 + HTTPS | ⬜ 尚未綁 `www.eunicemed.com`。客戶目前看的是 `eunicemed.4webdemo.com`（Cloudflare 代理到同一個 SWA）|
| 平台層 CORS | ✅ `www.eunicemed.com`＋SWA 預設網域＋`eunicemed.4webdemo.com`（客戶測試網址）。⚠️ 後者與 `supportCredentials` 2026-08-31 才從線上補回範本 —— 原本是手動加的，下一次 infra 部署會把它洗掉（後台在測試網址上登入不了）|
| Azure Monitor 告警 | ⬜ |
| 客戶 Azure SQL 連線資訊 | 🔴 待提供 |

本機開發環境 ✅ 可運作，步驟見 [docs/12-local-dev.md](docs/12-local-dev.md)。

---

## 六之二、正式環境狀態（2026-08-19）

**全站已在 Azure 上運作。** <https://zealous-sand-0bdf5e01e.7.azurestaticapps.net>

客戶目前看的是 <https://eunicemed.4webdemo.com> —— Cloudflare 代理到同一個 SWA，
內容與預設網域逐位元組相同（2026-08-31 實測）。**不要與 <https://eunicemed-mockup4.pages.dev> 混淆**，
那個是靜態 `mockup4/` 設計稿，不是前台。

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
| SMTP | **只剩通知信**：2026-08-28 起未設定就跳過寄信，送件照常入庫、收件匣照常看得到。2026-09-01 決議走 Brevo／Resend、寄件網域用自家 `mail.4webdemo.com`（客戶 DNS 加不了 SPF/DKIM），Bicep 與 CI 已接好（[docs/07](docs/07-azure-deployment.md) §6.3），只差開帳號與 Cloudflare 那幾筆記錄 |
| Managed Identity 存取 SQL | 客戶 SQL 尚未設 Entra 管理員，目前用帳密連線字串 |
| 資料庫層級 | Basic 5 DTU；純 SSR 每頁多次查詢，有流量時需評估升級 |
| 內容 | 17 個子分類落地頁文案與 5 筆認證文案仍缺；已上線的 zh-TW 譯文未經客戶審閱（見下方§七）|

---

> **內容現況（2026-08-31，以正式站公開端點實測）**：en 與 zh-TW 皆為 149 產品 / 10 消息 / 8 Insights /
> 3 下載 / 9 FAQ / 6 據點 / 7 應用方案 / 5 認證，六個有 schema 的頁面（home·about·products·partnership·resources·privacy）區段全數有內容。
> 其中 **Insights 的 zh-TW 放的是英文原文**（語言純度的刻意例外，見 [08](docs/08-design.md) §2），
> 產品與消息的中文為機器翻譯**未經客戶審閱**。

## 七、擋住的事項

完整清單見 [CLAUDE.md](CLAUDE.md) §7。當下真正擋住開發的：

| # | 事項 | 擋住 |
|---|---|---|
| 1 | SMTP relay 帳號（Brevo／Resend）與 `mail.4webdemo.com` 的 SPF/DKIM | **只擋通知信，不擋收件** —— 2026-08-28 起表單照常入庫（見 [docs/15](docs/15-cms-scope.md) §1）。設定值見 [docs/07](docs/07-azure-deployment.md) §6.3 |
| 2 | ~~collation~~（已確認 `_CI_`，無問題）；**連線數上限**與**能否設 Entra 管理員**仍待確認 | 部署調校與改用 Managed Identity |
| 3 | 認證文案（5 筆的 SubLabel 與說明目前是佔位） | About 頁與產品頁上線 |
| 4 | 17 個子分類落地頁的敘述文案 | 子分類頁發布（缺文案者不應發布，會是薄內容頁） |
| ~~5~~ | ~~首頁區段的 zh-TW 文案~~ | **已解除**（2026-08-19 譯自英文版並上線；2026-08-28 收斂後只剩 3 支 schema 需要內容）|
| ~~6~~ | ~~149 筆產品的 zh-TW 翻譯~~ | **已解除**（2026-08-19，125 個品名 + 285 句 feature，品牌詞與型號保留英文）<br>⚠️ **譯文未經客戶審閱**，其中 features 屬醫療器材療效宣稱，正式對外前建議由客戶或法務確認 |

| 7 | **2026-08-28 新譯的 zh-TW 版面文案**（About / Resources / Products / Partnership / Privacy 五頁，約 90 條）| ⚠️ 與 149 筆產品譯文同樣**未經客戶審閱**。英文逐字取自 mockup4，中文是新譯的 —— 五頁在此之前 DB 是空的，沒有既有中文可沿用 |
| ~~8~~ | ~~reCAPTCHA~~ | **已解除**（2026-08-31）：v3 已接、金鑰已設（GitHub variable + secret），三支 workflow 皆已部署，正式站生效中 |

> **已解除**：媒體變體階梯（2026-08-17 定案採階梯，見 [docs/11](docs/11-media-specs.md) §2a）—— Phase 3 可開工。

---

## 八、怎麼維護這份文件

1. **完成一項就改一格**，不要累積到最後補。
2. 狀態改成 ✅ 之前，該項必須**實際跑過測試資料**（照 Jabez 慣例：不得只以目視或靜態檢查代替）。
   API 的驗收請求存在 [`Api/http/`](Api/http/)。
3. 只記狀態。**做法寫進 [docs/13-api-roadmap.md](docs/13-api-roadmap.md)、路由寫進 [docs/api-routes.md](docs/api-routes.md)** ——
   同一件事不要在三個地方各寫一份，那會很快互相矛盾。
4. 新發現的坑寫進 13 的「踩到的坑」，不要寫在這裡。
