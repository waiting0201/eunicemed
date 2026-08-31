# 03 · 自建 CMS 規格

> 上層導覽見 [CLAUDE.md](../CLAUDE.md)。資料模型見 [05-database.md](05-database.md)；端點見 [04-api.md](04-api.md)；逐頁區段與欄位見 [09-page-blocks.md](09-page-blocks.md)；**圖片尺寸與縮圖規格見 [11-media-specs.md](11-media-specs.md)**。
>
> **本版為 mockup4 定案版**（2026-08）。核心決策：**固定版型 + 具名欄位**——版面鎖定於 mockup4，後台不提供自由區塊組合器，編輯者只填每個區段的具名欄位。理由與儲存模型見 [05-database.md](05-database.md) §3.7。

---

## 1. 定位

自建後台供內部編輯維護網站內容，**不直接連 DB**，所有操作透過 Functions API 的 `/api/admin/*` 受保護端點。

- 形式：**React SPA（Vite）**，**掛在公開網站同一個 Static Web App 的 `/admin` 路徑下**（部署方案只有一個 SWA，見 [07-azure-deployment.md](07-azure-deployment.md) §1）。無 `admin.eunicemed.com` 子網域。
- 使用者：少量內部編輯/管理者。
- 驗證：JWT（登入取得 access + refresh token）。

> **同一個 SWA 的三個影響**
> 1. 後台打包體積計入 SWA Free 的 **250MB** 上限 —— 重量級套件（RTE、圖表）務必 code-split，`/admin` 全部 lazy load，不得進入公開頁的 bundle。
> 2. `/admin` 為純 client-side 渲染，需 `noindex` 且不進 sitemap；SPA fallback 用 `next.config.js` 的 rewrite（**不可**用 `staticwebapp.config.json` 的 navigationFallback，hybrid 不支援）。
> 3. 後台與前台同網域，但 API 在 `*.azurewebsites.net`，後台的瀏覽器 XHR 屬跨網域 → **Function App 需開 CORS** 允許 `https://www.eunicemed.com`。

---

## 2. 角色與權限（RBAC）

| 角色 | 權限 |
|------|------|
| `Admin` | 全部：使用者管理、所有內容、設定、發布 |
| `Editor` | 建立/編輯/發布 產品、應用方案、文章（News/Insights）、FAQ、下載、據點、頁面內容、媒體 |
| `Author` | 建立/編輯草稿，**不可發布**（需 Editor/Admin 審核發布） |
| `Viewer` | 唯讀（含表單收件匣） |

- 權限在 API 端強制（角色 claim）；前端僅做 UI 隱藏，不可作為安全邊界。

---

## 3. 內容模型（CMS 可管理項目）

> **頁面區段只管會換的東西。** 版面文案（區段標題、`All news →` 這類標籤、固定 CTA 的按鈕字、
> 品牌宣言）一律回到前端常數 —— 改它們等於改 mockup4。判準與逐支裁決見
> [15-cms-scope.md](15-cms-scope.md)，**新增或移除任何 schema 之前先讀那份**。

`＝` 沿用　`＋` 加欄位　`★` 全新

