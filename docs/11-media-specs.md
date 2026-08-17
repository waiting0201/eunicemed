# 11 · 媒體尺寸與縮圖規格（Media Presets）

> **本檔為全站圖片尺寸的唯一真相來源（single source of truth）。**
> 任何文件、JSON Schema、後台提示文字、素材交付單若與本檔不一致，以本檔為準。
> 相關：[03-cms.md](03-cms.md) §5.1／§6（後台畫面與上傳流程）、[04-api.md](04-api.md) §媒體（端點）、[05-database.md](05-database.md) §3.9a（`Media` / `MediaVariant`）、[09-page-blocks.md](09-page-blocks.md)（逐頁欄位）。

---

## 1. 兩條原則

### 1.1 每個上傳欄位都必須標示「最佳上傳尺寸」

後台每一個 media 欄位（頁面區段、產品、分類、文章、應用方案、認證…）在輸入框旁**一律顯示**：

```
建議尺寸 1200 × 1200（1:1）· JPG/PNG/WebP · 建議 ≤ 250 KB
上傳後系統會自動縮至 1200px 寬
```

這串文字不是各畫面各自寫死的，而是由 preset 產生：後台以 `GET /api/v1/admin/media-presets` 取回本檔表格的機器可讀版本，欄位再依自己的 `presetKey` 取用。**新增欄位時只需指定 `presetKey`，提示文字自動出現。**

### 1.2 上傳後一律依 preset 寬度等比縮圖

伺服器端（Functions，**SkiaSharp**）於上傳當下處理，**不是**留給前端或 CDN：

1. **依 preset 的建議寬度等比縮放**——只縮不放（`width > preset.width` 才縮；較小的原圖維持原尺寸並在後台標示「解析度不足」）。
2. 轉出 **WebP（q78）** 與 **原格式（JPEG q78 / PNG）** 各一份；PNG 透明度保留。
3. 移除 EXIF、色彩轉 sRGB、檔名正規化（小寫、去空白、加短雜湊）。
4. 寫入 `Media`（含 `PresetKey`、原始寬高）與 `MediaVariant`（每個輸出檔一列）。
5. 前端只引用 normalized master 與**上傳時已產生的 variant**。⚠️ **不使用 SWA 的 `next/image` 即時優化**——那會讓圖片位元組經過 SWA 並吃掉 Free 方案 100GB/月頻寬（見 [07-azure-deployment.md](07-azure-deployment.md) §7.3）。因此**響應式尺寸必須在上傳當下一併產生**（每個 preset 輸出所需的寬度斷點），前端以 custom loader 從 `MediaVariant` 挑選。

> 縮圖依**寬**、不依高：所有版位皆為固定寬度容器 + `object-fit: cover`，寬對齊才能保證不糊。

**比例不符時**：後台顯示警示（「此欄位建議 1:1，您的圖為 3:4，兩側會被裁切」）但**不阻擋**上傳；前端一律 `object-fit: cover` 置中裁切。**檔案過大**同樣是警示不阻擋（硬上限見 §4）。

---

## 2. Preset 總表

| presetKey | 比例 | **建議上傳（＝縮圖目標寬）** | 建議大小 | 用途 |
|---|---|---|---|---|
| `hero-slide` | 8:3 | **2560 × 960** | ≤ 500 KB | 首頁 hero 輪播 |
| `page-band` | 16:3 | **2560 × 480** | ≤ 300 KB | 各頁頁頂 band |
| `section-bg` | 2.84:1 | **2560 × 900** | ≤ 450 KB | 區塊背景帶、Partnership 經銷寬卡 |
| `wide-16x9` | 16:9 | **1600 × 900** | ≤ 300 KB | 文章封面、About 製造寬圖、Partnership OEM 圖 |
| `wide-16x10` | 16:10 | **1200 × 750** | ≤ 220 KB | 分類／子分類 hero、穿戴指引圖 |
| `photo-4x3` | 4:3 | **1200 × 900** | ≤ 220 KB | 產品使用情境照、News 圖庫 |
| `content-16x9` | 16:9 | **1200 × 675** | ≤ 200 KB | 文章內嵌圖 |
| `portrait-4x5` | 4:5 | **1000 × 1250** | ≤ 250 KB | About 人物照、應用方案 hero |
| `square` | 1:1 | **1200 × 1200** | ≤ 250 KB | **全站產品圖（唯一規格）**、分類卡、About 方圖 |
| `card-16x10` | 16:10 | **800 × 500** | ≤ 150 KB | 卡片封面（特殊照護／Resources／影片 poster） |
| `logo-mark` | 1:1 | **400 × 400** | ≤ 80 KB | 認證標章 logo（PNG 透明底或 SVG） |
| `og-image` | 1.91:1 | **1200 × 630** | ≤ 200 KB | SEO Open Graph 圖 |
| `document` | — | PDF（不縮圖） | ≤ 20 MB | 型錄／認證文件／使用手冊 |

