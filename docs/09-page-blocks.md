# 09 · 頁面區段規格（Page Sections）

> **本版依 `mockup4/`（客戶定案版）之 18 個實際頁面逐頁展開。**
> IA/URL 見 [06-sitemap.md](06-sitemap.md)；資料表見 [05-database.md](05-database.md)；元件見 [02-frontend.md](02-frontend.md)；視覺原則見 [08-design.md](08-design.md)。
>
> 前版依 Weypro 提案 PDF 推導、以 `PageBlock.BlockType` 字彙描述可編輯內容，本版**整體取代**之。

---

## 0. 本規格的三個前提

### 0.1 固定版型（Fixed layout）

版面鎖定於 mockup4。後台**不提供自由區塊組合器**——編輯者不能新增、刪除或拖曳區段，只能填寫每個區段的具名欄位，以及以 `IsEnabled` 隱藏整個區段（例如首頁 testimonial 影片尚未備妥時）。

新增/移除/重排區段屬**版面變更**，走程式碼 PR（改 JSON Schema + 前端模板 + seed 同步器），不是編輯操作。

### 0.2 內容的三種來源

| 標記 | 意義 | 儲存位置 |
|---|---|---|
| **區段** | 該頁的固定文案／圖片，由後台「頁面內容」編輯 | `PageSection` + `PageSectionTranslation.DataJson`（[05](05-database.md) §3.7） |
| **實體** | 屬於某筆記錄的內容（產品、應用方案、文章、分類…） | 該實體自己的資料表與 Translation 表 |
| **動態** | 模板依條件自 API 取清單 | 查詢結果，後台不直接編輯排版 |

判準：編輯者的心智模型是「編輯 Orthopedic Support 這個分類」而不是「編輯分類頁的第 3 個區段」→ 內容放**實體**；是「編輯首頁那段標語」→ 放**區段**。

### 0.3 欄位型別字彙

```
text · richtext · media(presetKey) · link{label,url,external}
number · date · bool · enum[...] · ref:Entity · repeatable{...}(min–max)
```

- 每個 `media` 欄位在 JSON Schema 內只帶 **`x-mediaPreset`**（如 `square`、`page-band`）；比例、建議尺寸、大小上限、提示文字一律由 [11-media-specs.md](11-media-specs.md) §2 的 preset 表展開，**本文件與 schema 都不手抄尺寸數字**。
  後台每個上傳欄位據此顯示「建議尺寸 W×H（比例）· 格式 · ≤NN KB · 上傳後自動縮至 W px 寬」，不符時警示（不阻擋）。本文件各表內括號中的尺寸僅為閱讀方便的註記。
  現行 13 個圖片 preset：`hero-slide` 2560×960 ·`page-band` 2560×480 ·`section-bg` 2560×900 ·`wide-16x9` 1600×900 ·`wide-16x10` 1200×750 ·`photo-4x3` 1200×900 ·`content-16x9` 1200×675 ·`portrait-4x5` 1000×1250 ·`square` 1200×1200（**全站產品圖唯一規格**）·`card-16x10` 800×500 ·`logo-mark` 400×400 ·`measure-diagram` 400×400 ·`og-image` 1200×630。
  > 兩項已修正的不一致：①`IMAGES.md` 對 About 人物照建議 `1000×1333`（3:4），版面實為 4:5 → 以 `portrait-4x5`（1000×1250）為準。②產品圖原有 1:1／3:4／1:2 三種規格 → 統一為 `square`，見 [11](11-media-specs.md) §3。
- `richtext` 由 TipTap 產生、伺服器端淨化；允許標籤集見 §9.2。
- `ref:Entity` 於 `DataJson` 內存 GUID 字串；API 回應時解析為精簡 DTO 放進 `refs`（見 [04-api.md](04-api.md) §4）。
- **區段編號（`01`–`05`）是模板產生的，不是欄位**——編號與版面順序綁定，開放編輯只會讓兩者脫節。

### 0.4 sectionKey 命名規則

小駝峰、動詞或名詞短語、**同頁內唯一且永久**（改名等同刪除舊區段）。共用文案區段一律命名 `labels`；頁尾 CTA 一律 `cta`；頁首一律 `hero`。

---

## 1. 頁面總表