| 模組 | | 說明 | 多語系欄位 |
|------|---|------|-----------|
| **Products 產品** | ＋ | 名稱、slug、**SKU 型號**、分類、**子分類**、Collection、適用部位、症狀、特色（icon + 標題 + 說明）、Use Cases（+ 情境照）、規格、**尺寸對照表**、認證（關聯）、**圖片（一律 1:1，主圖供全站各版位共用）**、關聯下載、**相關產品（人工指定，空則自動）**、**精選旗標**、SEO | 名稱/摘要/描述/特色/情境/規格/尺寸表/精選文案/SEO |
| **Categories 分類** | ＋ | 三大分類：名稱、slug、描述、排序、卡片圖、**hero 圖**、**3 組統計**、**支撐等級說明**、SEO | 名稱/描述/統計/支撐等級/SEO |
| **SubCategories 子分類** | ★ | 17 筆，隸屬分類；**有獨立 URL 落地頁**：slug、名稱、描述、hero 圖、統計、排序、SEO | 名稱/描述/統計/SEO |
| **Collections 系列** | ＝ | Care/Protect/Advance，名稱、描述、強度標籤（系列專色見 [08-design.md](08-design.md)） | 名稱/描述 |
| **Certifications 認證** | ★ | 標章、下方小字、說明、logo、對應認證文件、排序；**About 認證帶與產品頁標章列共用同一份** | 小字/說明 |
| **Applications 應用方案** | ＋ | 型態（依部位/特殊照護）、slug、對應 BodyPart、hero 圖、卡片圖、統計、**常見困擾**、**支撐等級建議**、**如何選擇與穿戴**、穿戴指引圖、**醫療免責**、**人體圖開關與座標**、關聯產品 | 名稱/引言/各清單/免責/SEO |
| **BodyParts 部位** | ＋ | 7 筆；名稱、排序、**是否顯示於人體圖**（僅 4 筆為是） | 名稱 |
| **Articles 文章** | ＋ | 型態（News / Insight）、分類（關聯）、標題、slug、**導言 standfirst**、封面、內文（RTE）、**作者**、**閱讀時間**、發布日、標籤、免責、SEO；News 另有**活動資訊**與**圖庫** | 標題/導言/內文/摘要/作者/免責/SEO |
| **ArticleCategories 文章分類** | ★ | 取代舊 Topic 列舉。`Kind`（news / insight）、名稱、排序、側欄促購卡文案 | 名稱/促購卡 |
| **FAQ 常見問題** | ＋ | 問題、答案（RTE）、**分類（關聯，非自由字串）**、排序 | 問/答 |
| **FaqCategories FAQ 分類** | ★ | 名稱、排序（清單 tab 需顯示筆數） | 名稱 |
| **Downloads 下載** | ＋ | 標題、**說明文字**、檔案（PDF）、類型（型錄/認證文件/使用手冊）、**檔案語言**、關聯產品 | 標題/說明 |
| **SalesLocations 銷售據點** | ＋ | **型態（台灣通路 / 國際經銷）**、國家、名稱、地址、**分店註記**、電話、網址、**地區標籤**、排序 | 名稱/地址/註記/地區標籤 |
| **Pages 頁面區段** | ＋★ | **18 頁**（13 單例頁 + 5 模板頁共用文案）的具名欄位內容；區段不可增刪，只能編輯內容與隱藏整段 | 全部文字（media / 連結可跨語系同步） |
| **Media 媒體** | ＋ | 圖片/PDF（存 Blob）、alt 文字、尺寸規格 preset 與自動縮圖輸出。**沒有獨立畫面** —— 上傳與 alt 都在用到它的那個欄位裡（[15](15-cms-scope.md) §7.3） | alt |
| **ContactSubmissions** | ＝ | 表單收件匣（general/product/partnership，唯讀 + 標記處理） | — |
| ~~Menus 導覽~~ | — | **已移除**：導覽寫在 `SiteHeader` / `SiteFooter`（[15](15-cms-scope.md) §7.4） | — |
| ~~Settings 設定~~ | — | **已移除**：公司資訊寫在 `apps/web/lib/company.ts`（同上） | — |
| **Redirects 轉址** | ＝ | 舊→新 URL 301。**沒有畫面** —— slug 改動時由 `RedirectWriter` 自動寫入（[15](15-cms-scope.md) §7.5） | — |

> 欄位細節對應 [05-database.md](05-database.md) 各資料表；每頁區段與欄位對應 [09-page-blocks.md](09-page-blocks.md)。

---

## 4. 內容工作流（發布狀態）

```
Draft（草稿） ──提交──► Review（待審，選用） ──發布──► Published（已發布）
     ▲                                              │
     └───────────────── 撤回/編輯 ◄─────────────────┘
                                   Archived（下架）
```

- 每筆內容含 `Status`（Draft/Published/Archived）、`PublishedAt`、`UpdatedBy`。
- **發布動作**：API 僅更新狀態為 `Published`；前端為純 SSR，下一次請求即反映，**無需 revalidation**。
- **預覽**：CMS 提供「預覽」連結，前端以 Draft Mode 帶 token 取未發布內容。
- **不做版本／稽核紀錄**：`AuditLog` 已於 2026-08-30 移除（小站，累積的量遠大於它的用途；見 [15](15-cms-scope.md) §8）。
  「誰最後改的」仍留在 `Product` / `PageSection` 的 `UpdatedBy` / `UpdatedAt` 欄位。

