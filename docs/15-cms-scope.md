# 15. 後台可編輯範圍決議

> 2026-08-28 定案。本檔是「哪些內容進 CMS、哪些回程式碼」的**單一真相來源**。
> 新增或移除任何 `Api/PageSchemas/*.json` 之前先讀這份。

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

「進階」預設摺疊。三種情況強制展開：側欄收合時（`.nav-title` 只是 `visibility:hidden` 仍佔位，再摺疊那七項就完全沒有入口）、群組不可摺疊、當前路由就在群組裡。

---

## 5. 已知殘留

- **`SyncInvariant` 走不進陣列**：`ReadPath`/`WritePath` 只處理 `JsonObject`，所以 `tiles[].link.url` 這類陣列內的 invariant 欄位其實同步不到。本次沒修 —— 連結已不在 CMS 裡，這條路徑目前沒有使用者。
- **頁面內容的完整度儀表語意變弱**：`sectionLevels` 的判準之一是 `已填欄位數 >= required.length + 1`，`required` 變短之後會更容易滿分。要精準需改成逐 schema 計算，本次不動（會在同一個 PR 裡混進第二件事）。
- **`x-localeInvariant` 用在 URL 上是設計錯誤**，本次以「連結不進 CMS」規避而非修復。

## 6. 這次沒有做的

- **reCAPTCHA**：版本與 site key 未拍板（[CLAUDE.md](../CLAUDE.md) §7）。表單目前的防線只有蜜罐、行程內 IP token bucket 與必填檢查。
- **媒體 reprocess**：低頻操作，需要時走 `.http`。
- **標籤管理畫面**：API 保留，文章編輯裡照樣能掛標籤。
- **部位新增／刪除**：7 筆固定，只能改名與排序。