| # | 頁面 | URL | Page.Key | Kind | 區段數 |
|---|---|---|---|---|---|
| 1 | Home | `/[locale]` | `home` | singleton | 7 |
| 2 | About | `/[locale]/about` | `about` | singleton | 6 |
| 3 | Products | `/[locale]/products` | `products` | singleton | 4 |
| 4 | Product Category | `/[locale]/products/{category}` | `product-category` | template | 2 |
| 4b | Sub Category | `/[locale]/products/{category}/{sub}` | *（沿用 `product-category`）* | — | — |
| 5 | Product Detail | `/[locale]/products/{category}/{sub}/{slug}` | `product-detail` | template | 2 |
| 6 | Applications | `/[locale]/applications` | `applications` | singleton | 3 |
| 7 | Application Detail | `/[locale]/applications/{slug}` | `application-detail` | template | 3 |
| 8 | Partnership | `/[locale]/partnership` | `partnership` | singleton | 4 |
| 9 | Resources | `/[locale]/resources` | `resources` | singleton | 5 |
| 10 | FAQ | `/[locale]/faq` | `faq` | singleton | 3 |
| 11 | Insights | `/[locale]/insights` | `insights` | singleton | 2 |
| 12 | Article Detail | `/[locale]/insights/{slug}` | `article-detail` | template | 3 |
| 13 | News | `/[locale]/news` | `news` | singleton | 2 |
| 14 | News Detail | `/[locale]/news/{slug}` | `news-detail` | template | 3 |
| 15 | Downloads | `/[locale]/downloads` | `downloads` | singleton | 2 |
| 16 | Where to Buy | `/[locale]/where-to-buy` | `where-to-buy` | singleton | 4 |
| 17 | Contact | `/[locale]/contact` | `contact` | singleton | 3 |
| 18 | Privacy & Legal | `/[locale]/privacy` | `privacy` | singleton | 2 |

**全站共用**（不屬任何 Page）：Header 導覽、Footer、Resources 次導覽列、`FloatingContact` 浮動聯絡鈕——皆固定於模板，導覽連結文字走 `MenuItem`（Resources 次導覽除外，見 [05](05-database.md) §3.9 註）。

---

## 2. 首頁 Home（`home`）

| sectionKey | 區段 | 來源 | 欄位 |
|---|---|---|---|
| `heroSlider` | Hero 輪播 | 區段 | `slides` repeatable(1–5){ `image` media(`hero-slide`)、`alt` text、`link` link? }；`intervalSeconds` number（預設 6） |
| `featuredProducts` | **01** Hero products | 區段 + 動態 | 區段：`title` text、`promo`{ `eyebrow` text、`title` text、`link` link }（全型錄漸層帶）<br>動態：`GET /products?featured=true&pageSize=8`，依 `FeaturedSortOrder`；**Pinterest 式 masonry：等寬 4 欄、卡片高度不一、往下堆疊**，版位比例依序輪替 `1:1 / 4:5 / 5:4`，全部用產品主圖（`ProductImage` 的 `IsPrimary`，preset `square`）；卡片文案取 `ProductTranslation.FeaturedBlurb` |
| `bodyPartBand` | **02** Find support by body part | 區段 | `background` media(`section-bg`)、`title` text、`lead` text、`cta` link、`tiles` repeatable(4){ `icon` enum、`title` text、`subtitle` text、`link` link } |
| `whyPartner` | **03** A team your business can truly count on | 區段 | `title` text、`items` repeatable(4){ `title` text、`body` text }、`cta` link |
| `testimonial` | **04** Trusted worldwide | 區段 | `title` text、`quote` text、`attribution`{ `name` text、`region` text }、`miniQuotes` repeatable(0–3){ `quote` text、`source` text }、`video`{ `poster` media(`card-16x10`)、`source` text }、`floatingChip` text |
| `latestNews` | **05** Latest news | 區段 + 動態 | 區段：`title` text、`allLink` link<br>動態：`GET /news?pageSize=3`（顯示 `YYYY · MM` + 標題 + Read →） |

**注意**

- mockup4 的 hero **沒有 CTA 按鈕**（前版文件所寫「雙 CTA → Find Products / Where to Buy」已不適用）。
- **【2026-08-28 定案】Hero 文案（原 `heroIntro`）改為前端寫死，不再是區段。**
  三行字（eyebrow `Not Just a Motion · Made in Taiwan`、主標 `Support Feels **Personal**.`、宣言）
  等同品牌識別而非會被編輯的內容，要動它是動 mockup4；留在 CMS 只是多一個與版型走鐘的機會
  （上線後已發生過一次：內容被填成舊站文案）。現在的位置在
  `apps/web/app/[locale]/page.tsx` 的 `HERO_COPY`，英文逐字取自 mockup4。
  `Api/PageSchemas/home.heroIntro.json` 已刪除 —— 同步器會把既有的區段列停用（內容保留），
  公開端點與後台都以 schema registry 過濾，所以兩邊都不再出現。