> **頁面區段（Page / PageSection）沒有 Draft 狀態**——儲存即生效（純 SSR，下一請求就是線上內容）。
> 這是刻意的：區段是既有頁面的文案微調，不是需要審核的新內容。要先看效果再上線時，用 Draft Mode 預覽連結。
> 需要暫時撤下某段版面時用 `IsEnabled = false`，不是改狀態。

---

## 5. 後台畫面（Screen Map）

> **全域規則：每一個上傳欄位都標示最佳上傳尺寸。**
> 不論在哪個畫面（頁面內容、產品、分類、應用方案、文章、認證、下載…），每個上傳格一律在標籤下方顯示同一句格式的說明：
>
> ```
> 建議尺寸 1200 × 1200（1:1）· JPG/PNG/WebP · 建議 ≤ 250 KB
> 上傳後系統會自動縮至 1200px 寬
> ```
>
> 文字由 `GET /admin/media-presets` 取回、依欄位的 `presetKey` 帶入，**不在各畫面寫死**；尺寸調整只需改 `MediaPresets.json`，全後台同步生效。上傳後伺服器依該寬度等比縮圖（只縮不放），比例／大小不符只警示不阻擋。詳見 [11-media-specs.md](11-media-specs.md)。

**側欄九項，無摺疊群組**（2026-08-29，見 [15-cms-scope.md](15-cms-scope.md) §7）。

```
日常   表單收件匣 · 產品 · 文章 · 頁面內容
內容   應用方案 · FAQ · 下載 · 銷售據點
帳號   使用者
```

分群仍是「多久會動一次」，但**哪些東西該有一項**改用另一條判準：
**一個單元的內容，在它露出的地方維護。** 所以側欄上找不到：

- **認證** —— 在「頁面內容 → 關於我們 → 05 認證」就地編輯（那是它唯一露出的地方）
- **分類與子分類**、**系列** —— 在「產品」畫面的分頁上（它們是產品的屬性）
- **媒體庫** —— 圖改成在各欄位就地上傳（§6）
- **導覽選單**、**轉址**、**設定** —— 見 [15](15-cms-scope.md) §7.4／§7.5

| 畫面 | 功能 |
|------|------|
| 登入 | 帳密登入、忘記密碼 |
| ~~Dashboard~~ | **刻意不做** —— 完整度掛在側欄每一項上，見 §8.1 |
| **頁面內容 Pages** | 見 §5.1 |
| 產品列表/編輯 | 篩選（分類/子分類/狀態）、搜尋（**同時比對名稱與 SKU**）、CRUD、語系切換分頁、圖片排序、**特色三欄 repeater**（icon + 標題 + 說明）、**Use Cases repeater + 情境照**、**尺寸表格編輯器**、認證多選、**相關產品：搜尋加入＋上下箭頭排序（留白＝自動計算）**、**精選旗標 + 一句話文案**（首頁瀑布流 8 個版位皆用產品主圖，不另上傳塔位圖；版位比例由版型決定，編輯不需理會）、SEO 區 |
| 分類管理 | 排序、描述、卡片圖、**hero 圖**、**3 組統計 repeater**、**支撐等級三欄（綁 Collection）**、SEO |
| **子分類管理** | 隸屬分類、slug、排序、名稱、描述、hero 圖、統計、**SEO（有獨立 URL，SEO 欄位為必填）** |
| 系列管理 | Care/Protect/Advance 名稱、描述、排序 |
| **認證管理** | 標章、下方小字、說明、logo、對應下載檔、排序 |
| 應用方案管理 | 部位/特殊照護兩型態、**「顯示於人體圖」開關 + 座標（SVG 點選取器）**、統計、**常見困擾 / 支撐等級 / 如何穿戴三個 repeater**、穿戴指引圖、**免責文字**、關聯產品排序 |
| 文章列表/編輯（News/Insights） | RTE 編輯器、封面、型態、**分類下拉（依型態過濾）**、**導言 / 作者 / 閱讀時間**、標籤、排程發布；**News 另有活動資訊面板與圖庫** |
| **文章分類管理** | Kind（news/insight）、名稱、排序、側欄促購卡文案 |
| FAQ 管理 | **分類下拉 + 分類管理子頁**（排序、名稱）、排序、問答編輯 |
| 下載管理 | 上傳 PDF、分類（型錄/認證文件/使用手冊）、**檔案語言**、**說明文字**、關聯產品；列表以 `EN · PDF · 說明` 預覽 |
| 銷售據點管理 | **「台灣」/「國際」兩分頁**；國際列加地區標籤、排序 |
| ~~媒體庫~~ | **已移除**（[15](15-cms-scope.md) §7.3）。上傳與 alt 回到各欄位；引用反查與媒體刪除是刻意放棄的 |
| ~~導覽/選單~~ | **已移除**（[15](15-cms-scope.md) §7.4）。導覽等同網站結構，寫在前端 |
| **表單收件匣** | 列表（依類型／狀態篩選、分頁）、詳情對話框、標記已處理／垃圾／退回未處理、匯出 CSV（帶目前篩選）。**預設只看未處理** —— 收件匣的用途是清空，不是瀏覽。<br>全站唯一「內容不是我們寫的」模組：**只能讀與標記，沒有建立也沒有編輯**，也沒有翻譯這個維度，所以不掛完整度儀表；側欄改用**未處理筆數徽章**（同一個槽位，回答同一類問題）|
| 使用者管理（Admin） | 帳號、角色 |
| ~~設定~~ | **已移除**（[15](15-cms-scope.md) §7.4） |

