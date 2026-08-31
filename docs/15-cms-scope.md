# 15. 後台可編輯範圍決議

> 2026-08-28 第一次收斂（§1–§6）、2026-08-29 第二次收斂（§7）。
> 本檔是「哪些內容進 CMS、哪些回程式碼」的**單一真相來源**。
> 新增或移除任何 `Api/PageSchemas/*.json`、或在側欄加一個模組之前，先讀這份。

---

## 1. 為什麼要做這次收斂

後台當時已經做完 19 個模組、109 條 admin 端點、17 個側欄項目。問題不在做不完，在**做的比例不對**：

**唯一每天會用的功能沒做。** 表單收件匣（`ContactSubmission`）DB 表、路由、UI 全缺，三支前台表單從 2026-08-19 起一直是壞的；同時，3 筆分類、3 筆系列、5 筆認證、7 個部位各自佔著一個完整的 CRUD 畫面與側欄位置。

**六個有 CMS 區段的頁面，只有首頁真的有內容。** 打正式站核對的結果：

| 頁面 | 線上實際渲染 |
|---|---|
| `/en/about` | eyebrow + h1，story / milestones / values / manufacturing / certificates 六段全 `null` |
| `/en/resources` | 完全空白 |
| `/en/partnership` | 只有「Partnership」一個字 |
| `/en/privacy` | 完全空白 |
| `/en/products` | 只有 API 來的產品，hero 與頁尾 CTA 皆空 |

而 STATUS.md 把這 18 頁全記成「✅ 已切版可運作」—— 切版是對的，內容從來沒人填過。

**留在 CMS 的版面文案會走鐘，而且已經走過兩次。** `home.heroIntro` 被填成舊站的 hero（`cfbfb80` 修掉）；`home.whyPartner` 被填成 Company Profile PDF 的核心價值，而不是 mockup4 的 `A team your business can truly count on`。兩次都不是誰的疏忽 —— 一個開著的欄位就是一個會被填的欄位。

順帶查到兩個既存的正式站 bug，都由這次改動一併修掉：

1. **`home.featuredProducts` 存不進去。** DataJson 裡留著 `allLink`，schema 早已移除該欄位，而 25 支 schema 全是 `additionalProperties:false` —— 編輯者一按儲存就 400，錯誤還指向畫面上看不到的欄位。
2. **英文首頁的 CTA 連到中文頁。** `bodyPartBand.cta.url` 與 `promo.link.url` 在 EN 都是 `/zh-TW/…`：URL 標了 `x-localeInvariant` 被當成跨語系共用欄位，中文內容匯入一跑就把英文版蓋掉。

---

## 2. 判準

**問題不是「這是頁面還是實體」，而是「這個欄位改了會不會撞壞版型」。**

### 進 CMS
- **圖片**（media）—— preset 已鎖住比例，換圖不會壞版；而換形象照是很自然的維護動作
- **引用清單**（`ref:Download` / `ref:Article` / `ref:Certification`）—— 策展行為：這次要露出哪幾份
- **會隨檔期／時間變的文案** —— 首頁輪播、客戶見證、里程碑年份、法務條文

### 回程式碼
- **區段標題**（`Hero products`、`Latest news`、`Recently published`）
- **版面標籤與 `allLink`**（`All news →`、`All downloads →`）
- **固定 CTA 的按鈕文字**（`Contact us`、`Submit inquiry`）
- **品牌宣言**（核心價值、合作優勢）—— 改它等於改品牌，不是改內容
- **等同導覽的東西**（Resources 的四大入口卡就是次導覽的四個去處，而次導覽本來就明訂不可編輯，見 [09](09-page-blocks.md) §0.2）

### 連結一律不進 CMS
就算區段留下來，**URL 也在渲染時就地組 `/${locale}/…`**。這是上面第 2 個 bug 的根治方式：`x-localeInvariant` 用在 URL 上是設計錯誤，本次以「連結不存進 CMS」規避，沒有修 `SyncInvariant` 本身。

