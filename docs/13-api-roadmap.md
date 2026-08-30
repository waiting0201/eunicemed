# 13 · API 實作路線圖與進度

> 上層導覽見 [CLAUDE.md](../CLAUDE.md)。端點規格見 [04-api.md](04-api.md)、路由契約見 [api-routes.md](api-routes.md)、本機環境見 [12-local-dev.md](12-local-dev.md)。
>
> 進度看 [../STATUS.md](../STATUS.md)。本檔記錄各階段**做什麼、怎麼驗收**，以及**踩到的坑**（最重要的一節，在最下方）。

---

## 進度

**狀態一律記在 [../STATUS.md](../STATUS.md)**，不在本檔重複維護 —— 兩邊各記一份很快就會互相矛盾。
本檔負責的是各階段的**內容、驗收方式，以及累積的踩坑紀錄**。

估時合計約 **33–43 人日**（單人）。規模參考：54 張表、~90 個端點、60 個頁面區段 JSON Schema、14 個媒體 preset。

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

### ✅ Phase 2 — Auth / RBAC / CRUD 骨架

`User` / `Role` / `UserRole` / `RefreshToken`（當初還有 `AuditLog`，2026-08-30 移除，見 [15](15-cms-scope.md) §8）。`AuthHandler`（login / refresh / logout，BCrypt，refresh 單次使用後撤銷）、`JwtService`（照 Jabez，`MapInboundClaims = false`）。
`AppRouter` 的守門方法：`IsPublicRoute` / `GetRequiredRole` / `RequireRole`，外加 EuniceMed 特有的一條 —— **Author 可建草稿但不可發布**。
`/auth/login` 速率限制 + DB 登入失敗鎖定。

**驗收**：[`Api/http/phase2-auth.http`](../Api/http/phase2-auth.http) 全數通過，含 RBAC 矩陣、
token 輪替（單次使用）、帳號鎖定與解鎖、改密碼撤銷所有 session、三項自我保護（不能停用／降權／刪除自己）。

> `rowVersion` 併發衝突（409）延後到 Phase 4 —— `Collection` 依 docs/05 §1 沒有 `ROWVERSION` 欄位，
> 要等有該欄位的實體（`Product` / `Article` 等 6 張表）才驗得到。`ExceptionMiddleware` 已接好
> `DbUpdateConcurrencyException → 409`。

### ✅ Phase 3 — 媒體管線（SkiaSharp）

`Media` / `MediaVariant` / `MediaUsage`。`Media/media-presets.json`（13 個 preset，已建立）+ `GET /admin/media-presets`。
`ImageService`（SkiaSharp）：依 preset 寬**等比只縮不放** → WebP q78 + 原格式 → 去 EXIF、轉 sRGB、檔名正規化加短雜湊 → 寫 Blob（master / variants / 原檔進 `media-originals`）。
硬拒絕 415/413/400 與非阻擋 `warnings[]` 兩套規則（[11](11-media-specs.md) §4）。SVG 清洗（僅 `logo-mark` 收 SVG）。

**驗收**：[`Api/http/phase3-media.http`](../Api/http/phase3-media.http)。實測通過：
415/400/413 硬拒絕、aspect_mismatch 與 oversized 警告不阻擋、
引用反查、有引用時 DELETE 回 409、PDF 走 SAS、
**前端頁面 48 個圖片 URL 全部 200**。

**尚未完成**：`reprocess` 端點。SVG 清洗與 `MediaUsage` 自動重建已於 Phase 5 補上。

### ✅ Phase 4 — 分類 + 產品

`Category` / `SubCategory` / `Certification` / `BodyPart` / `Tag` 與其 translation、join 表；`Product` 全家族（8 張關聯表）。
公開端點含 **facets**、三段所有權驗證、`stats[].value == "auto"` 代入實際產品數、相關產品自動遞補。
`Data/Seed/LegacyProductImporter.cs` 匯入 `reference/legacy/products.json`（149 筆）。

> ⚠️ 該檔 17 個 key 中有 **6 個帶 `-1` 後綴**（`knee-support-1`、`back-support-1`、`wrist-support-1`、`stockings-for-venous-therapy-1`、`travel-stockings-1`、`diabetic-socks-1`），必須去除才對得上 [05](05-database.md) §4 的 `SubCategory.Slug`。

**已完成**：全部實體與設定（含 8 張關聯表）、3 支 migration、seed（3 分類 / 17 子分類 / 5 認證 / 7 部位，皆含雙語翻譯）、
Dapper 讀取層、`FacetFolder`、公開端點（products 列表+facets、三段路徑、by-slug、categories、sub-categories、certifications）、
相關產品自動遞補、`POST /admin/products/import`。驗收見 [`Api/http/phase4-products.http`](../Api/http/phase4-products.http)。

**Phase 4 剩餘已完成**（驗收：[`Api/http/phase4-admin.http`](../Api/http/phase4-admin.http)）：
後台產品 CRUD（含 publish / unpublish / related）、後台分類／子分類／認證／部位、
產品詳情的 `images` 與 `bodyParts`、`rowVersion` 併發 409 的實測。

實作時定案的四件事：

- **null 與空陣列是兩件事**。`images: null` 是「這次不動它」、`images: []` 是「清空」。
  少了這個區分，只想改個名稱的請求會把所有關聯洗掉 —— 而後台表單分頁載入時很容易只送一部分欄位。
  可為 null 的 FK（子分類／系列／使用情境圖）因為 null 已被佔用，另以 `clearSubCategory` 之類的旗標表達清空。
- **關聯除了 `related` 以外全部內嵌在同一個 payload**。產品表單是一次存檔，
  關聯拆成獨立端點會讓一次存檔變成多次請求，中途失敗就留下半套資料。
  `related` 獨立是因為它在後台是另一個畫面，且空陣列在那裡有特殊語意（回到自動計算），
  混進主 payload 會與「這次沒帶這個欄位」分不出來。
- **寫入時就驗證子分類屬於指定分類**。不驗的話資料存得下去，但 `/products/{cat}/{sub}/{slug}`
  會永遠 404，而編輯者只會看到「明明已發布卻打不開」。同理，子分類底下有產品時不可換分類（409）。
- **刪除一律先擋引用回 409，不做連帶清除**，與媒體庫的引用保護同一套規則。
  例外是產品自己的軟刪除：那時必須連帶清掉 `ProductRelated` **兩側**與 `MediaUsage`，
  否則其他產品的相關產品區會指向一個消失的產品，且被刪產品的圖永遠刪不掉。

**已驗收通過**：
- facet 同維度不收斂：篩 `category=orthopedic-support` 後 categories 仍回全部三類（60/45/44），
  subCategories 收斂到該分類的 7 筆
- 三段歸屬：錯 category 或錯 sub 皆回 404
- 語言純度：產品只有 en 翻譯時，`locale=zh-TW` 回 404
- 匯入冪等：空庫連跑三次 → 149 / 149 / 149，slug 全唯一