### 5.1 「頁面內容」畫面

> ⚠️ **【2026-08-28 收斂，見 [15-cms-scope.md](15-cms-scope.md)】**
> 實際有 schema 的只有 **6 個 pageKey / 19 個區段**，其餘 12 頁在這個畫面是空的 ——
> **那是定案不是壞掉**：那些頁的版面文案已寫死在前端。
> 留在區段裡的以圖片與引用清單為主（換圖不會撞壞版型，挑要露出哪幾份是策展）。

左側為 18 頁清單，分兩組：

- **單例頁**（13）：Home、About、Products、Applications、Partnership、Resources、FAQ、Insights、News、Downloads、Where to Buy、Contact、Privacy
- **模板頁共用文案**（5）：Product Category、Product Detail、Application Detail、Article Detail、News Detail
  > 這五項只放「所有該類型頁面共用」的區段標題與 CTA。個別產品／文章的內容在各自的管理畫面編輯。

右側為該頁的區段表單，由 `GET /admin/page-schema/{key}` 的 JSON Schema 動態生成：

- 逐區段呈現。收斂後多數區段已沒有標題欄位，區段名稱由 schema 的 `title` 提供（如「About · 02 Steady growth. Deep roots.」），仍對得上線上頁面的編號。
- 每個區段有 **`啟用` 開關**（`IsEnabled`），關閉時整段不渲染。
- **沒有「新增區段」「刪除區段」「拖曳排序」**——版面已鎖定（見 §0 前言與 [09](09-page-blocks.md) §0.1）。
- 語系分頁（EN / 中）；表單頂端有「**同步至其他語系**」勾選（預設開），只同步圖片、連結、數字、enum 等非文字欄位。
- 每個圖片欄位顯示建議尺寸、比例、格式與大小上限（來自 `GET /admin/media-presets`，見 [11-media-specs.md](11-media-specs.md)），並註明「上傳後自動縮至 W px 寬」；不符時警示但不阻擋。
- 儲存前於前端以同一份 schema 驗證；後端再驗一次，錯誤以欄位路徑標示。

---

## 6. 媒體上傳流程

> **上傳一律發生在用到那張圖的欄位裡**，後台沒有媒體庫畫面（[15](15-cms-scope.md) §7.3）。
> 元件在 `apps/admin/src/components/MediaField.tsx`：`ImageField`（單張）、
> `ImageList`（多張＋排序＋主圖）、`FileField`（PDF）。

**圖片（需縮圖，走 API 代傳）**