---

## 3. 逐支裁決（25 → 19）

### A. 整支刪除（6 支）—— 純版面文案，無 media 無 ref
`home.whyPartner`、`home.latestNews`、`about.values`、`resources.hero`、`resources.hubCards`、`resources.ctaPanels`

### B. 只留圖片欄位（6 支）
| schema | 留 | 移出 |
|---|---|---|
| `about.hero` / `partnership.hero` / `products.hero` / `privacy.hero` | `band` | eyebrow / title / lead |
| `home.bodyPartBand` | `background` | title / lead / cta / 四個 tiles |
| `products.cta` | `background` | title / body / 兩顆按鈕 |

### C. 保留但刪掉標籤欄位（7 支）
| schema | 留 | 移出 |
|---|---|---|
| `home.featuredProducts` | `promo` | `title` |
| `about.milestones` | `background`, `items` | `title` |
| `about.manufacturing` | 兩張圖, `points` | `title` |
| `about.certificates` | `items` | `title`, `lead`, `cta` |
| `resources.quickDownloads` | `items` | `title`, `allLink` |
| `resources.recentlyPublished` | `mode`, `items` | `title`, `allLink` |
| `partnership.becomePartner` | 其餘 | `submitLabel` |

### D. 完全不動（6 支）
`home.heroSlider`、`home.testimonial`、`about.story`、`partnership.oemOdm`、`partnership.distributor`、`privacy.content`

> `about.story` 保留了它的 `title`，與 C 類的判準不一致。理由是它與 RTE 內文是同一段文字，
> 編輯者改故事時本來就會一起改標題。這是個刻意的例外，不是漏掉的。

### 正式放棄
[09](09-page-blocks.md) 規格上未實作的 **12 頁 / 約 32 個區段**（`labels`、`cta`、`hero` 之類）。
那 12 頁的前台文案早已寫死並上線運作，改記為定案而非欠債。

---

## 4. 連帶的技術決定

### 4.1 在讀取邊界修剪，寫入端維持嚴格
`SectionWalker.PruneUnknown` 在 `PageHandler.AdminGetAsync` 與 `GetPublicAsync` 兩處把 schema 已不存在的欄位剪掉。

- **為什麼要剪**：同步器只比對檔名，看不到欄位；DB 裡的 DataJson 不會跟著 schema 收斂。後台把整包舊資料載進表單、`SchemaForm` 的 `onChange({ ...value })` 原封送回、撞上 `additionalProperties:false` → 400。
- **為什麼不在寫入時剪**：那會把「多餘欄位 → 400」從防呆變成靜默丟棄。
- **為什麼公開端點要剪在 `IsRenderable` 之前**：沒有 `required` 的 schema 會走 `data.Count > 0` 這條 fallback，只剩髒欄位的區段會被誤判成有內容。
- 遞迴方向與 `WalkCore` **相反**（以 data 為主）—— schema 驅動的走訪永遠看不到「schema 裡沒有」的鍵。

### 4.2 `required` 要跟著 properties 收縮
`required` 不會自動跟著走。留一個 properties 裡沒有、又被 `additionalProperties` 禁止的名字，那支區段會**永遠存不進去**。

只剩圖片的區段一律拿掉 `required`：`IsRenderable` 退回 `data.Count > 0`，沒放圖就不回傳，而 `PageBand` 本來就 `if (!image) return null`，視覺結果相同。

### 4.3 gate 從「區段物件」改成「真正的內容」
收斂後 `about.certificates`、`resources.quickDownloads` 的欄位**全部是 `x-localeInvariant`**，缺該語系翻譯列時 `GetPublicAsync` 會整段不回。所以前台一律寫成：

```tsx
{certItems.length > 0 && …}     // 而不是 {certificates && …}
```

### 4.4 側欄依「多久會動一次」分三群
判準與既有的角色規則同源：改動會不會波及全站 URL 或屬系統管理。