### 🟡 Phase 5 — 頁面區段 + JSON Schema registry（機制完成，schema 待量產）

`Page` / `PageSection` / `PageSectionTranslation`。`SchemaRegistry`（embedded resource，**lazy per key**）。`JsonSchema.Net` 驗證 → JSON Pointer 錯誤。`x-localeInvariant` 跨語系同步。`SectionMediaWalker`。`refs` 解析。`PageSectionSynchronizer`。

**已完成**：`Page`/`PageSection`/`PageSectionTranslation`、`PageSchemaRegistry`（lazy per key）、
`JsonSchema.Net` 驗證含 JSON Pointer 錯誤、`SectionWalker`（schema 驅動）、
`x-localeInvariant` 跨語系同步、`refs` 解析、`MediaUsageWriter` 自動重建、
`PageSectionSynchronizer`（啟動時自動跑 + 維護端點）、`about` 的 6 個 schema。

**驗收**：[`Api/http/phase5-pages.http`](../Api/http/phase5-pages.http) 全數通過。

**2026-08-18 補**：媒體 **preset 比對**。schema 一直有 `x-mediaPreset` 宣告版位要哪個尺寸，
但沒有人比對過 —— square 的圖存得進 16:9 的欄位，前台裁切後編輯者只會覺得「圖怪怪的」。
JSON Schema 表達不了這條（要查 `Media.PresetKey`），所以在 `PageHandler` 內比對，
錯誤照既有慣例以 JSON Pointer 開頭。**這是後加的規則，既有資料不會被回溯檢查**，
只在下次存檔時才擋。

**2026-08-18**：`home` 的 **7 個 schema 已完成**並隨首頁切版一起驗過。

**2026-08-18**：`products` 的 **2 個 schema**（`hero` / `cta`）已完成並隨產品總覽頁驗過。
docs/09 §4.1 的表列 4 列，但 `categoryCards` 與 `catalogue` 是**純動態**、沒有可編輯欄位，
因此不需要 schema —— 「區段數」與「schema 數」不是同一個數字。

**2026-08-18**：`partnership` 4、`resources` 5、`privacy` 2，共 **11 個 schema 完成**並隨三頁一起驗過。
同一輪補上 `ref:Article` 與 `ref:Download` 的解析 —— 在此之前 `ResolveRefsAsync` **只認 `Certification`**，
`refs` 裡的 `articles` / `downloads` 兩個桶永遠是空的。

**尚未完成**：其餘 **34 個 schema**（`product-category` 3、`contact` 3、各模板共用文案…）。這是內容形狀的工作，機制已就緒，照 `about` 的 6 個複製即可。
richtext 的伺服器端淨化與 SVG 清洗**已完成**（見下）。

### ✅ Phase 6 — 文章 / FAQ / 下載 / 據點 / 應用方案

**公開端點已完成並實測**（驗收：`Api/http/phase6-content.http`）：20 張表、13 個端點。
`Article` 全家族（含共用 PK 的 `NewsEvent`）、`ArticleCategory`、`Faq`、`Download`、`SalesLocation`、`Application` 皆已建表並 seed。

實作時定案的三件事：

- **`toc`** 由 body 的 H2 伺服器端推導，**並把 anchor id 回填進回傳的 body**（`Services/TocBuilder.cs`）。只回 toc 不改 HTML 的話前端會跳到不存在的錨點 —— 兩件事必須同一個函式做。既有 id 沿用、同名標題加序號、CJK 標題退回 `section-N`。
- **排程發布**：`PublishedAt` 為未來時間者，列表與詳情都查不到（詳情回 404）。依 docs/03 §3「排程發布」。
- **應用方案的 `productCount`** ＝「`ProductApplications` 手動關聯 ∪ 同 `BodyPart` 的產品」。只認前者的話，149 筆匯入產品在編輯者逐一掛完之前每個部位頁都顯示 0，而那正是上線初期的狀態。

**後台 CRUD 已完成**（驗收：[`Api/http/phase6-admin.http`](../Api/http/phase6-admin.http)）：
文章／文章分類／活動面板／圖庫／應用方案／FAQ／FAQ 分類／下載／據點，共 43 條路由。

實作時定案的四件事：

- **排程發布補上了寫入端**。讀取端在上一輪就會濾掉未來時間的文章，但後台當時沒有欄位
  可以設那個時間，等於功能只有一半。`UpsertArticleRequest` 加了 `publishedAt`，
  而 `/publish` 用 `??=` 而非直接指派 —— 直接指派會把編輯者排好的時間覆寫成「立刻」，
  是那種按下去看起來成功、但排程默默消失的錯誤。
- **`ArticleCategory.Kind` 必須等於 `Article.Type`**，由應用層驗證（複合 FK 才表達得了）。
  不擋的話 insight 可以掛到 news 分類下，公開列表兩邊都照 `Type` 撈 ——
  那篇文章會出現在側欄的分類計數裡，點進該分類卻找不到。
- **人體圖座標在寫入時驗形狀**（`{hotspot:{cx,cy},chip:{cx,cy}}`，四個值皆為數字），
  且 `showOnBodyMap` 為 true 卻沒有座標時擋住發布。少一個值前端會拿到 NaN
  而整張人體圖靜默不顯示，編輯者只會看到「發布了但沒出現」。
- **沒有草稿工作流的模組，寫入要 Editor+ 而非 Author+**（FAQ、FAQ 分類、下載、據點、文章分類）。
  它們沒有發布端點，`status` 是 payload 裡的一個欄位、存檔即生效 ——
  開放 Author 寫入的話他只要建立時送 `status=1` 就直接上線，等於繞過「Author 不可發布」。
  有草稿工作流的模組維持 Author+：POST 一律建為草稿、PUT 不碰 `status`、發布只能走 `/publish`。

順帶把三支後台 handler 共用的零件抽成 `Handlers/AdminWrite.cs`
（語系白名單、rowVersion 比對、FK 存在性檢查、status 解析）。抽出的判準是
「每支都會原封不動複製一次，且複製錯了會靜默壞掉」；**沒抽**各自的欄位套用與翻譯 upsert ——
那些看起來像，其實每個實體欄位都不同，硬泛型化只會換成一堆反射與 lambda。

### 🟡 Phase 7 — 表單 / 設定 / 選單 / 轉址 / sitemap

**已完成**（驗收：[`Api/http/phase7-site.http`](../Api/http/phase7-site.http)）：
`MenuItem` / `Redirect` / `Setting` 三組資料表與 7 支端點、前端的 sitemap.xml、robots.txt 與轉址 middleware。

實作時定案的四件事：

- **選單整棵樹一次取代**，不做逐項 CRUD。搬移一個節點是「改 parent + 改兩邊排序」，
  拆成多次請求會在中途留下順序錯亂的狀態。限兩層 —— 更深的樹版型渲染不出來。