**共 12 個圖片 preset。** 縮圖階梯只有 6 個寬度值：`2560 · 1600 · 1200 · 1000 · 800 · 400`。

> **不再有「產品縮圖 200×200」這個上傳規格**——產品頁的縮圖列由 `square` master 經 `next/image` 產生。
> **不再有「首頁塔位 700×1400」這個上傳規格**——見 §3。

---

## 3. 首頁 Hero products：統一為 1:1

**問題**：原規格中同一個產品可能要準備三種圖——首頁塔位 1:2（700×1400）、型錄卡 1:1（800×800）、相關產品卡 3:4（600×800）。編輯者每上架一個精選產品就得回頭補一張直式大圖，實務上會卡住。

**決議（2026-08-14）**：**產品圖全站統一為 1:1，master 1200×1200**。

| 位置 | 變更前 | 變更後 |
|---|---|---|
| 首頁 01 Hero products 第 1 格（直式塔位） | 1:2 · 700×1400 · `Product.TowerImageMediaId` | **1:1 · 產品主圖**（塔位取消，改 2×2 大方卡） |
| 首頁 01 Hero products 其餘格 | 1:1 · 800×800 | **1:1 · 產品主圖**（4 張小方卡） |
| 產品型錄卡（Products／分類頁） | 1:1 · 800×800 | **1:1 · 產品主圖** |
| 產品詳情相關產品卡 | 3:4 · 600×800 | **1:1 · 產品主圖** |
| 產品詳情圖庫縮圖 | 200×200（另存） | **1:1 master 的衍生尺寸**（不另上傳） |
| 分類卡（Products 頁三大分類） | 1:1 | 1:1（不變） |

**連帶的版面調整**（已同步改入 `mockup4/Home.dc.html`）：首頁 01 區改為 **Pinterest 式瀑布流（masonry）**——等寬 4 欄、卡片高度不一、由上往下堆疊，版位比例依序輪替 `1:1 / 4:5 / 5:4`，下方為整排橫跨的「Full catalogue」漸層帶，共 8 個商品版位。

> **瀑布流的落差來自「版位比例」，不是來自不同的上傳圖，也不是來自文案長短。** 上傳規格永遠只有一個 `square`；模板決定哪個版位以 1:1、哪個以 4:5 呈現，`4:5` 由 `object-fit: cover` 從方圖裁切，**上下各約 10%**。
> **裁切方向要記清楚**：方圖放進**比方形高**的版位（4:5、3:4）是**裁掉左右**；放進**比方形寬**的版位（5:4、4:3）才是**裁掉上下**。目前採用的 4:5 與 5:4 各只裁掉一邊向度的 20%（每側 10%）。
> 實測欄寬 245px（1180 版面），三種版位的圖高為 245（1:1）／306（4:5）／196（5:4）；@2x 最大需求 490×612，`square`（1200×1200）綽綽有餘。
>
> 三個被評估後否決的替代方案：
> 1. **保留 1:2 直式塔位、方圖裁切**——只剩中間約一半畫面，橫向商品（鞋墊、護腕）會被切壞，且 @2x 需 1392px 而方圖只有 1200。
> 2. **以文案長短製造落差**——實測僅 19–38px（卡片高的 8–15%），且 en 兩行／zh-TW 一行會讓兩個語系版面不同，等於把版面交給編輯者的字數決定。
> 3. **高卡改 `object-fit: contain` 零裁切**——安全但產品顯小，且現有產品照非去背、自帶底色，與卡片底色會有色差；除非素材統一白底或去背再議。
>
> 後續若某張照片在 4:5 版位裁切不佳，解法是加**焦點設定**（`object-position`，後台於圖上點選），而非新增上傳欄位。

**影響**：`Product.TowerImageMediaId` 欄位刪除（[05](05-database.md) §3.2）；後台產品編輯畫面移除「直式塔位圖」上傳格（[03](03-cms.md) §5）；`Product` 只剩 `ProductImage[]`（1:1）與 `UseCaseImageMediaId`（4:3）兩種圖。

---

## 4. 上傳限制（硬性）