```
日常     表單收件匣 · 產品 · 文章 · 頁面內容
內容     應用方案 · FAQ · 下載 · 銷售據點 · 媒體庫
進階 ▸   分類與子分類 · 系列 · 認證 · 導覽選單 · 轉址 · 設定 · 使用者
```

「進階」預設摺疊。

> ⚠️ **這一段已被 §7 取代**（2026-08-29）：17 項降為 9 項，「進階」整群消失。
> 保留原文是為了讓下面那節的「為什麼又改一次」讀得懂。

---

## 5. 已知殘留

- **`SyncInvariant` 走不進陣列**：`ReadPath`/`WritePath` 只處理 `JsonObject`，所以 `tiles[].link.url` 這類陣列內的 invariant 欄位其實同步不到。本次沒修 —— 連結已不在 CMS 裡，這條路徑目前沒有使用者。
- **頁面內容的完整度儀表語意變弱**：`sectionLevels` 的判準之一是 `已填欄位數 >= required.length + 1`，`required` 變短之後會更容易滿分。要精準需改成逐 schema 計算，本次不動（會在同一個 PR 裡混進第二件事）。
- **`x-localeInvariant` 用在 URL 上是設計錯誤**，本次以「連結不進 CMS」規避而非修復。

## 6. 這次沒有做的

- **reCAPTCHA**：v3 已接（2026-08-31）。**低分不擋件**，只把該筆狀態記成 `spam` 並跳過通知信 —— 收件匣既有的狀態篩選就是複核介面，詳情頁多一列分數說明「為什麼被標成垃圾」。金鑰未設定時整段跳過，表單照常運作。
- **媒體 reprocess**：低頻操作，需要時走 `.http`。
- **標籤管理畫面**：API 保留，文章編輯裡照樣能掛標籤。
- **部位新增／刪除**：7 筆固定，只能改名與排序。


---

## 7. 第二次收斂（2026-08-29）：側欄 16 → 9

### 7.1 這次的判準不是「多久動一次」，是「在哪裡改」

§4.4 把側欄依編輯頻率分群，那解決了「今天要做什麼」的問題，
但沒解決另一個：**同一件事被拆在兩個畫面**。

最刺眼的是認證。編輯者在「頁面內容 → 關於我們 → 05 認證」看到的是一個下拉選單，
選的是 slug；標章文字、說明與標章圖要跑到「進階 → 認證」改，改完再走回來。
資料庫上這是兩張表沒錯，但對編輯者而言那是同一件事：**「把關於我們那一段的認證弄好」**。

新的判準：**一個單元的內容，在它露出的地方維護。**

```
日常   表單收件匣 · 產品 · 文章 · 頁面內容
內容   應用方案 · FAQ · 下載 · 銷售據點
帳號   使用者
```

九項，沒有摺疊群組。

### 7.2 逐項裁決

| 原側欄項 | 去向 | 理由 |
|---|---|---|
| 認證 | → 頁面內容 → 關於我們 → 05 認證，就地編輯 | 它只在那一頁與產品頁露出，沒有獨立存在的理由 |
| 分類與子分類 | → 產品畫面的分頁 | 是產品的屬性，不是另一個模組 |
| 系列 | → 產品畫面的分頁 | 同上 |
| 媒體庫 | → 刪除，改成每個欄位就地上傳 | 見 §7.3 |
| 導覽選單 | → 刪除，寫進 `SiteHeader` / `SiteFooter` | 見 §7.4 |
| 轉址 | → 刪除，改成 slug 變動時自動建規則 | 見 §7.5 |
| 設定 | → 刪除，寫進 `apps/web/lib/company.ts` | 見 §7.4 |

「認證就地編輯」由 `SchemaForm` 的 `case 'ref'` 依 `x-refEntity` 分流
（`CertificationRefField`），**不是**在 `PageEdit` 開一個 about 專用分支 ——
逐頁自訂面板一旦開了頭，schema 驅動就不再成立。