- **轉址路徑一律正規化**（補開頭 `/`、去尾斜線、比對不分大小寫）。
  不正規化的話 `/old` 與 `/old/` 是兩條規則，而 middleware 只會命中其中一條。
  自我轉址回 400（無限迴圈）、重複來源回 409。
- **sitemap 的語系判定共用 `PageHandler.IsRenderable`**，不是 SQL 的「翻譯列存在」。
  跨語系同步會為未翻譯的語系補建只含圖片的列，用 SQL 判會把那些頁面當成有內容 ——
  等於在 sitemap 裡宣告一堆點進去是空白的網址。詳見下方踩坑。
- **前端 middleware 的轉址表要快取**（5 分鐘）。middleware 在每一次導覽都跑，
  逐次打 API 會把後端請求量放大到與流量同級。取不到時**放行不擋** ——
  轉址是錦上添花，後端掛掉時使用者應該還能瀏覽網站。

**尚未完成**：`POST /contact`（先入庫再寄信）、MailKit、表單收件匣、`ContactSubmission` 資料表。
全部擋於 🔴 **SMTP 主機／帳密／每日寄送上限**（CLAUDE.md §7）—— 寄送上限會回頭決定速率限制的數字。

### ⬜ Phase 8 — 部署 · 2–3 天

`.github/workflows/api-deploy.yml`（照抄 Jabez：`dotnet publish` → `azure/login@v2` OIDC → `Azure/functions-action@v1`；Flex Consumption 不支援 publish profile）。
`infra/main.bicep`（SWA Free、Flex plan + Function App、Storage 三容器、SQL 以 `existing` 參照）。
平台層 CORS 設 `https://www.eunicemed.com` —— **不要在 worker 內自己寫 CORS**，平台會先攔 `OPTIONS`，會變成雙重 header。

---

## 踩到的坑（累積記錄）

### 2026-08-18 · 只在建立時能填的欄位，之後就永遠改不了

媒體的 `altText` 只有 `POST /admin/media` 的 multipart 表單能設定 ——
沒有任何更新端點。上傳時漏填、或後來發現寫錯，就只能刪掉重傳
（而有引用的圖根本刪不掉，回 409）。

alt 是無障礙的必要欄位，不是可有可無的備註。做媒體庫畫面時，
「編輯 alt」這個最基本的操作無法實作才發現。已補 `PATCH /admin/media/{id}`。

這與翻譯「只進不出」是同一族的問題：**建立路徑做完了，維護路徑沒做**。
之後每加一個實體，除了 create 之外要一併問「這個欄位事後改得了嗎、刪得掉嗎」。

### 2026-08-18 · 「未帶到 = 不動它」讓翻譯只進不出

後台的翻譯 upsert 一律是「只處理 request 帶到的語系，未帶到的維持原狀」——
這條規則是對的，它防止前端只送 en 就把 zh-TW 洗掉。

但它也表示**沒有任何途徑可以刪掉一個語系**。編輯者加錯語系、或想表達
「這個產品不提供中文版」時，只能去改資料庫。做產品編輯頁時才發現這件事：
畫面上「移除此語系」的按鈕根本無法實作。

解法是讓 null 帶有明確語意：`{"zh-TW": null}` = 刪除，未提到 = 不動它。
與這個專案已經在用的「null 與空陣列是兩件事」是同一套思路。
另加一條保護：**刪到一個語系都不剩時回 400** —— 那筆內容會在前台每個語系都消失，
而後台列表只顯示名稱，它會變成一列空白，難以辨認也難以救回。

⚠️ **目前做了 `Product`（`{"zh-TW": null}`）與頁面區段（`DELETE …?locale=`）。**
其餘模組（分類／子分類／認證／文章／應用方案／FAQ／下載／據點）同樣只進不出，
各自的編輯畫面做到時要一併補上。

頁面區段那次更明顯：schema 驗證要求必填欄位，所以**連「存成空的」都做不到** ——
新增了一個語系就再也拿不掉。做「頁面內容」畫面時，那顆「移除這個語系」的按鈕
根本無法實作，才發現的。

順帶一提，前端也不能只把 key 從狀態裡拿掉就送出 —— 那在後端是「沒提到」，
使用者按了移除、畫面上不見了，重整之後又回來。要明確送 null。

### 2026-08-18 · Tailwind v4 拿掉了 `[--var]` 簡寫，而它是**靜默**失效的

公開站從第一天就寫 `bg-[--color-tint]`、`text-[--color-brand-deep]`、
`max-w-[--container-content]`，共 **309 處**。Tailwind v3 支援這個簡寫，**v4 移除了**。

它不會報錯，會產生：

```css
.bg-\[--color-tint\]{background-color:--color-tint}
```

`--color-tint` 是一個裸的自訂屬性**名稱**，不是 `var(--color-tint)`。
瀏覽器判定為無效宣告、直接丟棄。也就是說**整個公開站的品牌色、底色、細線
從頭到尾都沒生效** —— 十幾頁切下來都是這樣。

為什麼一路沒發現：我只驗過 HTML 結構（class 名稱有出現、元素有渲染），
從沒在瀏覽器裡看過畫面，環境裡也沒有截圖工具。**「class 出現在 HTML 裡」
不代表「這條規則有作用」** —— 樣式要驗產出的 CSS，不是驗 HTML。

正解是用 v4 由 `@theme` 自動產生的具名 utility：`bg-tint`、`text-brand-deep`、
`max-w-content`。比 `[--var]` 短、也不會再有這種靜默失效。

順帶：後台的建置產物原本輸出到 `apps/web/public/admin`，被公開站的 Tailwind
掃進來，於是又產生一批同樣無效的 class。該目錄已加進 `.gitignore` ——
v4 會自動排除被 gitignore 的路徑。

**檢查方式**：`grep -c '{[a-z-]*:--[a-z-]*}' .next/static/css/*.css` 應為 0。

### 2026-08-18 · 同一個判準寫兩次，sitemap 就會宣告空白頁

sitemap 的靜態頁那半原本在 Dapper 讀取層，用 SQL 判「該語系有沒有 `PageSectionTranslation` 列」。
結果首頁被標成雙語 —— 但中文首頁其實是**完全空白**的。

原因是跨語系同步（`syncInvariantFields`）會為尚未翻譯的語系補建**只含圖片與連結**的列。
公開端點早就知道這件事，用 `IsRenderable`（看 schema 的 `required`）擋掉那種列；
sitemap 卻自己寫了一套「列存在就算有」的判準。

這是 2026-08-17 那條「列存在不等於可公開渲染」的**第二次發作**，換了個地方。
修法是把靜態頁那半移出 Dapper、改用同一個 `IsRenderable` —— 判準只能有一份。
**凡是「這個東西在該語系算不算存在」的問題，都要指向同一個函式。**