- `heroSlider` 為 CSS 自動輪播 + 圓點指示；`prefers-reduced-motion` 時停在第一張。
- 首頁精選為**自動取用 `IsFeatured`**，後台不逐格挑產品；要換版位順序改 `Product.FeaturedSortOrder`。
- **【2026-08-14 定案】01 區為 Pinterest 式瀑布流（masonry）**：**等寬 4 欄、卡片高度不一、由上往下堆疊**，下方為整排橫跨的全型錄漸層帶。取消原本的直式塔位（1:2 700×1400）與 2×2 大卡。理由：同一產品原需備妥 1:2／1:1／3:4 三種圖，精選產品每次輪替都得補圖，後台實務上難以維持。現在**八格共用同一張 1:1 產品主圖**。詳見 [11-media-specs.md](11-media-specs.md) §3。
- **高度落差＝版位比例，與文案長短無關**：卡片依**版位順序**（非依產品）輪替 `1:1 → 4:5 → 5:4`，1180 版面下欄寬約 245px，圖高分別為 245／306／196px。
  - 落差因此**與語系無關、與文案字數無關**——en 兩行、zh-TW 一行也不會讓版面走樣。曾評估「以文案長短製造落差」：實測只有 19–38px（約卡片高 8–15%），且隨語系與編輯字數變動，不採用。
  - **裁切方向**：`4:5`（比方形高）→ 由 1:1 主圖**裁掉左右各約 10%**；`5:4`（比方形寬）→ **裁掉上下各約 10%**。兩者都遠小於原塔位 1:2 的 50%。上傳規格不變，仍是單一 `square` preset。
  - 若某張產品照裁切不佳，解法是加**焦點設定**（`object-position`，後台於圖上點一下），不是再開一個上傳欄位。
- **堆疊方式**：CSS multi-column（`columns: 4`）+ 卡片 `break-inside: avoid`；瀏覽器自動平衡欄高。閱讀順序為**逐欄由上而下**（第 1、2 筆在第一欄），DOM 順序即 `FeaturedSortOrder`，爬蟲與螢幕閱讀器取得的順序正確。
- 筆數：取 8 筆；不足 8 筆時欄位自動重新平衡，**不留空位**（masonry 的優點）。全型錄帶恆為整排、不受筆數影響。
- 響應式：`lg` 4 欄 → `md` 2 欄 → `sm` 1 欄，比例輪替不變。

---

## 3. About（`about`）

| sectionKey | 區段 | 來源 | 欄位 |
|---|---|---|---|
| `hero` | 頁首 band + 標題 | 區段 | `band` media(`page-band`)、`eyebrow` text、`title` text（兩行）、`lead` text |
| `story` | **01** Our story & promise | 區段 | `title` text、`body` richtext、`portrait` media(`portrait-4x5`) |
| `milestones` | **02** Steady growth. Deep roots. | 區段 | `background` media(`section-bg`)、`title` text、`items` repeatable(3–12){ `year` text、`event` text } |
| `values` | **03** 核心價值 | 區段 | `title` text、`lead` text、`items` repeatable(3){ `title` text、`body` text } |
| `manufacturing` | **04** Manufacturing & quality excellence | 區段 | `title` text、`imageWide` media(`wide-16x9`)、`imageSquare` media(`square`)、`points` repeatable(3){ `title` text、`body` text } |
| `certificates` | **05** Certified, audited, trusted | 區段 + 實體 | 區段：`title` text、`lead` text、`cta` link（→ `/downloads`）、`items` repeatable(3–8){ `certification` ref:Certification }<br>實體：標章文字（`Mark` / `SubLabel` / `Description`）取自 `Certification`，與產品頁共用同一份 |

---

## 4. Products 產品

### 4.1 產品總覽（`products`）

| sectionKey | 區段 | 來源 | 欄位 |
|---|---|---|---|
| `hero` | 頁首 | 區段 | `band` media(`page-band`)、`eyebrow` text、`title` text、`lead` text |
| `categoryCards` | 三大分類卡 | 動態 | `GET /categories`（圖 = `Category.ImageMediaId`、文 = `CategoryTranslation.Name` / `Description`） |
| `catalogue` | 篩選列 + 產品格 | 動態 | `GET /products?facets=true`；篩選 chip 標籤為 UI 字串（`messages/{locale}.json`），非 CMS 欄位 |
| `cta` | 頁尾 CTA 帶 | 區段 | `background` media(`section-bg`)、`title` text、`body` text、`primaryCta` link、`secondaryCta` link |

### 4.2 分類頁（`/products/{category}`）與子分類頁（`/products/{category}/{sub}`）

兩者**共用同一版型與同一組共用文案**（`Page.Key = product-category`），差別只在 scope 與麵包屑層數。

**內容在實體**（`Category` / `SubCategory`，見 [05](05-database.md) §3.1）：

| 版面位置 | 實體欄位 | 型別 |
|---|---|---|
| Hero 標題 | `Name` | text |
| Hero 引言 | `Description` | text（子分類為 SEO 必填，見 [05](05-database.md) §6 註） |
| Hero 圖 | `HeroImageMediaId` | media(`wide-16x10`) |
| 3 組統計 | `StatsJson` | repeatable(3){ `value` text、`label` text }；`value` 可填 `auto` 由 API 代入產品數 |
| 支撐等級說明 | `SupportLevelsJson` | { `title` text、`lead` text、`items` repeatable(3){ `collectionSlug` enum(care\|protect\|advance)、`body` text } } |
| SEO | `SeoTitle` / `SeoDescription` | text |

**共用文案區段**：