1. 欄位下方顯示該 preset 的建議尺寸與比例（`<PresetHint>` ← `GET /admin/media-presets`）。
2. 按「選擇圖片」開系統選檔視窗。**多張的圖庫可一次選多個檔，但一張一張傳** ——
   Function App 實例 2048MB，同時解碼多張 2560px 來源圖會 OOM（[07](07-azure-deployment.md) §10）。
3. `POST /api/admin/media`（multipart，帶 `presetKey`）→ 伺服器 SkiaSharp **依 preset 寬等比縮圖（只縮不放）**、輸出 WebP + 原格式、去 EXIF、轉 sRGB、正規化檔名。
4. 寫入 Blob（master 與 variants）與 `Media` / `MediaVariant`，回傳 `warnings`。
   **比例不符／解析度不足／檔案過大一律是黃字警示，圖仍然存進去**（[11](11-media-specs.md) §4）。
   前端不另做 `createImageBitmap` 預檢 —— 後端已回同一組判斷，兩處維護同一條規則只會走鐘。
5. 上傳成功後欄位就地出現 alt 輸入格，離開焦點時 `PATCH /admin/media/{id}`。
   **這是全後台唯一的 alt 入口**，而全站的 `<img alt>` 都取自 `Media.AltText`。
6. 圖片由 **Blob 匿名讀取容器直接對外**（無 CDN）；上傳時寫入長 `Cache-Control`，前端以 custom loader 指向已產生的尺寸變體，不經 SWA 圖片優化端點（見 [07-azure-deployment.md](07-azure-deployment.md) §7.3）。

**PDF（不縮圖，走 SAS 直傳）**

1. `POST /admin/uploads/sas` 取上傳網址 → 前端直傳 Blob（不佔用 Function）。
2. 回報 metadata 建立 `Media`（`presetKey = document`）。

兩條路的分歧收在 `useFieldUpload(presetKey)` 裡，呼叫端不需要知道。

- 限制與拒絕條件（格式白名單、20MB、像素上限、SVG sanitize）見 [11-media-specs.md](11-media-specs.md) §4。**病毒掃描（Defender for Storage）不在本次方案內**（會產生額外費用），因此格式白名單與 SVG sanitize 是唯一防線，務必在 API 端嚴格執行。
- 原始檔另存同一 Storage Account 的 `media-originals` 容器（**私有，不對外**），供 preset 調整後 `POST /admin/media/{id}/reprocess` 重新輸出。
- **孤兒圖不會被清掉**：沒有刪除媒體的 UI（[15](15-cms-scope.md) §7.3 的刻意取捨）。`GET /admin/media` 仍在，供各編輯頁載入既有圖的縮圖網址與 alt。

---

## 7. 安全

- 登入失敗鎖定、密碼雜湊（ASP.NET Identity / PBKDF2）、refresh token 輪替。
- 後台所有寫入端點需有效 JWT + 角色；Function App CORS 僅允許 `https://www.eunicemed.com`。
- CSRF：採 Bearer token（非 cookie session）即免；若用 cookie 需 CSRF token。
- ⚠️ **無平台層防護**：SWA Free **不支援 IP 限制**，且本案無 Front Door/WAF。`/admin` 的入口對全網開放，安全性完全落在應用層 —— 登入失敗鎖定、短效 JWT + refresh 輪替、API 端每個端點都驗角色（不可只靠前端隱藏選單）、登入端點加速率限制。

---

## 8. 技術選型（後台）

| 項目 | 選用 |
|------|------|
| 框架 | React 19 + Vite + TypeScript |
| 路由/狀態 | React Router + TanStack Query |
| **樣式** | **Tailwind CSS**（與公開站同一套設計 token，見 [08-design.md](08-design.md) §2–§4） |
| UI 元件 | **shadcn/ui**（Tailwind 基底、複製進專案、可改） |
| 表單 | React Hook Form + zod |
| RTE | TipTap 3（輸出 HTML，伺服器端淨化；允許標籤集見 [09](09-page-blocks.md) §9.2）<br>以 `React.lazy` 載入，實測獨立 chunk 401KB（gzip 129KB），只有含富文字欄位的畫面會下載<br>**工具列按鈕必須等於該 profile 的白名單**：多一顆按鈕＝編輯者按了、存了，然後標籤被靜默剝掉 |
| 排序 | **上下箭頭，沒有拖拉**。`Repeater`、圖庫、相關產品三處一致 —— 最長的清單也只有 8 筆，箭頭夠用、對鍵盤友善，而且省下 dnd-kit 的打包體積（§8.1 的 250MB 與公開頁 bundle 限制）。**dnd-kit 目前沒有安裝**；真的出現幾十筆的排序需求再回頭評估 |
| 表單生成 | 由 `GET /admin/page-schema/{key}` 的 JSON Schema 動態生成頁面區段表單；型別以 `x-fieldType` 對應元件 |