### 2026-08-18 · 語言純度也包含標點

法務頁寫 `{c.lastUpdated}：{date}`，冒號直接寫死成全形「：」。
中文頁看起來正常，**英文頁就變成 `Last updated：2026 · 08 · 01`** —— 一個中文標點。
應用方案頁的 `Best for：` 也一樣。

docs/08 §5.2 的語言純度講的是「英文版不得出現中文」，實務上很容易只想到**字**，
忘記**排印**：冒號、引號、括號、間距在中英文是不同的字元。
分隔符要跟著文案一起放進語系表，不要寫在 JSX 的兩個插值中間。

### 2026-08-18 · 「同一組 keyframes + 負 delay」錯開輪播是行不通的

首頁 hero 輪播想做成純 CSS：一組 keyframes，各張以 `animation-delay` 錯開。
寫完看起來會動，但只在某個特定張數下正確。

原因是那個技巧要求每張 slide 在動畫週期的**同一個位置**顯示，
而各張的顯示窗其實是 `[i/n, (i+1)/n)` —— 位置本來就不同。
硬把百分比寫死，換成 2 張或 5 張就會出現全黑或兩張疊著的空窗，
而那要等編輯者換了張數才會發現。

改成**依張數在伺服器端產生 keyframes**（n ≤ 5，最多 10 個小區塊）。
張數是渲染時就知道的，產生 CSS 不需要 client JS。

### 2026-08-18 · 語言純度在首頁會留下一片空白

中文首頁目前是**完全空的**：7 個區段都只有 en 翻譯，語言純度把它們全濾掉，
而首頁沒有「退回上一層」可言。內頁缺翻譯回 404 是合理的，首頁不能 404，
於是就渲染出一個只有頁首頁尾的殼。

這不是程式問題，是**內容缺口**，但它的表現形式（HTTP 200 的空白頁）
比 404 更難在測試中被注意到。已列進 STATUS 的擋住事項。
動態區塊（精選產品、最新消息）刻意也一起隱藏 —— 沒有標題的裸格線比空白更糟。

### 2026-08-18 · schema 宣告了規則，不代表有人在檢查

About 頁是全站第一個吃 `GET /pages/{key}` 的頁面。切版時把六個區段的內容灌進去驗形狀，
順手把一張 `square` 的圖填進 `about.manufacturing.imageWide`（schema 標明要 `wide-16x9`）——
**API 收下了**。

`x-mediaPreset` 從 Phase 5 就寫在 schema 裡，但 JSON Schema 本身表達不了「這個 UUID 指向的
媒體必須是某個 preset」（要查 DB），而沒有人補那一段。結果是版位規格形同註解。

教訓不是「漏了一個檢查」，而是：**schema 裡的 `x-` 自訂關鍵字全都要有對應的執行者**，
否則它只是文件。量產剩下 54 個 schema 之前，值得先把 `x-fieldType` 的每一種值
（media / richtext / repeatable / ref…）都確認有人在讀。

順帶一提，這條規則加上去之後，**既有資料不會被回溯檢查** —— 舊資料只在下次存檔時才被擋。
先前塞錯的兩張圖是手動清掉的。

### 2026-08-18 · 不帶 Z 的 datetime2 丟給 `new Date()` 會差一天

文章的 `publishedAt` 序列化後是 `2026-08-02T00:00:00` —— **沒有 Z**，
因為 DB 存的是 `datetime2` 且全站慣例是 UTC（`Api/Common/Clock.cs`）。
JS 的 `new Date('2026-08-02T00:00:00')` 會把它當**本地時間**解讀，
在 UTC+8 顯示時整篇文章的日期會早一天。

前端的日期格式化因此完全不進 `Date`，直接切字串取 `YYYY-MM-DD`
（`apps/web/lib/date.ts`）。這種只顯示日期、不做時間運算的欄位，
字串處理比時區換算安全 —— 一旦進了 `Date`，就得在每個顯示點都記得補時區。

### 2026-08-18 · `??` 接不到空字串，而 API 回的「沒填」多半是空字串

銷售據點的國際分組，未填 region 的一組由 API 集中放在最後。前端寫

```tsx
{group.region ?? '其他地區'}
```

結果那一組渲染出一行**空白標題** —— `RegionLabel` 在 DB 是 nullable，
但實際資料（後台送空字串、seed 也填空字串）進來是 `""`，`??` 只接 null 與 undefined。

**凡是「沒填就給預設」的文字，用 `||` 或先 `trim()`，不要用 `??`。**
`??` 只適合數字與布林那種「0 / false 是有效值」的欄位。

### 2026-08-18 · 法務文字不要放在會消失的區段裡

應用方案的醫療免責原本寫在「如何選擇與穿戴」那一段的結尾 —— 照 mockup4 的版面就是那個位置。
但區段是**有內容才渲染**的，而中文頁的 `howTo` 還沒翻譯，於是整段連免責一起不見了。

免責是法務要求的固定文字，未填時還有模板預設 —— 它不該跟著任何一個內容區段的存亡走。
已移到區段之外獨立渲染。**凡是「一定要出現」的文字，都不能巢狀在條件渲染的區塊裡**，
即使版面上它看起來屬於那一段。

### 2026-08-18 · 函式不能當 prop 傳進 client component

產品詳情頁的文案表照既有頁面的做法放在 server component，其中一項是
`thumb: (n) => \`View image ${n}\``。把它傳給圖庫（client component）時整頁 500：

```
Functions cannot be passed directly to Client Components unless you
explicitly expose it by marking it with "use server".
```

多語系文案表很容易混進這種模板函式，而它在 server 端自己用完全沒事 ——
只有跨邊界那一刻才炸。**client component 一律傳 `locale` 進去、在裡面查自己的文案表**，
不要把 server 的文案表拆成一堆字串 prop 硬塞。

### 2026-08-18 · 壞掉的 JSON body 會回 500 而不是 400

`req.ReadFromJsonAsync<T>()` 在反序列化階段丟 `JsonException`
（少逗號、GUID 欄位塞了非 GUID 字串都算），那時還沒進到 Handler 的驗證，
`ExceptionMiddleware` 也沒接住 —— 客戶端拿到 500，會以為是伺服器壞了而不是自己送錯。
已在 middleware 補上 `JsonException → 400`。

發現的過程也值得記：測試腳本用 zsh 寫 `set -- $M` 想拆開三個 media id，
但 **zsh 預設不對未加引號的參數展開做 word splitting**，
三個 id 連成一個字串塞進 `mediaId`，才撞出這個 500。

### 2026-08-19 · Flex Consumption 沒有 Application Insights 就起不來（方案前提被實測推翻）

部署成功、資源正常、程式碼在本機用正式設定 4.2 秒跑完啟動 —— 但雲端上
**每一個請求都不回應**，`/admin/host/status` 回 500，trigger 同步失敗。