| sectionKey | 欄位 |
|---|---|
| `labels` | `siblingNavAllLabel` text（「All products」）、`resultCountTemplate` text（含 `{shown}` `{total}`）、`sortOptions` repeatable{ `key` enum(newest\|name\|collection)、`label` text } |
| `cta` | `title` text、`body` text、`primaryCta` link、`secondaryCta` link |

**動態部分**：兄弟分類／子分類次導覽、篩選列（Collection / BodyPart / SubCategory）、產品格、分頁。篩選一律走 query string，不產生可索引 URL（見 [06-sitemap.md](06-sitemap.md) §2）。

### 4.3 產品詳情（`/products/{category}/{sub}/{slug}`，`product-detail`）

**內容在實體**（`Product`，見 [05](05-database.md) §3.2）：

| # | 版面區塊 | 實體欄位 |
|---|---|---|
| — | 麵包屑 | Category → SubCategory → Product（三層） |
| — | 圖庫 | `ProductImage[]`（全部為 `square` 1:1；`IsPrimary` 決定主圖，下方縮圖列由同一張 master 產生，**不另上傳 200×200**） |
| — | 摘要 | `Collection`（色標 chip）、`Name`、`Sku`、`Summary`、`ConditionsJson`（症狀 chip）、`ProductBodyPart`（部位 chip） |
| — | 主/次 CTA | 固定：`Request a quote`（錨點 `#inquiry`）／`View specifications`（錨點 `#specs`） |
| **01** | Features | `FeaturesJson` repeatable(2–6){ `icon` enum、`title` text、`body` text } |
| **02** | When to use it | `UseCaseImageMediaId` media(`photo-4x3`)、`UseCasesJson` repeatable(2–5){ `title` text、`body` text }（模板自動編號 01/02/03） |
| **03** | Specifications & size chart | `SpecsJson` repeatable{ `label` text、`value` text }<br>`SizeChartJson`{ `measureLabel` text（如 `thigh circumference`，顯示於標題括號內）、`sizes` text[]（S…XXL）、`rows` repeatable{ `label` text?、`values` text[] }、`footnote` text? }<br>`SizeChartDiagramMediaId` media(`measure-diagram`)：表格右側的量測部位線稿，**語系無關**（圖上沒有文字），沒掛就不出現；有圖但沒有尺寸表時也不出現 |
| **04** | Certifications | `ProductCertification` → `Certification`（與 About 共用） |
| **05** | Downloads | `ProductDownload` → `Download`（列顯示 `標題` + `EN · PDF`） |
| **06** | Related products | `ProductRelated`（人工指定 0–4，4 格固定版位，卡圖 `square` 1:1）；**空則自動**以同 SubCategory → 同 Category → 同 BodyPart 補足 4 筆 |
| **07** | Inquiry | 表單，`POST /contact` type=`product`，帶 `productSlug` 與 `productSku` |
| — | SEO | `SeoTitle` / `SeoDescription` / `OgImageMediaId` |

**共用文案區段**：

| sectionKey | 欄位 |
|---|---|
| `labels` | `featuresTitle`、`useCasesTitle`、`specsTitle`、`certsTitle`、`downloadsTitle`、`relatedTitle`（各 text） |
| `inquiry` | `title` text、`body` text、`submitLabel` text、`messagePlaceholderTemplate` text（可含 `{productName}`） |

---

## 5. Applications 應用方案

### 5.1 總覽（`applications`）

| sectionKey | 區段 | 來源 | 欄位 |
|---|---|---|---|
| `hero` | 頁首 | 區段 | `band` media(`page-band`)、`eyebrow` text、`title` text、`lead` text |
| `bodyMap` | **01** By body part | 區段 + 動態 | 區段：`title` text<br>動態：`GET /applications/body-map`（僅 `ShowOnBodyMap = 1`，目前 back/knee/ankle/foot）；面板文案 = `MapCopy`、按鈕 = `MapCtaLabel`、產品數 = 自動計算 |
| `specialCare` | **02** By special needs care | 區段 + 動態 | 區段：`title` text<br>動態：`GET /applications?type=special-care`（卡圖 = `CardImageMediaId`，preset `card-16x10`） |

### 5.2 應用方案內頁（`/applications/{slug}`，`application-detail`）

**內容在實體**（`Application`，見 [05](05-database.md) §3.4）：

| # | 版面區塊 | 實體欄位 |
|---|---|---|
| — | Hero | `Name`、`Lead`、`ImageMediaId`(`portrait-4x5`)、`StatsJson` repeatable(1–3){ `value`（可填 `auto`）、`label` } |
| **01** | Common concerns | `ConcernsJson` repeatable(2–6){ `title`、`body` } |
| **02** | Support level | `SupportLevelsJson` repeatable(3){ `collectionSlug`、`body`、`bestFor`、`linkUrl`（可指向已帶篩選參數的分類頁） } |
| **03** | Recommended products | `ProductApplication` 關聯（依 `SortOrder`）+ 「All {n} … products →」連結 |
| **04** | How to choose & wear | `HowToJson` repeatable(2–5){ `title`、`body` }（模板自動編號）、`FittingImageMediaId`(`wide-16x10`)、FAQ 連結 |
| — | 醫療免責 | `Disclaimer` richtext；**空值時套用區段 `disclaimerDefault`** |
| **05** | Related applications | 自動：同 `Type` 其餘筆數，不足以 specialCare 補位 |
| — | SEO | `SeoTitle` / `SeoDescription` |