> **為什麼不用 Ant Design**（先前版本列為選項之一）：
> 1. 它有自己的 CSS-in-JS 設計系統，與 Tailwind 並存等於維護兩套樣式來源，且品牌 token 得寫兩次。
> 2. 後台的打包體積**計入 SWA Free 的 250MB 上限**（與公開站共用同一個 app，見 §1），Ant Design 全量引入約 1.2MB gzip，是 shadcn/ui 的數倍 —— shadcn/ui 是把用到的元件原始碼複製進專案，沒用到的不會進 bundle。
> 3. shadcn/ui 與公開站共用同一份 Tailwind 設定，品牌色與字型不必分兩處維護。

---

### 8.1 後台介面設計流程（**動手前必讀**）

公開站的版面已由 `mockup4/` 鎖定，照著切即可。**後台沒有任何 mockup、沒有設計稿** —— [08-design.md](08-design.md) 只涵蓋對外品牌與公開站。因此後台介面是**要現場設計的**，不是照抄。

**規則：任何後台 UI 工作（新畫面、改版面、調元件）開始前，必須先啟動 `frontend-design` skill**，取得視覺方向、字級與間距系統、以及避免做出「一看就是模板」的預設樣貌的判準。不得憑感覺直接寫 Tailwind class。

流程：

1. 啟動 `frontend-design` skill，並讀本文件 §5 的 Screen Map 與 [08-design.md](08-design.md) §2–§4（品牌色、字型）。
2. 先定調：後台是**高密度資料工具**，不是行銷頁面。優先序是可掃視性、表單效率、狀態清晰，不是視覺張力。
3. 產出該畫面的版面後再寫程式碼；同類型畫面（列表／編輯／設定）**一旦定案就沿用同一個骨架**，不逐頁重新設計。

**已定案的視覺方向（2026-08-18）**

> **版面結構與元件慣例對齊 [Jabez/Admin](/Users/tim/webapps/Jabez/Admin)** ——
> 同一位開發者的既有後台。操作習慣一致比視覺獨創重要，
> 就像 API 骨架刻意與 Jabez/Api 同源一樣。

**沿用 Jabez 的部分**

| 項目 | 內容 |
|---|---|
| 版面 | `app-wrap` CSS 格線：`'header header' / 'sidebar main'`。全寬 sticky topbar（5rem）＋ 可收合側欄（16rem ⇄ 4.4rem）＋ footer |
| 響應 | 1280px 以下整體字級縮到 14px；991px 以下側欄變 off-canvas 抽屜 |
| 元件命名 | `.btn` / `.btn-primary` / `.btn-sm` / `.form-control` / `.form-label` / `.table` / `.table-hover` / `.badge` / `.panel` / `.alert` |
| 圖示 | stroke-only、1.5 線寬、`.icon` / `.icon-sm` / `.icon-lg`（Jabez 是 sprite 檔，這裡用 inline SVG —— 只有用到的會進 bundle）|
| 選單資料 | `menuItems` 陣列，`isTitle` 為群組標題（同 Jabez 的 `data.ts`）|
| 圓角 | 統一 0.375rem |

**換成 EuniceMed 品牌的部分**

| 項目 | Jabez | EuniceMed |
|---|---|---|
| 底色 | 暖米 `#F5F2ED` | 冷灰 `#F1F5F6` —— 暖米配品牌青會打架 |
| 側欄 | 森綠 `#699F34` | 深青 `#0B5563`（品牌青 `#00B5CD` 的深色變體；純品牌青當大面積底色白字對比不足）|
| 主要動作 | taupe `#8C7355` | 品牌青 `#0092A8` |
| 字 | Playfair + Montserrat + Lora | Myriad Variable Concept（**用 width 軸**）＋ 系統字 ＋ Noto Sans TC |
| 等寬 | JetBrains Mono | 系統等寬 —— slug/SKU 要逐字比對；不引外部字型，省 250MB 額度 |