二分法把範圍砍到見底：

| 測試 | 結果 |
|---|---|
| 我們的 API（.NET 10、DB、DI） | ❌ |
| 最小 hello-world（.NET 10，無 DI 無 DB） | ❌ 完全相同 |
| 最小 hello-world（.NET 8 + 1.x worker 套件） | ❌ 完全相同 |
| 砍掉整個 Function App 重建 | ❌ 完全相同 |
| storage 允許共用金鑰 / `AzureWebJobsStorage` 改連線字串 | ❌ |
| `maximumInstanceCount` 10 → 40 | ❌ |
| 部署儲存體驗證 MI → 連線字串 | ❌ |

最後是**跟同訂用帳戶四個正常運作的 Flex app 逐項比對設定**才找到：
它們全都有 `APPLICATIONINSIGHTS_CONNECTION_STRING`，我們沒有 —— 因為方案明文排除它。
其中 `func-20skin-api-prod` 連部署驗證都跟我們原本一樣是 SystemAssignedIdentity，照樣正常，
所以那不是差異點。

**Flex Consumption 的主機記錄管線就掛在 App Insights 上，缺了它 host 起不來 ——
而且正因為缺的是記錄管線本身，失敗完全沒有訊息。**

兩個通則：

1. **「不裝可觀測性」不是可以省的成本，在某些 PaaS 上它是執行前提。**
2. 卡在無訊息的失敗時，**跟一個已知正常的同型資源逐項比對設定**，比繼續猜快得多。

### 2026-08-18 · 連線字串的 App Setting 鍵名，文件與程式碼不一致

`docs/07 §6.1` 從頭到尾寫 `Sql__ConnectionString`，Bicep 也照著設；
但 `Program.cs` 讀的是 **`ConnectionStrings:DefaultConnection`**（與 local.settings.json 一致）。

結果：部署成功、app 顯示 Running、TLS 連得上，**但每一個 HTTP 請求都不回應** ——
因為 host 在 `HostBuilder.Build()` 就丟了
`InvalidOperationException: ConnectionStrings:DefaultConnection is required.`，
連 `/admin/host/status` 都 500。

找到它的方法不是看雲端 log（本案沒有 App Insights，Flex Consumption 也沒有其他
可讀的啟動記錄），而是**把正式環境的 App Settings 灌進本機跑一次**：

```bash
CS=$(az functionapp config appsettings list -g EuniceMedUS -n func-eunicemed-prod \
      --query "[?name=='ConnectionStrings__DefaultConnection'].value" -o tsv)
Sql__ConnectionString="$CS" dotnet bin/Release/net10.0/EuniceMed.Api.dll
```

0.1 秒就印出真正的錯誤。**沒有雲端 log 的環境，這是最快的路。**

### 2026-08-18 · `dotnet publish` 不指定 RID，會把三個 Windows 版的 SkiaSharp 符號檔一起送上雲

Function App 部署成功但 host 完全不回應（連 `/admin/host/status` 都 500），
查下去發現部署包 **162MB**、publish 產物 **477MB**，其中 446MB 是 `runtimes/`：

| 檔案 | 大小 |
|---|---|
| `runtimes/win-x86/native/libSkiaSharp.pdb` | 88MB |
| `runtimes/win-x64/native/libSkiaSharp.pdb` | 86MB |
| `runtimes/win-arm64/native/libSkiaSharp.pdb` | 83MB |

Flex Consumption 每次冷啟動都要下載並解壓那個包，而 app init 是 **30 秒硬上限** ——
包太大就永遠起不完，症狀是「TLS 連得上、HTTP 永遠不回應」。

`dotnet publish -c Release -r linux-x64 --self-contained false` 之後是 **44MB**，
`libSkiaSharp.so` 仍在（那才是正式環境要用的那顆）。

**任何有原生相依的 .NET 專案，publish 一律指定 RID。**

同一輪也修了 smoke test：`curl` 沒有 `-m`，app 掛住時那一步跑了 15 分鐘還沒結束，
而不是在五分鐘內失敗。**輪詢式的健康檢查，每一發都要有逾時。**

### 2026-08-19 · Flex Consumption 的 runtime 版本是 `10.0`，不是 CLI 列出來的 `10`

**這一則推翻了它前一天的版本。** 當時看到 404 就去查
`az functionapp list-flexconsumption-runtimes`，它回 `10`，於是把 Bicep 從 `10.0` 改成 `10` ——
**改錯方向**。`10` 之後症狀從 404 惡化成「完全不回應」。

正確值是 **`10.0`**：`az functionapp create` 自己填的是 `10.0`，
同訂用帳戶所有正常運作的 Flex app 也都是 `10.0`。CLI 那份清單列的是 runtime 的
「主版本」標籤，不是 `functionAppConfig.runtime.version` 該填的字串。

**教訓：拿一個已知正常的同型資源 `az resource show` 出來對，比查文件或 CLI 清單可靠。**

### 2026-08-18 · GitHub OIDC 的 subject 不是文件上那個格式

`azure/login@v2` 第一次就失敗：
`AADSTS700213: No matching federated identity record found for presented assertion subject
'repo:waiting0201@5709750/eunicemed@1338215425:ref:refs/heads/main'`。

Microsoft 與 GitHub 的文件都寫 `repo:{owner}/{repo}:ref:refs/heads/main`，
但實際送出的 subject 把**帳號 ID 與 repo ID** 也放進去了
（`owner@ownerId/repo@repoId`）。查 `GET /repos/{o}/{r}/actions/oidc/customization/sub`
會看到 `use_default: true` 但 `sub_claim_prefix` 已經是帶 ID 的形式 —— 沒得關掉。

所以 federated credential 的 subject 要照**實際 log 裡那一行**建，不要照文件抄。
本案建了三條：`:ref:refs/heads/main`、`:environment:prod`、`:pull_request`。

順帶一提，`environment: prod` 的 job 送出的是 `:environment:prod` 而**不是** ref 那條 ——
少建這一條的話，部署 job 會過不了登入，而 what-if job 卻正常，看起來像是權限問題。

### 2026-08-18 · SWA 的打包器不跟隨符號連結，而 pnpm 的 node_modules 幾乎全是連結

部署在「Zipping Api Artifacts」階段失敗：
`An error occurred while zipping the api artifacts: Could not find file
.../node_modules/react. This error may be due to a broken symbolic link.`

那個連結其實沒有壞（指向 standalone 樹內的 `.pnpm/react@19.2.8/...`），
只是 SWA 不跟隨它。

