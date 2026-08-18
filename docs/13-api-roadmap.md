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

**尚未完成**：其餘 **54 個 schema**（`home` 7、`products` 4、`partnership` 4、`resources` 5…，
共 18 頁 60 個區段）。這是內容形狀的工作，機制已就緒，照 `about` 的 6 個複製即可。
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

### ⬜ Phase 7 — 表單 / 設定 / 選單 / 轉址 / sitemap · 3–4 天

`POST /contact`（**先入庫再寄信**，SMTP 失敗仍回 201）、MailKit、收件匣、`menus`（整棵樹 diff）、`redirects`、`settings`、`sitemap`。

### ⬜ Phase 8 — 部署 · 2–3 天

`.github/workflows/api-deploy.yml`（照抄 Jabez：`dotnet publish` → `azure/login@v2` OIDC → `Azure/functions-action@v1`；Flex Consumption 不支援 publish profile）。
`infra/main.bicep`（SWA Free、Flex plan + Function App、Storage 三容器、SQL 以 `existing` 參照）。
平台層 CORS 設 `https://www.eunicemed.com` —— **不要在 worker 內自己寫 CORS**，平台會先攔 `OPTIONS`，會變成雙重 header。

---

## 踩到的坑（累積記錄）

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
正確路徑寫在 `apps/web/package.json` 的 `postbuild`，該 script 同時跑 250MB gate。

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