⚠️ 認證是**共用的**：同一筆同時餵 About 的認證帶與產品頁的標章列。
就地編輯反而更容易讓人以為只影響這一頁，所以區段頂端固定印一行共用關係的提示。

> `resources.quickDownloads`（ref:Download）與 `resources.recentlyPublished`（ref:Article）
> 維持下拉。那兩者的擁有者本來就是側欄上的一級項目，不像認證是藏在「進階」裡的孤兒。

### 7.3 媒體庫：上傳回到欄位

**改之前**：`ImageField` / `ImageList` / `FileField` 一律開一個對話框列出既有 blob，
圖不在庫裡時它直接叫編輯者離開（「請先到媒體庫上傳」）。全站唯一的
`<input type="file">` 在媒體庫那一頁。填一個欄位要離開表單再走回來。

這**本來就偏離 [03](03-cms.md) §6** —— 那裡寫的流程一直是欄位層級的
（「上傳格顯示該欄位 preset 的建議尺寸 → 選檔 → `POST /admin/media`」）。

**改之後**：每個欄位一顆「選擇圖片」開系統選檔視窗，選完直接帶 `presetKey` 上傳並套用。
`components/MediaField.tsx` 的三個元件 props 不變，13 個呼叫點一行沒改
（`UploadResult extends MediaItem`）。

**每個上傳欄位下方一律顯示尺寸與比例提示**（[11](11-media-specs.md) §1.1 的硬性要求）。
整句由後端 `MediaPreset.Hint(locale)` 產生，前端只放 `<PresetHint presetKey>` ——
所以新增欄位只要指定 `presetKey`，提示自動出現。以前這句話藏在對話框標頭裡，
對話框一拆就必須落回欄位。

**刻意放棄的兩件事**：

- **引用反查**：`MediaUsage` 仍由 `MediaUsageWriter` 在每次存檔時重建（伺服器端照常運作），
  只是沒有 UI 讀它。
- **刪除媒體**：孤兒圖會留在 Blob。儲存成本可忽略，而 409 引用保護本來就在伺服器端。

alt 文字沒有放棄 —— 它移到欄位裡（縮圖旁的輸入格，離開焦點時 `PATCH /admin/media/{id}`）。
全站的 `<img alt>` 都取自 `Media.AltText`，那是不能一起丟掉的。

### 7.4 導覽與設定：本來就沒在用

`MenuItem`、`Setting`、`Redirect` 三張表**從來沒有 seed，線上是空的**。
`SiteHeader` / `SiteFooter` 一直在跑自己的 `FALLBACK` 常數，Contact 頁一直在跑
自己的預設值 —— 所以「可以在後台改」是個沒兌現的承諾，還讓同一份地址散在兩處。

- 導覽 → `SiteHeader` / `SiteFooter` 的 `NAV` 常數。這與 §2「等同導覽的東西回程式碼」
  是同一條判準：主選單本來就該和 Resources 次導覽一樣寫死。
- 公司資訊 → `apps/web/lib/company.ts`（地址／電話／信箱／營業時間／LinkedIn）。
- `seo.defaultTitle` / `seo.defaultDescription` 兩個鍵**從來沒有消費者**（`layout.tsx` 寫死），
  直接消失。

**順手修好的線上缺漏**：頁尾的 LinkedIn 連結原本靠 `social.linkedin`，
沒有 fallback，所以線上頁尾根本沒有那一條（mockup4 有）。現在是常數，連結回來了。
⚠️ 網址目前是推定值，待品牌方確認。

`GET /menus`、`GET /settings` 與兩組 admin 端點一併移除；
`MenuItem` / `Setting` 的**資料表與實體保留**（刪表要走「擴張→遷移→收縮」三支 PR，收益為零）。

連帶：`layout.tsx` 是 `force-dynamic`，每個請求都會跑 —— 現在每頁少兩次 API 往返。

### 7.5 轉址：從「一個畫面」變成「一個副作用」

轉址不是一種內容。沒有編輯者會為了樂趣去新增一條規則，他們只會改 slug，
然後在幾個月後才發現舊連結壞了。