**第一個修法是錯的**：把連結展開成實體檔案（`cp -RL`）之後打包過了，但站台起不來 ——
`Cannot find module 'styled-jsx/package.json'`。pnpm 的相依是靠 **realpath 的兄弟目錄**
找到的：`node_modules/next` 原本連到 `.pnpm/next@…/node_modules/next`，
它的相依就在同一層；一旦變成實體目錄，Node 往上找就只剩 standalone 根的 node_modules，
那裡沒有 `styled-jsx`。體積也從 62MB 漲到 136MB。

**正確做法：CI 以 `NPM_CONFIG_NODE_LINKER=hoisted` 安裝。**
產出的是 npm 那種扁平實體目錄，standalone 產物 0 個符號連結、68MB、server 起得來
（本機實測 `/.swa/health.html` 回 200）。只在 CI 這樣做 ——
本機保留 pnpm 的嚴格佈局，才擋得住 phantom dependency。

### 2026-08-18 · `skip_app_build` 會讓 SWA 不再幫你放健康檢查頁

SWA 用 `GET /.swa/health.html` 驗證站台起得來，**而那一頁是它在自己執行 build 時
才注入的**（官方文件寫在「Configure routing and middleware for deployment」那節）。

我們自己 build（`skip_app_build: true`，因為 pnpm workspace 的 Oryx 建置不可靠），
於是那一頁從來不存在 → 探測 404 → 部署以
`Web app warm up timed out. Please try again later.` 失敗。
訊息完全不指向健康檢查，而且前面每一步都顯示成功。

修法是自己在 `apps/web/public/.swa/health.html` 放一頁。
**兩件事都要**：middleware 的 matcher 要排除 `.swa`（早就做了），
以及那一頁真的要存在（這次才發現）。

### 2026-08-18 · csproj 裡的反斜線讓專案在 Linux 上根本 build 不起來

`<EmbeddedResource Include="PageSchemas\**\*.json" />` 在 macOS 與 Windows 都正常，
第一次跑 CI 就以 `error MSB3552: Resource file "**/*.resx" cannot be found` 失敗。

反斜線在 Linux 不是路徑分隔符，glob 比對不到任何檔案。而**正式環境（Flex Consumption）
與 CI 都是 Linux** —— 也就是說在推上 GitHub 之前，這個專案從來沒有在它真正要跑的
作業系統上編譯過。改成正斜線即可（三個平台都通）。

順帶一提：本機 SDK 是 10.0.103、runner 是 10.0.400，`global.json` 的
`rollForward: latestFeature` 讓兩邊都跑得起來 —— 但也代表**本機通過不等於 CI 通過**。

### 2026-08-18 · 「改用 Managed Identity」寫在文件裡，程式碼只吃連線字串

`docs/07 §6.2` 從一開始就寫著 Blob 與 SQL 走 MI，但 `BlobStorageService`
只讀 `cfg["BlobStorageConnection"]`，而且**讀不到就退回 `UseDevelopmentStorage=true`**。
照文件寫的 App Settings（`Storage__AccountName` + MI）部署上去，正式站會啟動成功、
上傳成功，然後圖片網址指向 `127.0.0.1:10000`。沒有任何錯誤。

改成：有連線字串就用（本機 Azurite），否則以 `ManagedIdentityCredential` 連
`Storage__AccountName`；**兩者都沒有就在建構子丟例外**，不再默默退回 Azurite。

連帶挖出兩件只會在正式站出現的事：

1. `blob.GenerateSasUri` 需要帳戶金鑰。MI 沒有金鑰，要改用 **user delegation SAS**
   （`GetUserDelegationKeyAsync`）。原本的程式碼在這條路上直接丟
   「需改用 user delegation key」的例外 —— 也就是說 PDF 直傳在正式環境從來不會成功。
2. 簽 user delegation key 需要 **Storage Blob Delegator** 角色，
   而 **Blob Data Owner 不包含它**。少了這一個角色指派，圖片一切正常、只有 PDF 失敗，
   而本機因為用連線字串所以永遠測不出來。

通則：**本機與正式的憑證方式不同時，那條路徑就等於沒有測試。**
這種差異要嘛寫進 IaC 一起管（現在的做法），要嘛就別在文件裡承諾。

### 2026-08-18 · 編輯器的工具列就是一份沒人維護的第二白名單

TipTap 上線後，`section` profile 的工具列必須剛好等於伺服器允許的
`p / strong / em / ul / ol / li / a`。多給一顆 H2 按鈕不會報錯 ——
編輯者按了、存了、伺服器把 `<h2>` 剝掉但（因為 `KeepChildNodes = true`）留下文字，
存回來變成 `Heading<p>Body</p>`：標題掉了、文字還在段落外面。實測確認就是這個結果。

所以 `RichText` 的 profile 名稱刻意與 C# 的 `RichTextProfile` 完全一致
（`section` / `article` / `legal`），改白名單時兩邊會一起被搜到。

同一輪確認的兩件事：
1. 淨化器會替外部連結補上 `rel="noopener noreferrer" target="_blank"`，
   所以存回來的 HTML 與編輯器送出的**不會逐字相同** —— 不要拿它做 dirty 比對。
2. `AllowedSchemes` 只有 https / mailto / tel，`http://` 的 href 會被整個拿掉只剩文字。
   編輯器的連結對話框因此先擋下 `http://`，不然那是一個沒有任何訊息的失敗。

### 2026-08-18 · prettier 沒有設定檔就不是「照原樣格式化」

在 `apps/admin` 跑了一次 `npx prettier --write`，它把兩支檔案的單引號全換成雙引號 ——
專案沒有 `.prettierrc`，而 prettier 的預設 `singleQuote: false` 與這個 codebase 相反。
diff 乾淨（只有引號），所以 review 時很容易放過，之後每個人的編輯器又會各自改回去。

已補上根目錄的 `.prettierrc`（單引號、100 字寬、trailing comma all）。
**規則：沒有設定檔的格式化工具不要對既有檔案跑。**

### 2026-08-18 · 有關聯表、有篩選參數，卻沒有任何方式建立那筆資料

`Article.TagIds` / `Product.TagIds` 寫得進去、`GET /news?tag=` 也篩得動，
但 **`Tag` 沒有任何後台端點** —— 不能列、不能建、不能改。
編輯者能做的只有勾選 seed 裡那兩個標籤，其餘永遠不存在。

這與「讀取端做完、寫入端沒入口」是同一個病的第三種變形：
這次連 CRUD 都沒有，而每一支既有端點都測得過。
**判斷準則：每一張使用者看得到的實體表，都要答得出「誰在哪個畫面建立它」。**

補 `TagHandler` 時又踩到軟刪除的老問題：`ArticleTag` 帶
`HasQueryFilter(x => !x.Article.IsDeleted)`，所以「這個標籤還被幾篇文章用」數出來是 0，
但那些關聯列實際還在資料庫裡 —— 刪除因此在 `SaveChanges` 撞 FK，回 500 而不是說得清楚的 409。