**共用文案區段**：

| sectionKey | 欄位 |
|---|---|
| `labels` | `concernsTitle`、`supportLevelsTitle`、`recommendedTitle`、`howToTitle`、`relatedTitle`、`faqLinkLabel` |
| `disclaimerDefault` | `body` richtext（全站預設醫療免責文字） |
| `cta` | `title`、`body`、`primaryCta` link、`secondaryCta` link |

> **人形路徑有兩份**：前台 `apps/web/components/BodyMap.tsx` 的 `Figure`，
> 與後台座標選取器 `apps/admin/src/components/BodyMapPicker.tsx` 的 `Figure`。
> 兩份必須一致 —— 後台放的位置是相對人形的，人形不同就會對不上。改一邊記得改另一邊。

### 5.2a 首頁 hero 與 01 精選產品的版型細節（2026-08-18 mockup4 更新）

`mockup4/Home.dc.html` 在 2026-08-18 調過樣式，實作已跟上：

| 項目 | 值 | 備註 |
|---|---|---|
| hero 高度 | `clamp(380px, 37.5vw, 960px)` | 37.5vw 就是 8:3。**不要用 `aspect-[8/3]`** —— 手機上只剩約 140px 高 |
| hero 文案區 | 只有上留白 `clamp(40px,5vw,64px)` | 下方留白由 01 區段自己的 padding 給，兩邊都給會變兩倍 |
| eyebrow | `clamp(.7rem,.9vw,.82rem)` / weight 680 / 字距 .2em | |
| h1 | `clamp(2rem,3.8vw,3.4rem)` / 行高 1.12 / 字距 -.02em | |
| lead | `clamp(.95rem,1.3vw,1.15rem)` / 最寬 52ch | |
| 區段標題（**僅首頁 01 與 05**）| 序號與標題**同一行** + 1.5px 底線 | 其他頁維持序號在上方的堆疊式，因此是兩個元件（`RuledSectionHeading` / `SectionHeading`）|
| 瀑布流 | 4 欄、間距 24px、卡片圓角 20px、圖片圓角 18px | 比例仍是 1:1 → 4:5 → 5:4 輪替 |
| 系列標籤 | **逐系列專色的文字**，不是統一品牌青 | 值見 [08-design.md](08-design.md) §2 的提醒 |
| 促銷橫幅 | `linear-gradient(120deg,#00B5CD,#007D95)`、圓角 20px、內距 30/36 | 左側有一枚 78px 的**動線 SVG**（三條同心曲線），純裝飾 |

### 5.3 人體圖互動規格（`BodyPartMap`，client component）

> 視覺準則見 [08-design.md](08-design.md) §5.1a。實作範例：`mockup4/Applications.dc.html`。

**呈現**

- inline SVG 實心柔和剪影人形（正面），**4 個部位**：`back`（腰背）、`knee`（膝）、`ankle`（踝）、`foot`（足）。
- 每部位有：**熱點標記**（白心 + teal 環 + 漣漪 pulse）與**浮動 chip 標籤**。座標存於 `Application.MapPositionJson`：

  ```json
  { "hotspot": { "cx": 152, "cy": 395 }, "chip": { "cx": 154, "cy": 334 } }
  ```

  seed 值見 [05-database.md](05-database.md) §4。
- 部位清單來自 `GET /applications/body-map`（`slug` ↔ SVG region id）；`ShowOnBodyMap = 0` 或未發布者不渲染。
- `prefers-reduced-motion` 時停用脈動與回彈。

**互動（桌機）**

- hover：區域淡入品牌青填色（10% → 25%，150–200ms ease），浮出 tooltip（部位名 + 產品數，依 locale 單一語言：en `Knee · 16 products` / zh-TW「膝部 · 16 件產品」），游標 pointer。
- click：右側資訊面板切換為該部位（`MapCopy` + 產品數 + `MapCtaLabel` 按鈕）。
- 旁側部位卡 hover 時人體圖同步 highlight（雙向連動）。

**互動（觸控/行動）**

- 無 hover：第一次 tap = 選取（highlight + 資訊面板更新）；面板按鈕才導頁。
- 視窗 < `md` 時人體圖置上、部位卡列表置下；列表本身即為可點的替代入口。

**無障礙與 SEO**

- 每個熱點為可聚焦元素（`role="button"`、`aria-label="Knee"`、focus ring teal 2px）；支援 Tab / Enter。
- 人體圖屬 progressive enhancement：下方的部位卡格為爬蟲與螢幕閱讀器的完整替代內容（同組連結）。

**實作備註**