`Api/Services/RedirectWriter.cs` 在下列改動發生時自動寫 301：

| 改動 | 影響的網址 |
|---|---|
| 產品 slug／分類／子分類 | 該產品的四段網址 |
| 文章 slug／type | `/news/{slug}` ↔ `/insights/{slug}` |
| 分類 slug | 分類落地頁 ＋ 其下所有子分類頁 ＋ 其下所有產品 |
| 子分類 slug 或換分類 | 子分類落地頁 ＋ 其下所有產品 |

⚠️ **`Redirect.FromPath` 存的是含語系前綴的完整路徑**（middleware 先轉址、再補語系前綴），
所以每次改動都要**逐語系各寫一條**。

`FromPath` 有唯一索引，所以既有規則是**更新**而不是插入：A→B 之後再改成 C，
結果是 A→C。同時把任何指向舊路徑的規則一起改指新路徑，避免 A→B→C 兩段跳轉。

**兩個原本擋著的操作因此解禁**（它們的註解都寫著「轉址要人工判斷」）：

- 已發布的文章不能改 `type`
- 底下還有產品的子分類不能換分類

舊站那份一次性對照（[10](10-legacy-content.md) §10）仍走 `Api/http/phase7-site.http`，
admin 的轉址端點為此保留，只是沒有 UI。

### 7.6 已知殘留

- **preset 漂移**：[11](11-media-specs.md) §5.2 說 `Article.CoverMediaId` → `wide-16x9`、
  News 圖庫 → `photo-4x3`，程式碼兩處都是 `content-16x9`。
  舊流程下這只是「篩選看不到某些圖」；**改成就地上傳之後，欄位宣告的 preset
  直接決定實際縮圖尺寸**，所以這條漂移從此是實質的。既有內容是照程式碼的 preset 傳的，
  貿然改反而對不上，本次維持現值待拍板。
- `Download.productIds` 在後台是唯讀顯示，全站沒有地方能編輯這個關聯。
- `RefField` 的 Article 選項固定 `pageSize: 100` 且無搜尋，超過 100 篇會靜默截斷。
- [09](09-page-blocks.md) §429 規劃過以 `settingKey` 取值的 `infoPanel` 區塊 ——
  全 repo 零實作，隨 §7.4 一併記為放棄。

---

## 8. 第三次收斂（2026-08-30）：拿掉稽核紀錄

`AuditLog` 連同 `AuditLogInterceptor` 整組移除，migration `DropAuditLog` 把表刪掉。

**理由**：這是一個內容量固定的形象網站 —— 18 頁版面、149 支產品、四個角色、
編輯者大概不到十個人。稽核紀錄卻是**每一次寫入都長一列，而且沒有任何人會去看**：
沒有 API 端點讀它，後台沒有畫面，也沒有保留期限或清除機制。
一次產品匯入就是上百列，`DataJson` 還把整筆實體的欄位值都存了一份。
它會變成 DB 裡最大的一張表，而它的用途在這個規模上是零。

稽核紀錄要成立，前提是「有人會因為它去追一件事」—— 那需要查詢介面、保留策略、
以及夠多的編輯者讓「誰改的」真的成為問題。三個前提本案都不成立。

**替代**：誰最後改的仍留在 `Product` / `PageSection` 的 `UpdatedBy` / `UpdatedAt`。
真要回溯內容，走 Azure SQL 的備份還原（[07](07-azure-deployment.md)）。

**沒有連帶影響**：`AuditLog` 從來沒有對外的端點，[api-routes.md](api-routes.md) 裡也沒有它，
後台沒有任何畫面讀它。移除只動到 API 內部。

`Services/CurrentUser.cs` **留著** —— 它是「目前操作者」的正解（`IHttpContextAccessor`
在 Functions worker 不會被填充，見 [13](13-api-roadmap.md) 踩坑 2026-08-17），
`AppRouter` 仍在驗證後設定它，之後任何需要操作者的服務都該走它，不要再繞回去。