**有軟刪除時，引用檢查要從主表數，不要從關聯表數**：
`db.Articles.Count(a => a.Tags.Any(...))` 才是「還看得到的引用」。
數完之後剩下的關聯列都屬於已刪內容，刪之前一併 `IgnoreQueryFilters().ExecuteDeleteAsync()` 清掉。

### 2026-08-18 · SAS 直傳只做了一半：檔案上得去，但沒有人幫它建那一列

`POST /admin/uploads/sas` 產生寫入 SAS 讓 PDF 直傳 Blob（避免大檔佔用 Function），
Phase 3 就驗收過了。但 `Download.MediaId` 指向的是 **Media 資料表的一列**，
而 PDF 的路徑完全繞過 `MediaHandler.UploadAsync` —— 那一列從來不會被建立。

結果是：`GET /admin/media?presetKey=document` 永遠回空陣列，
下載模組的「選擇檔案」永遠沒東西可選，整個模組在後台是死的。
而三支端點各自測都會過。

補上 `POST /admin/uploads/register`：驗證 blob 真的存在（前端可能在上傳完成前就呼叫）、
**大小取自 blob 本身**而不是前端回報的數字、同檔名重覆登記回既有那筆
（兩列指向同一個檔案時，刪其中一列會把另一列的檔案一起刪掉）。

通則：**一條跨越系統邊界的流程，要從頭到尾走一次才算驗收。**
這次是 API → Blob → API，斷點正好落在兩段之間，任何單點測試都看不到。

### 2026-08-18 · 有 `Status` 欄位不等於後台能改它

子分類與認證都有 `Status`，但它們**沒有** `/publish` 端點 —— 狀態只是 upsert 請求裡的
一個欄位。後台第一版只在列表上畫了 `StatusTag`，看得到卻改不了：
一個被設成草稿的子分類，連同它的 SEO 落地頁一起從前台與 sitemap 消失，
而後台沒有任何地方能把它救回來。

這是「讀取端做完、寫入端沒入口」的同一個病，只是換了方向：
**這次是 API 有、UI 沒有**。判斷準則一樣 —— 每個會影響前台可見性的欄位，
都要問「編輯者在哪一個畫面、按哪一個東西可以改它」。

順帶記下兩種發布模型不要長成同一個樣子：產品／文章的發布是獨立動作
（Author 存得了草稿、發布不了，所以是按鈕 + 專屬端點），
子分類／認證的狀態跟著存檔一起送（所以是下拉）。UI 形狀不同是刻意的。

### 2026-08-18 · 讀取端做完的功能，寫入端可能根本沒有入口

排程發布在 Phase 6 的讀取端就實作好了（`PublishedAt` 為未來時間者公開端點查不到），
`.http` 也驗過。但後台的 `UpsertArticleRequest` 從頭到尾沒有 `publishedAt` 欄位 ——
也就是說**沒有任何方式可以設定那個時間**，功能只有一半，而讀取端的測試完全驗不出來
（它是直接改 DB 造出未來時間的資料）。

驗收一個橫跨讀寫的功能時，要從**編輯者的動線**走一遍，而不是分別測兩端：
「我要怎麼讓一篇文章在下週二上線？」——問得出這句話就會發現缺口。

同一輪還發現 `/publish` 若寫成 `entity.PublishedAt = Clock.Now` 會把已排程的時間
覆寫成立刻上線。必須是 `??=`。

### 2026-08-18 · 授權規則寫 `(_, [...])` 會連 GET 一起擋掉

`GetRequiredRoles` 是由上而下比對的 list pattern，加一條

```csharp
(_, ["admin", "categories", ..]) => Editors,
```

想表達「分類要 Editor 以上才能改」，實際效果是**連讀都要 Editor**：
它排在通用的 `("GET", ["admin", ..]) => null` 之前，method 的 `_` 把 GET 也吃了。
後果是 Author 打開產品表單時拿不到分類清單，表單根本填不出來 —— 而這在只用 Admin
帳號測試時完全看不出來。正確寫法是把 method 明確排除：

```csharp
(not "GET", ["admin", "categories", ..]) => Editors,
```

**每加一條角色規則，都要用該角色實際打一次 GET 與一次 PUT**，不能只測會擋的那一邊。
同一輪也發現 `POST /admin/products/import` 的 handler 註解寫著「Admin 專屬（由 AppRouter 把關）」，
但 `AppRouter` 從來沒有那條規則，實際是 Author+ —— 註解不是規則，已補上。

### 2026-08-18 · publish / unpublish 也會推進 rowVersion

測併發 409 時「拿到 rowVersion → 發布 → 用同一個 rowVersion 存檔」會得到 409，
看起來像併發偵測壞了，其實是對的：發布也是一次 `SaveChanges`，`ROWVERSION` 已經前進。
測 4b/4c 那組要**先重讀一次**再送。後台前端同理 —— 按下發布之後必須用回傳的
`rowVersion` 覆蓋表單裡那份，不然編輯者接下來每次存檔都會撞 409。

新發現請往下加，附日期。這一節是給未來的自己與新對話看的。

### 2026-08-17 · `Locale` 參數型別

DB 的 `Locale` 是 `varchar(10)`。若 EF/Dapper 送 `NVARCHAR` 參數，SQL Server 會在欄位側加隱含轉換，`UX_*Tr` 索引失效，每個公開請求變成掃描 —— **不會有任何錯誤訊息，只會慢**。
處置：EF 設 `.HasColumnType("varchar(10)").IsUnicode(false)`；Dapper 用 `DbType.AnsiString`。驗證方式見 [12-local-dev.md](12-local-dev.md) §7。

### 2026-08-17 · 兩份 JSON 設定都要寫

`Program.cs` 必須同時設 `services.Configure<JsonOptions>`（管 `IActionResult` 輸出）**和** `services.ConfigureHttpJsonOptions`（管 `req.ReadFromJsonAsync` 輸入）。只設一個會造成輸入輸出命名規則不對稱。Jabez 也是兩個都設。

### 2026-08-17 · Clock 刻意與 Jabez 不同

Jabez 的 `Clock.Now` 回台北時間；本專案回 **UTC**，因為 [05](05-database.md) §1 規定 `datetime2` 存 UTC，且這是對外多語系網站。要顯示營業時間時才用 `Clock.Taipei(utc)`。**從 Jabez 複製程式碼時注意這個差異。**

### 2026-08-17 · 淨化要在驗證之前，且 script 的內容不能當文字留下

兩個順序／細節問題：

1. **淨化必須排在 schema 驗證之前。** 淨化會改變內容長度（移除標籤），
   先驗後淨的話，通過 `maxLength` 的是淨化前的版本，而實際存下去的是淨化後的 ——
   等於存了一份沒被驗過的內容。