- SVG 部位 region 以 `data-slug` 對應 API；高亮用 CSS class 切換（不重繪）；tooltip 用 popover / floating-ui。
- 後台編輯座標時提供 SVG 點選取器（點一下人形即填入 `cx`/`cy`），避免手打數字。

---

## 6. Partnership（`partnership`）

| sectionKey | 區段 | 來源 | 欄位 |
|---|---|---|---|
| `hero` | 頁首 | 區段 | `band` media(`page-band`)、`eyebrow` text、`title` text、`lead` text |
| `distributor` | **01** Distributor services | 區段 | `title` text、`body` richtext、`image` media(`section-bg`) |
| `oemOdm` | **02** OEM / ODM services | 區段 | `title` text、`body` richtext、`chips` repeatable(2–6){ `label` text }、`image` media(`wide-16x9`) |
| `becomePartner` | **03** How to become a partner | 區段 | `title` text、`steps` repeatable(3–6){ `title` text、`body` text }、`formTitle` text、`formIntro` text（「within two working days」）、`partnershipTypes` repeatable{ `key` enum(oem\|odm\|distributor)、`label` text }、`submitLabel` text |

表單送出走 `POST /contact` type=`partnership`，欄位：Company、Country、Email、Partnership type、Requirement。

---

## 7. Resources 資源中心

> **前版文件完全缺漏 `/resources` 總覽頁**（IA 樹有、路由表與 Page.Key 皆無）。本版補齊。

### 7.1 總覽（`resources`）

| sectionKey | 區段 | 來源 | 欄位 |
|---|---|---|---|
| `hero` | 頁首（淺青漸層，**無 band 圖**） | 區段 | `eyebrow` text、`title` text、`lead` text |
| `hubCards` | 四大入口卡 | 區段 | `items` repeatable(4){ `icon` enum、`title` text、`body` text、`ctaLabel` text、`link` link } |
| `recentlyPublished` | Recently published（文章/消息混合帶） | 區段 + 動態 | `title` text、`allLink` link、`mode` enum(auto\|manual)、`items` repeatable(0–3){ `article` ref:Article }（`mode=auto` 時忽略 `items`，取最新 3 筆混合） |
| `quickDownloads` | Most requested documents | 區段 + 動態 | `title` text、`allLink` link、`items` repeatable(0–5){ `download` ref:Download } |
| `ctaPanels` | 兩塊底部 CTA | 區段 | `items` repeatable(2){ `title` text、`body` text、`ctaLabel` text、`link` link } |

### 7.2 FAQ（`faq`）

| sectionKey | 來源 | 欄位 |
|---|---|---|
| `hero` | 區段 | `band` media(`page-band`)、`eyebrow`、`title`、`lead` |
| `list` | 區段 + 動態 | 區段：`categoriesLabel` text<br>動態：`GET /faqs?facets=true` → 分類 tab（名稱 + **筆數 count**）+ 手風琴問答 |
| `cta` | 區段 | `title`、`body`、`ctaLabel`、`link`（→ `/contact`） |

輸出 `FAQPage` JSON-LD（見 [06-sitemap.md](06-sitemap.md) §6）。

### 7.3 Insights（`insights`）／ 7.4 News（`news`）／ 7.5 Downloads（`downloads`）

三頁結構同型：

| sectionKey | 來源 | 欄位 |
|---|---|---|
| `hero` | 區段 | `band` media(`page-band`)、`eyebrow`、`title`、`lead` |
| `list` | 區段 + 動態 | 區段：`categoriesLabel` text、`allLabel` text<br>動態：分類 rail（**帶 count**）+ 清單 + 分頁 |

差異：

- **Insights**：分類 = `ArticleCategory(Kind=insight)`（Medical / ESG / Sponsorship）；卡片為 16:10 封面格 + 分頁。
- **News**：分類 = `ArticleCategory(Kind=news)`（Exhibitions / Sponsorship / Company）；`IsFeatured` 的最新一筆進大卡（含摘要），其餘為縮圖列。
- **Downloads**：分類 = `Download.Type`（Catalogue / Certifications / Manuals）；每列顯示 PDF icon、`Title`、`{FileLocale} · {副檔名} · {Description}`、下載連結。

### 7.6 Article Detail（`/insights/{slug}`，`article-detail`）

**內容在實體**（`Article`，`Type = insight`）：

| 版面位置 | 實體欄位 |
|---|---|
| 麵包屑 | Insights → `ArticleCategory` → 標題 |
| 分類 chip | `ArticleCategory` |
| 標題／導言 | `Title` / `Standfirst` |
| meta 行 | `PublishedAt` · `AuthorName` · `ReadMinutes`（「6 min read」） |
| 封面 | `CoverMediaId`（`wide-16x9`） |
| 內文 | `Body` richtext——段落、H2 副標、引言塊（pull-quote）、清單、**含說明的內嵌圖**（`content-16x9`） |
| 文末免責框 | `Disclaimer`；空值套區段 `disclaimerDefault` |
| 標籤 | `ArticleTag` → `Tag` |
| 側欄 TOC | **自動由 `Body` 的 H2 產生**，非欄位 |
| 相關文章 | 自動：同 `ArticleCategory` 最新 3 筆 |