**本專案獨有的一個元件：完整度儀表**

論點：**這個站的失效模式是靜默** —— 語言純度讓未翻譯的內容直接消失、不報錯。
公開站這樣做是對的，後台必須相反：**讓「缺什麼」大聲**。

| 項目 | 決定 |
|---|---|
| 形狀 | 三段軌道，取自壓力襪包裝的壓力梯度圖 |
| 三段的理由 | 對應 required / recommended / complete —— 因為品牌把所有東西分三級（Care·Protect·Advance），是結構資訊不是裝飾 |
| 雙軌 | 列表每列兩軌（en / zh-TW），掃過 149 列就看見整條中文軌是空的 |
| **沒有 Dashboard 頁** | 側欄每項可帶迷你儀表 —— 打開後台第一眼就是「哪一區最缺中文」。統計卡首頁看過一次就不再看 |
| 綠色 | **不用綠色代表「完成」** —— 完成是儀表填滿。綠色只留給一般成功訊息 |

判準檔在 `apps/admin/src/lib/completeness.ts`：**第 0 段與第 1 段的分界必須與後端的
`PageHandler.IsRenderable` 一致** —— 兩邊各寫一套的話，後台顯示「有內容」而前台是 404。

**後台設計約束**：

| 約束 | 說明 |
|------|------|
| 品牌一致但不等同 | 沿用品牌青 `#00B5CD` 作為主要動作色與焦點框，但後台**不套用公開站的大留白與 hero 尺度** —— 那是給訪客看的，不是給每天用八小時的編輯用的 |
| 中英文並存 | 後台介面語言為繁體中文，但內容欄位會同時顯示 en / zh-TW 分頁。字型需同時處理拉丁與中文，行高以中文為準 |
| 資料密度 | 列表以表格為主、預設 20 筆／頁；欄寬固定避免跳動；長文字截斷加 tooltip |
| 狀態必須可辨 | Draft / Published / Archived 三態要能不靠顏色分辨（色盲友善）—— 色塊搭配文字標籤，不只用顏色 |
| 每個上傳欄位都有尺寸提示 | 見 §5 全域規則，文字來自 `GET /admin/media-presets`，不在畫面寫死 |
| 打包體積 | 重量級套件（TipTap、dnd-kit、圖表）一律 code-split，`/admin` 全部 lazy load，**不得進入公開頁的 bundle** |

---

## 9. 驗收清單
- [ ] 樣式全為 Tailwind，未混入第二套設計系統；`/admin` bundle 未進入公開頁
- [ ] 每個後台畫面在動工前都跑過 `frontend-design` skill，同類型畫面共用同一骨架
- [ ] Draft / Published / Archived 三態不靠顏色也能分辨（色塊 + 文字標籤）
- [ ] 角色權限正確（API 端強制）
- [ ] 各內容模組 CRUD + 多語系編輯
- [ ] 草稿/發布/預覽（純 SSR，發布後即時反映，無需 revalidation）
- [ ] 媒體上傳（圖片代傳縮圖 / PDF SAS 直傳）與引用查詢（**含頁面區段 JSON 內的引用**）
- [ ] **每個上傳欄位都顯示建議尺寸與「自動縮至 W px 寬」**，文字來自 API preset 而非各畫面寫死
- [ ] 上傳後輸出寬度確為 preset 寬（原圖較小時不放大並標示解析度不足）
- [ ] 產品只需一張 1:1 圖即可在首頁精選／型錄／相關產品／圖庫全部正常顯示
- [ ] 表單收件匣可檢視/匯出
- [ ] **18 頁的頁面內容皆可編輯**，且無法新增／刪除／拖曳區段（僅可切換啟用）
- [ ] 頁面區段儲存時通過 JSON Schema 驗證，錯誤能定位到具體欄位
- [ ] 「同步至其他語系」只影響非文字欄位，不覆蓋已翻譯文案
- [ ] 產品可用 SKU 搜尋；尺寸表格編輯器可增減尺碼欄與量測列