| 項目 | 限制 | 違反時 |
|---|---|---|
| 圖片格式 | `jpg` `jpeg` `png` `webp`（`svg` 僅 `logo-mark`） | 415 拒絕 |
| 文件格式 | `pdf` | 415 拒絕 |
| 原始檔大小 | 圖片 ≤ 20 MB；PDF ≤ 20 MB | 413 拒絕 |
| 原始圖片尺寸 | 長邊 ≤ 8000 px、總像素 ≤ 40 MP | 400 拒絕（防解壓縮炸彈） |
| 比例偏差 | 與 preset 相差 > 5% | **警示，不阻擋** |
| 解析度不足 | 寬 < preset 寬的 80% | **警示，不阻擋**（後台列表加註記） |
| 檔案大小超建議值 | 超過 §2 建議值 | **警示，不阻擋**（縮圖後多半自動達標） |

- SVG 需經 sanitize（移除 `script`／`foreignObject`／外部參照）後才入庫。
- 病毒掃描（Defender for Storage，選用）於 Blob 端執行。

---

## 5. 欄位 → preset 對照

### 5.1 頁面區段（PageSection，[09](09-page-blocks.md)）

| 欄位 | preset |
|---|---|
| `home.heroSlider.slides[].image` | `hero-slide` |
| `home.bodyPartBand.background` | `section-bg` |
| `home.testimonial.video.poster` | `card-16x10` |
| `about.hero.band`／`products.hero.band`／`applications.hero.band`／`partnership.hero.band`／`faq.hero.band`／`insights.hero.band`／`news.hero.band`／`downloads.hero.band`／`where-to-buy.hero.band`／`privacy.hero.band` | `page-band` |
| `about.story.portrait` | `portrait-4x5` |
| `about.milestones.background`／`products.cta.background` | `section-bg` |
| `about.manufacturing.imageWide` | `wide-16x9` |
| `about.manufacturing.imageSquare` | `square` |
| `partnership.oemOdm.image` | `wide-16x9` |
| `partnership.distributor.image` | `section-bg` |

### 5.2 實體欄位（[05](05-database.md)）

| 資料表．欄位 | preset |
|---|---|
| `Category.ImageMediaId`／`SubCategory.ImageMediaId` | `square` |
| `Category.HeroImageMediaId`／`SubCategory.HeroImageMediaId` | `wide-16x10` |
| `ProductImage.MediaId`（主圖與其餘圖） | `square` |
| `Product.UseCaseImageMediaId` | `photo-4x3` |
| `Application.ImageMediaId` | `portrait-4x5` |
| `Application.CardImageMediaId` | `card-16x10` |
| `Application.FittingImageMediaId` | `wide-16x10` |
| `Article.CoverMediaId` | `wide-16x9` |
| `Article.Body` 內嵌圖 | `content-16x9` |
| `ArticleImage.MediaId`（News 圖庫） | `photo-4x3` |
| `Certification.LogoMediaId` | `logo-mark` |
| `*.OgImageMediaId`（各 Translation 表） | `og-image` |
| `Download.MediaId` | `document` |

---

## 6. 機器可讀版本

Preset 表以 JSON 常數存於 `api/EuniceMed.Core/Media/MediaPresets.json`，為後端縮圖、`GET /admin/media-presets`、JSON Schema 產生器共用：

```json
{
  "square": {
    "key": "square",
    "label": { "en": "Product image (1:1)", "zh-TW": "產品圖（1:1）" },
    "aspect": "1:1",
    "width": 1200,
    "height": 1200,
    "maxBytes": 256000,
    "formats": ["jpg", "png", "webp"],
    "note": { "en": "Centre the product; it is cropped square on all pages.",
              "zh-TW": "產品置中，全站皆以正方裁切呈現。" }
  }
}
```

- Page section 的 JSON Schema 只寫 `"x-mediaPreset": "square"`；`x-recommendedSize` 與 `x-maxBytes` 由建構時自 preset 展開，**不手抄**（手抄就會再度出現本檔要解決的不一致）。
- 素材交付單（給設計／品牌方）由同一份 JSON 產生，確保外部拿到的尺寸和後台提示一致。

---

## 7. 驗收清單

- [ ] 後台**每一個** media 欄位都顯示建議尺寸、比例、格式與大小上限，且文字來自 `GET /admin/media-presets`
- [ ] 上傳後實際輸出寬度 = preset 寬度（原圖較小時維持原寬並標示解析度不足）
- [ ] 每筆 `Media` 有對應的 `MediaVariant`（WebP + 原格式），且 `PresetKey` 正確
- [ ] 產品全站只需一張 1:1 圖：首頁精選、型錄卡、相關產品、圖庫縮圖皆由它產生
- [ ] `Product.TowerImageMediaId` 已自 DB、API、後台畫面、mockup 移除
- [ ] 比例／大小不符只警示不阻擋；格式與硬上限則確實拒絕
- [ ] JSON Schema 內無手寫尺寸字串（一律 `x-mediaPreset`）