⚠️ 這是一支**破壞性 migration**（`DROP TABLE`）。目前尚未有正式站，所以直接刪；
若正式庫已有想留的紀錄，套用前先備份 —— 遷移是在 Function App 啟動時自動套用的，沒有攔截點。

---

## 9. 收尾（2026-08-30）：把「不能編輯」變成看不見

§3 把 12 頁的版面文案判回程式碼，但後台當時只是**照列不誤**：
`GET /admin/pages` 回全部 18 列，`routes/Pages.tsx` 對 `sectionCount === 0` 印一顆
「尚未開放編輯」的徽章，tooltip 寫「這一頁的 schema 檔尚未撰寫」。

那句話把**定案**寫成了**待辦**。編輯者（與客戶）唯一合理的反應是每隔一陣子問一次
「那些什麼時候開放」。決議本身沒問題，出口沒收乾淨而已。

### 9.1 6 頁的頁頂 band 其實從來沒上線

收尾時先查到一個真的缺口。mockup4 有 10 頁在頁首放同一條 16:3 的 band，
但 `PageBand` 的圖來源是 CMS 的 `hero.band`，而其中 6 頁
（Applications／FAQ／Insights／News／Downloads／Where to Buy）連 schema 都沒有 ——
**那 6 頁根本沒有渲染 band**，線上是 h1 直接接在頁首下面。

`pnpm --filter web mockup:check` 一直是 100%，因為
[`tools/mockup-diff/page-map.json`](../tools/mockup-diff/page-map.json) 把
`PageBand.tsx` 列進了那 6 頁的檔案清單 —— 檔案在清單裡，宣告就算覆蓋到，
但頁面實際上沒有 import 它。**宣告集合比對證明不了某個元素有被渲染**，
這是這個工具的結構性盲點，不是設定寫錯。

**修法**：band 跟著版面文案一起寫死。三張品牌圖樣進
`apps/web/public/brand/bands/`，由 [`apps/web/lib/bands.ts`](../apps/web/lib/bands.ts)
的 `BRAND_BANDS` 以 `MediaRef` 的形狀提供，所以 `PageBand` 一行都不用改 ——
它不需要知道圖是後台上傳的還是常數。

- 圖樣取自 mockup4 的 A4 母檔（2480×3508）**置中裁 16:3**。mockup4 是拿 1200 寬的
  直式圖交給 `object-fit:cover` 現場裁，可視範圍相同、解析度更高。
- webp 階梯照 `page-band` preset（2560/1600/1200/800），**只縮不放**所以上限是
  裁切後的實際寬度 2480 —— 與 API 產變體的規則一致（[11](11-media-specs.md) §2a）。
- 全部 15 個檔共 288KB。是平塗向量圖樣，webp 每張 1–22KB。

> **about／products／partnership／privacy 的 band 維持後台可換圖**（§3B 的裁決不動）。
> 代價是後台會出現「有些頁能換頁頂圖、有些不能」的不一致，需要在交接時講一句。
> 那四頁的 band 是形象照的版位，這 6 頁的是品牌圖樣，本來就是兩種東西。

### 9.2 清單濾掉沒有區段的頁

`AdminListAsync` 加 `.Where(p => p.Sections.Any(s => s.IsEnabled))`，18 列變 6 列，
`Pages.tsx` 的徽章分支隨之刪除。

判準是**「有沒有啟用中的區段」而不是寫死的名單** —— 哪天補了 schema 檔，
同步器建完列就會自己回到清單上，不必記得回來改這裡。

清單底下留一句 `form-hint`：

> 只列出有內容可以改的頁面。FAQ、下載、銷售據點、應用方案、文章這些頁面的
> 版面文字與頁頂圖固定不變，實際內容在左側各自的項目裡維護。

用側欄上的原字指路。少了 12 列本身不會讓人困惑，**找不到「最新消息」才會** ——
所以這句話要回答的是「我要改的東西在哪」，不是「為什麼少了 12 頁」。