**共用文案區段**：

| sectionKey | 欄位 |
|---|---|
| `labels` | `tocTitle`（`On this page`）、`shareTitle`、`tagsTitle`、`relatedTitle`、`allLink` link |
| `disclaimerDefault` | `body` richtext |
| `promoCard` | `title`、`body`、`ctaLabel`、`link`（側欄「Shop the category」；**可由 `ArticleCategoryTranslation.PromoJson` 逐分類覆寫**） |

### 7.7 News Detail（`/news/{slug}`，`news-detail`）

**內容在實體**（`Article`，`Type = news`；加 `NewsEvent`、`ArticleImage`）：

| 版面位置 | 實體欄位 |
|---|---|
| 麵包屑 / 分類 chip | `ArticleCategory(Kind=news)` |
| 標題／導言／日期／封面 | `Title` / `Standfirst` / `PublishedAt` / `CoverMediaId` |
| 內文 | `Body` richtext（段落、H3 副標、清單） |
| **Event details 面板** | `NewsEvent`：`DatesLabel`（或由 `StartDate`–`EndDate` 產生）、`Venue`、`Booth`、`ContactEmail`、`CtaLabel` + `CtaUrl` |
| 圖庫 | `ArticleImage[]`（0–12） |
| 上一則／下一則 | 自動：同 `Type` 依 `PublishedAt` 前後鄰 |
| 側欄分類清單 | 自動：`ArticleCategory(Kind=news)` + count |
| 更多消息 | 自動：最新 3 筆 |

**共用文案區段**：

| sectionKey | 欄位 |
|---|---|
| `labels` | `eventPanelTitle`（`Event details`）、`datesLabel`、`venueLabel`、`boothLabel`、`contactLabel`、`shareTitle`、`categoriesTitle`、`relatedTitle`、`prevLabel`、`nextLabel` |
| `promoCard` | `title`、`body`、`ctaLabel`、`link`（側欄「Partner with us」） |
| `gallery` | `title` text（圖庫區標題） |

---

## 8. 其他頁

### 8.1 Where to Buy（`where-to-buy`）

| sectionKey | 來源 | 欄位 |
|---|---|---|
| `hero` | 區段 | `band` media(`page-band`)、`eyebrow`、`title`、`lead` |
| `domestic` | 區段 + 動態 | 區段：`title` text（`Taiwan`）<br>動態：`SalesLocation(LocationType=domestic)` → 卡片（`Name`、`Address`、`Note`、`Phone`、`WebsiteUrl`） |
| `international` | 區段 + 動態 | 區段：`title` text<br>動態：`SalesLocation(LocationType=international)`，依 `RegionLabel` 分組 → 列（地區、公司名、網站） |
| `cta` | 區段 | `title`（`Not in your region yet?`）、`body`、`ctaLabel`、`link` |

> 地圖檢視列為 V2。

### 8.2 Contact（`contact`）

| sectionKey | 來源 | 欄位 |
|---|---|---|
| `hero` | 區段 | `eyebrow`、`title`、`lead` |
| `infoPanel` | 區段 + 設定 | `items` repeatable(4){ `label` text、`settingKey` enum(`company.address`\|`company.phone`\|`company.email`\|`company.hours`) }——**值取自 `Setting` / `SettingTranslation`，避免公司資訊兩處維護** |
| `form` | 區段 | `title` text（`Send a message`）、`subjectOptions` repeatable{ `key` text、`label` text }（Product question / Sizing help / Partnership / Other）、`submitLabel` text、`successMessage` text |

表單走 `POST /contact` type=`general`。

### 8.3 Privacy & Legal（`privacy`）

| sectionKey | 來源 | 欄位 |
|---|---|---|
| `hero` | 區段 | `band` media(`page-band`)、`eyebrow`（`Privacy & Legal`）、`title` |
| `content` | 區段 | `lastUpdated` date、`body` richtext（含編號小節） |

### 8.4 全站浮動

`FloatingContact`：右下浮動鈕（Contact us）。AI Agent 待定，UI 預留第二鈕位（見 [CLAUDE.md](../CLAUDE.md) §7）。

---

## 9. Schema Registry

### 9.1 位置與命名

```
api/EuniceMed.Core/PageSchemas/
├── home.heroSlider.json
├── home.featuredProducts.json
├── ...
└── privacy.content.json
```

- JSON Schema Draft 2020-12。檔名即 `{pageKey}.{sectionKey}.json`。
- 每個 schema 的 root 為 `object`，`additionalProperties: false`（防止殘留欄位）。
- 自訂註解關鍵字：`x-fieldType`（對應 §0.3 型別字彙）、**`x-mediaPreset`**（media 欄位必填，值為 [11](11-media-specs.md) §2 的 presetKey）、`x-refEntity`、`x-localeInvariant`（標示可跨語系同步的欄位）。
  > `x-recommendedSize` / `x-maxBytes` **不再手寫於 schema**，由建構時依 `x-mediaPreset` 自 `MediaPresets.json` 展開後回給後台，避免尺寸在多處各寫一份而走鐘。