2. `KeepChildNodes = true` 是要的（`<h2>標題</h2>` 被移除時「標題」要留下），
   但它會讓 `<script>alert(1)</script>` 變成可見內文 `alert(1)`。
   安全上無害，但等於讓攻擊者把任意字串顯示在頁面上。
   處置：先用 AngleSharp 整棵移除 script / style / template / noscript，再交給 HtmlSanitizer。

淨化與媒體一樣**由 schema 驅動**（`x-fieldType: "richtext"`）——
新增 richtext 欄位時不需要去某個清單登記，漏登記就是一個 XSS 破口。

### 2026-08-17 · 跨語系同步必須補建語系列，而「列存在」不等於「可公開渲染」

`x-localeInvariant` 同步初版只推給**已存在**的語系列。但編輯者的實際流程是
「填完英文 → 勾同步 → 切到中文分頁」，那時中文列還不存在，於是永遠同步不到 ——
而那正是這個功能要消除的成本（docs/05 §3.7 rule 1：挑兩次圖）。

改成補建列之後出現第二個問題：只含圖片與連結、還沒翻譯的列會讓該區段
在公開端點半空地渲染出來。

解法是**用 schema 自己當渲染閘門**：公開端點只回 `required` 欄位都有非空值的區段。
不需要額外狀態、不會與 schema 脫節，而且語意剛好正確 ——
「內容不足以構成一個區段」與「還沒翻譯」本來就該是同一件事。

### 2026-08-17 · 第三次命名空間撞名

`SchemaRegistry` 與 `JsonSchema.Net` 的 `Json.Schema.SchemaRegistry` 同名。
這已經是第三次（`Json` vs `System.Text.Json`、`Media` 命名空間 vs `Media` 實體）。
**取名前先想一下該名稱是否可能與所依賴套件的公開型別衝突**，
尤其是 `Json`、`Media`、`Schema`、`Registry` 這類通用詞。
現名 `PageSchemaRegistry`，語意上也更精確。

### 2026-08-17 · 消費端不應該自己拼媒體檔名

前端原本照 preset 階梯推導 `-1200.webp` 這類檔名。但縮圖是**只縮不放** ——
來源 1000px 的圖丟 square(1200) 欄位，1200 那階實際產出的是 1000px 的檔案。
猜出來的名字必然 404，而且**只有在來源圖小於 preset 寬度時才會發生**。

兩處都改了：
1. `ImageService` 一律以**實際輸出寬度**命名並去重（多個階可能塌到同一寬度）。
2. 公開端點回 `variants` 清單，前端照著用。**耦合直接消除，不是靠註解提醒。**

### 2026-08-17 · SKCodec.Create(Stream) 會接管並關閉該 stream

`ImageService` 初版把同一個 `MemoryStream` 先給 `SKCodec.Create` 判尺寸、
之後再讀 `ms.Length` → `ObjectDisposedException`。
處置：一律先取 `byte[]`，再用 `SKData.CreateCopy(bytes)`，所有後續操作都從那裡出發。

### 2026-08-17 · 本機重啟服務要確認 PID 換了

改完程式、rebuild、重啟，結果行為完全沒變 —— 因為舊的 `node server.js` 還占著 3000，
新程序 `EADDRINUSE` 當場死掉，而我一直在跟舊版說話。
**`curl` 回 200 只證明「有東西在聽」，不證明那是你剛 build 的東西。**
處置：用 `lsof -nP -tiTCP:{port} -sTCP:LISTEN` 取 PID 比對，或直接檢查 log 有無 `EADDRINUSE`。
（與先前把 `DELETE` 的錯誤導到 `/dev/null` 是同一類錯誤：把「沒看到失敗」當成「成功」。）

### 2026-08-17 · facet 計數必須與列表用同一組條件，否則數字會騙人

`GetFacetRowsAsync` 初版沒 join 翻譯表，理由是「產品是否存在與語系無關」——**那是錯的**。
facet 數字對使用者的意思是「點下去會看到幾筆」，而列表因語言純度會濾掉缺該語系翻譯的產品。
結果中文站的篩選 chip 顯示「膝 16」，點進去格線空無一物。

這個 bug **只有實際用中文開頁面才看得出來** —— 單看 API 回應、單看英文站都正常。
規則：**任何與列表並列的計數，其 WHERE 條件必須與列表查詢逐字一致。**

### 2026-08-17 · `generateStaticParams` 會讓「純 SSR」悄悄變成 build 時靜態化

在 `app/[locale]/layout.tsx` 加了 `generateStaticParams` 之後，`next build` 把首頁
預先渲染成靜態 HTML（build 輸出標成 `● SSG` 而非 `ƒ Dynamic`）。
本站沒有 revalidation webhook（docs/04 §7 刻意不做），一旦被靜態化，
後台發布的內容要等下一次部署才看得到 —— 而且不會有任何錯誤。
處置：改用 `export const dynamic = 'force-dynamic'`，並**以 build 輸出的 `ƒ` 標記作為驗收條件**。

### 2026-08-17 · pnpm workspace 會讓 standalone 產物巢狀，SWA 文件的指令是錯的

SWA 文件給的 standalone 後處理指令是
`cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/`，
那假設非 monorepo。在 pnpm workspace 下，`server.js` 實際在
`.next/standalone/apps/web/server.js`，上述指令會把檔案複製到沒人讀的地方，
結果是**部署後 CSS 與字型 404、但 build 完全成功**。

**2026-08-18 更新：巢狀確實要消掉，但不能用 `outputFileTracingRoot` 消。**

先講為什麼要消：**SWA 找的就是 `.next/standalone/server.js`**。巢狀的話它找不到入口，
部署會走到最後才以 `Deployment Failure Reason: Web app warm up timed out` 失敗 ——
那句訊息不會提到路徑。

第一次嘗試是在 `next.config.ts` 設 `outputFileTracingRoot: __dirname`。產物確實變平坦，
而且從 68MB 掉到 **3.7MB** —— 看起來像天大的優化，其實是**空的**：
pnpm 的相依都在 workspace 根的 `.pnpm` store，tracing 根一縮，那些檔案就在範圍外，
Next 只留下指向 standalone 之外的符號連結。SWA 打包時直接失敗：
`Could not find file .../node_modules/react. This error may be due to a broken symbolic link.`

**產物突然變小，要先當成壞掉而不是變快。**

正確做法：tracing 根維持 repo 根（相依會真的被複製進來，樹內的符號連結 SWA 打包得動），
再由 `apps/web/scripts/pack-standalone.mjs` 在 postbuild 把那兩層壓平，
並在壓平後檢查 `server.js` 真的在根目錄 —— 這個檢查就是為了不要再讓同一個症狀
拖到部署最後一分鐘才出現。

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

當時的 `AuditLogInterceptor`（已隨稽核紀錄移除）用 `IHttpContextAccessor` 取操作者，
結果寫進去的 `UserId` **永遠是 null**。原因是它靠 ASP.NET Core hosting layer 設定的 AsyncLocal，
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