- `GET /admin/page-schema/{key}` 回傳該頁全部區段 schema，後台以此生成表單；前端型別由同一份 schema 產生 TypeScript（build-time）。

範例（節錄 `about.milestones.json`）：

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["title", "items"],
  "properties": {
    "background": { "type": "string", "format": "uuid",
      "x-fieldType": "media", "x-mediaPreset": "section-bg",
      "x-localeInvariant": true },
    "title": { "type": "string", "maxLength": 120, "x-fieldType": "text" },
    "items": {
      "type": "array", "minItems": 3, "maxItems": 12, "x-fieldType": "repeatable",
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["year", "event"],
        "properties": {
          "year":  { "type": "string", "maxLength": 20,  "x-fieldType": "text", "x-localeInvariant": true },
          "event": { "type": "string", "maxLength": 300, "x-fieldType": "text" }
        }
      }
    }
  }
}
```

### 9.2 richtext 允許標籤集

| 用途 | 允許 |
|---|---|
| 文章內文（`Article.Body`） | `p` `h2` `h3` `strong` `em` `ul` `ol` `li` `blockquote` `figure` `figcaption` `img` `a` |
| 一般區段 richtext | `p` `strong` `em` `ul` `ol` `li` `a` |
| 法務頁（`privacy.content.body`） | 上列 + `h2` `h3` |

伺服器端淨化（白名單制），`a` 強制 `rel="noopener"`，外部連結加 `target="_blank"`。

### 9.3 語系同步

後台每個區段表單提供「**同步至其他語系**」勾選（預設開）。儲存時：

- 標有 `x-localeInvariant` 的欄位（media、link URL、number、enum、年份等）一併寫入另一語系的 `DataJson`。
- 文字欄位不同步。
- repeatable 陣列以**索引**對應；長度不同時以本次儲存的長度為準（另一語系多出的項目刪除、缺少的以空字串補）。

---

## 10. 與前版的對照

| 前版（Weypro 推導） | 本版（mockup4 定案） |
|---|---|
| `PageBlock.BlockType` 字彙：`hero` `richtext` `imageText` `iconText` `iconGrid` `timeline` `gallery` `certBadges` `testimonial` `steps` `cta` | **廢除**。改為 `(PageKey, SectionKey)` + JSON Schema 具名欄位 |
| 可編輯頁 4 個（home / about / partnership / privacy-legal） | **18 個**（13 單例 + 5 模板共用文案） |
| 首頁 hero「雙 CTA」 | mockup4 hero **無 CTA**；改為 3 張輪播 + eyebrow/title/lead |
| 首頁「明星商品輪播」 | **Pinterest 式 masonry：等寬 4 欄、高度不一（版位比例 1:1／4:5／5:4 輪替）+ 底部橫跨全型錄帶**（自動取 `IsFeatured` 共 8 筆；2026-08-14 由「1 直式塔位 + 3 方卡」改版，上傳統一 1:1，落差只由版位比例決定） |
| Insights 以 `Topic` 列舉分類 | `ArticleCategory` 實體（News/Insights 各一組，rail 帶 count） |
| 產品「Specifications & Sizes」 | 拆為 `SpecsJson` + 結構化 `SizeChartJson` |
| 認證為字串陣列 | `Certification` 實體（About 與產品頁共用） |
| `/resources` 無規格 | 本版 §7.1 補齊 5 個區段 |
| News 內頁 = Insights 模板減 topic | News 內頁另有 **Event details 面板**、圖庫、上/下一則、側欄分類 |

---

## 11. 驗收清單

- [ ] 18 頁的每個可見文案／圖片，在本文件都有對應欄位；反向亦然（無多餘欄位）
- [ ] 每個 `sectionKey` 在 [05-database.md](05-database.md) §4 Seed 與 `PageSchemas/` 皆存在
- [ ] 每個 `media` 欄位都有 `x-mediaPreset`，且 preset 存在於 [11-media-specs.md](11-media-specs.md) §2（schema 內無手寫尺寸字串）
- [ ] 首頁 01 Hero products 為等寬多欄 masonry，8 格皆取同一張 `square` 產品主圖；高度落差來自版位比例（`1:1 / 4:5 / 5:4` 輪替）而非文案長短，且 en / zh-TW 版面一致
- [ ] 後台無法新增／刪除／拖曳區段（僅 `IsEnabled`）
- [ ] `DataJson` 寫入時通過 JSON Schema 驗證，違反時回 400 ProblemDetails 並標出欄位路徑
- [ ] 人體圖 4 部位資料由 `GET /applications/body-map` 供給，座標可於後台編輯
- [ ] 語系同步只影響 `x-localeInvariant` 欄位
