# 02 · 前端規格（Next.js）

> 上層導覽見 [CLAUDE.md](../CLAUDE.md)。API 端點見 [04-api.md](04-api.md)；URL/SEO 見 [06-sitemap.md](06-sitemap.md)；各頁區塊構成見 [09-page-blocks.md](09-page-blocks.md)；視覺原則見 [08-design.md](08-design.md)。

---

## 1. 技術與原則

- **Next.js 15（App Router）+ React 19 + TypeScript**
  > ⚠️ **刻意鎖在 15，不用 16。** SWA 的 Next.js hybrid 本身就是 preview 功能，
  > 而其官方文件內容仍是 Next 13/14 時期（連截圖檔名都是 `nextjs-13-`），未宣告支援上限。
  > 在已經是 preview 的部署目標上再疊一個未驗證的大版本，等於同時押兩個未知數。
  > 升級前請先在 SWA 預覽環境實測。
- **託管**：**Azure Static Web Apps（Free 方案）**，採 Next.js **hybrid（純 SSR）**，preview；需設 `output: 'standalone'`（250MB 上限）
- **Tailwind CSS** + 設計 token（品牌色 `#00B5CD`/`#898989`、系列專色與字型規範見 [08-design.md](08-design.md)）；元件集中 `apps/web/components`
- **渲染策略**：**純 SSR（伺服器端渲染）**，每次請求於伺服器取 API 並渲染，確保內容即時與 SEO；**不使用 ISR**。**無 CDN／邊緣快取**，尖峰仰賴 API 端快取與 DB 索引。互動（表單、搜尋、篩選）走 client component。
- **資料來源**：一律經 Functions API（`NEXT_PUBLIC_API_BASE` / 伺服器端 `API_BASE`）
- **i18n**：路由**強制語系前綴** `/[locale]`，預設 `en`，支援 `zh-TW`；根路徑 `/` 重導至預設語系

---

## 2. 目錄結構

```
apps/web/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx              # 語系 layout（header/footer/浮動聯絡鈕/i18n provider）
│   │   ├── page.tsx                # 首頁
│   │   ├── about/page.tsx          # About（品牌故事、里程碑、製造品質、認證）
│   │   ├── products/
│   │   │   ├── page.tsx            # 產品總覽（型錄/篩選）
│   │   │   └── [category]/
│   │   │       ├── page.tsx        # 分類列表
│   │   │       └── [sub]/
│   │   │           ├── page.tsx    # 子分類落地頁（沿用分類版型）
│   │   │           └── [slug]/page.tsx  # 產品詳情
│   │   ├── applications/
│   │   │   ├── page.tsx            # 應用方案總覽（人體圖 + 特殊照護）
│   │   │   └── [slug]/page.tsx     # 應用方案內頁（部位/特殊照護）
│   │   ├── partnership/page.tsx    # OEM/ODM、經銷商、Partner Inquiry 表單
│   │   ├── resources/page.tsx      # 資源中心總覽（四大入口卡、近期文章、熱門下載、CTA）
│   │   ├── faq/page.tsx            # FAQ
│   │   ├── insights/
│   │   │   ├── page.tsx            # Insights 文章列表（醫療/ESG/贊助）
│   │   │   └── [slug]/page.tsx     # 文章內頁
│   │   ├── news/
│   │   │   ├── page.tsx            # News 列表
│   │   │   └── [slug]/page.tsx     # News 內文
│   │   ├── downloads/page.tsx      # 下載中心（型錄/認證文件/使用手冊）
│   │   ├── where-to-buy/page.tsx   # 銷售據點
│   │   ├── privacy/page.tsx        # Privacy & Legal
│   │   └── contact/page.tsx        # Contact（表單）
│   ├── sitemap.ts                  # 動態 sitemap.xml
│   ├── robots.ts                   # robots.txt
│   └── (無 revalidate route — 純 SSR 不需 On-Demand Revalidation)
├── components/                     # UI 元件
├── lib/
│   ├── api.ts                      # API client（fetch 包裝、型別）
│   ├── i18n.ts                     # 語系設定、字典載入
│   └── seo.ts                      # metadata 產生器
├── messages/                       # UI 字串字典 en.json / zh-TW.json
├── public/
└── next.config.ts
```

---

## 3. 路由與頁面對照

> 對應 mockup4 的 18 頁。每頁的可編輯區段與欄位見 [09-page-blocks.md](09-page-blocks.md)。

| 頁面 | 路由 | 渲染 | 對應 API |
|------|------|------|----------|
| 首頁 | `/[locale]` | SSR | `GET /pages/home`、`GET /products?featured=true&pageSize=4`、`GET /news?pageSize=3` |
| About | `/[locale]/about` | SSR | `GET /pages/about` |
| 產品總覽 | `/[locale]/products` | SSR | `GET /pages/products`、`GET /categories`、`GET /products?facets=true` |
| 分類列表 | `/[locale]/products/[category]` | SSR | `GET /pages/product-category`、`GET /categories/{category}`、`GET /products?category=&facets=true` |
| 子分類落地頁 | `/[locale]/products/[category]/[sub]` | SSR | `GET /pages/product-category`、`GET /sub-categories/{category}/{sub}`、`GET /products?subCategory=&facets=true` |
| 產品詳情 | `/[locale]/products/[category]/[sub]/[slug]` | SSR（詢價區 client） | `GET /pages/product-detail`、`GET /products/{category}/{sub}/{slug}`、`POST /contact`（type=product） |
| 應用方案總覽 | `/[locale]/applications` | SSR（人體圖 client） | `GET /pages/applications`、`GET /applications/body-map`、`GET /applications?type=special-care` |
| 應用方案內頁 | `/[locale]/applications/[slug]` | SSR | `GET /pages/application-detail`、`GET /applications/{slug}` |
| Partnership | `/[locale]/partnership` | SSR 殼 + client 表單 | `GET /pages/partnership`、`POST /contact`（type=partnership） |
| **Resources 總覽** | `/[locale]/resources` | SSR | `GET /pages/resources`（`refs` 已含文章與下載） |
| FAQ | `/[locale]/faq` | SSR | `GET /pages/faq`、`GET /faqs?facets=true` |
| Insights 列表 | `/[locale]/insights` | SSR | `GET /pages/insights`、`GET /insights?category=&facets=true&page=` |
| Insights 內頁 | `/[locale]/insights/[slug]` | SSR | `GET /pages/article-detail`、`GET /insights/{slug}` |
| News 列表 | `/[locale]/news` | SSR | `GET /pages/news`、`GET /news?category=&facets=true&page=` |
| News 內頁 | `/[locale]/news/[slug]` | SSR | `GET /pages/news-detail`、`GET /news/{slug}`（含 event / gallery / prev / next） |
| 下載中心 | `/[locale]/downloads` | SSR | `GET /pages/downloads`、`GET /downloads?facets=true` |
| Where to Buy | `/[locale]/where-to-buy` | SSR | `GET /pages/where-to-buy`、`GET /sales-locations` |
| Contact | `/[locale]/contact` | SSR 殼 + client 表單 | `GET /pages/contact`、`GET /settings`、`POST /contact` |
| Privacy & Legal | `/[locale]/privacy` | SSR | `GET /pages/privacy` |

> 全頁純 SSR（每請求渲染、內容即時、發布後立即反映）。**不使用 ISR / On-Demand Revalidation**；本案無 Front Door/CDN，尖峰流量由 API 端快取與 DB 索引吸收（見 [07-azure-deployment.md](07-azure-deployment.md)）。
>
> **模板頁的 `GET /pages/{key}`** 只取共用 labels 與 CTA 文案（[09](09-page-blocks.md) §0.2），主要內容來自實體端點。兩者於 Server Component 內並行 `Promise.all` 取得。
>
> **篩選一律走 query string**（`?collection=`、`?bodyPart=`、`?sub=`），不產生可索引 URL；子分類是唯一有獨立 URL 的產品維度（見 [06-sitemap.md](06-sitemap.md) §2）。

---

## 4. i18n 多語系

- 採 `next-intl`（或等效）：
  - middleware 偵測 `/[locale]` 前綴並重導；預設 `en`。
  - UI 字串放 `messages/{locale}.json`；**內容**（產品/News）由 API 依 `locale` 回傳。
- **語言純度**（[08-design.md](08-design.md) §5.2）：每語系頁面單一語言——`en.json` 內不得有中文、`zh-TW.json` 內不得有英文（品牌符號/系列名/認證縮寫/型號除外）；API 內容缺該語系翻譯時整塊隱藏，不 fallback 露出他語。CI 可加 lint：掃 `messages/en.json` 含 CJK 字元、`zh-TW.json` 含連續英文詞即報錯。
- 每頁輸出 `hreflang`（en / zh-TW / x-default）與 `canonical`，見 [06-sitemap.md](06-sitemap.md)。
- 語系切換器保留當前頁路徑，僅換前綴。

```ts
// lib/api.ts 取內容時帶 locale —— 純 SSR，每請求即時取資料
export async function getProduct(
  category: string, sub: string, slug: string, locale: string,
) {
  const res = await fetch(
    `${API_BASE}/v1/products/${category}/${sub}/${slug}?locale=${locale}`,
    { cache: "no-store" }, // 純 SSR；不使用 ISR
  );
  if (!res.ok) return null;              // 三段歸屬不符時 API 回 404
  return res.json() as Promise<ProductDto>;
}

// 模板頁：共用文案與實體內容並行取得
export async function getProductPage(
  category: string, sub: string, slug: string, locale: string,
) {
  const [page, product] = await Promise.all([
    getPage("product-detail", locale),
    getProduct(category, sub, slug, locale),
  ]);
  return { page, product };
}
```

---

## 5. 資料抓取規範

- **Server Component** 內直接 `await` API：一律 `cache: 'no-store'`（純 SSR、每請求即時）。**不使用 `next.revalidate` / ISR**。
- 失敗處理：列表頁回空狀態、詳情頁 `notFound()`（404）。
- 不在 client 暴露內部 API 金鑰；公開讀取端點匿名即可。
- 共用型別（DTO）由 API 文件定義，前端置於 `lib/types.ts`。

---

## 6. 元件清單（重點）

| 元件 | 說明 |
|------|------|
| `Header` / `MegaMenu` | 主導覽（About/Products/Applications/Partnership/Resources）、Where to Buy CTA、語系切換 |
| `ResourcesSubNav` | Resources 次導覽（Overview｜FAQ｜Insights｜Downloads｜News）——**固定於模板，不由 CMS 編輯** |
| `Footer` | 公司資訊、Contact、Latest News、Privacy & Legal、Where to Buy、LinkedIn |
| `FloatingContact` | 浮動聯絡按鈕（Contact us；AI Agent 待定，預留擴充位） |
| `HeroSlider` | 首頁 3 張輪播（自動輪播 + 圓點指示；`prefers-reduced-motion` 時停在第一張） |
| `PageHero` | 內頁頁首 band（preset `page-band`）+ eyebrow / title / lead |
| `SectionNumber` | 區段編號 `01`–`05`（由版面順序產生，非資料欄位） |
| `StatsRow` | 分類／應用方案頁的 3 組統計（`value` 為 `auto` 時由 API 代入產品數） |
| `ProductCard` | 型錄卡（**圖一律 1:1** `object-fit: cover`、名稱、分類、Collection 標籤—用系列專色，見 [08-design.md](08-design.md)）；`size` prop 只改顯示寬，不改圖片來源 |
| `FeaturedProducts` | 首頁 01 區：**Pinterest 式 masonry**——CSS `columns: 4` + 卡片 `break-inside: avoid`，等寬、高度不一、逐欄往下堆疊（`md` 2 欄、`sm` 1 欄），下方為**整排橫跨的全型錄漸層帶**。卡片依版位順序輪替 `1:1 / 4:5 / 5:4`，全部取同一張 1:1 產品主圖並以 `object-fit: cover` 裁切（4:5 裁左右各 10%、5:4 裁上下各 10%）。**落差由版位比例決定，不得依賴文案長短**；DOM 順序＝`FeaturedSortOrder`（a11y/SEO 順序正確） |
| `ProductFilter` / `FacetRail` | 篩選列與分類 rail（帶筆數 count，資料來自 `?facets=true`；client） |
| `SubCategoryFilter` | 子分類篩選 chip；子分類同時是可索引落地頁連結 |
| `ProductGallery` | 產品圖輪播 + 縮圖 |
| `FeatureIcons` | 產品特色（icon + 標題 + 說明，2–6 項） |
| `SpecTable` / `SizeChart` | 規格表；尺寸對照表（尺碼欄頭 + 量測列 + 註腳，量測部位顯示於標題括號） |
| `CertBadges` | 認證標章列（資料來自 `Certification` 實體，About 與產品頁共用） |
| `RelatedProducts` | 相關產品 4 格（人工指定優先，未指定時自動計算；卡圖 1:1，與型錄卡同一張圖） |
| `InquiryForm` | 產品詢價表單（client，`POST /contact` type=product，帶 slug 與 SKU） |
| `BodyPartMap` | 應用方案人體圖互動選取（client；hover 高亮/tooltip、tap 資訊面板、a11y 替代入口——完整互動規格見 [09-page-blocks.md](09-page-blocks.md) §5.3） |
| `ApplicationCard` | 應用方案卡（部位 / 特殊照護） |
| `TestimonialSection` | 客戶見證（主引言 + 迷你引言 + 影片版位 + 浮動 chip） |
| `FaqAccordion` | FAQ 分類 tab（帶 count）+ 折疊清單 |
| `ArticleCard` / `ArticleBody` | News/Insights 卡片與內文渲染（含 pull-quote、附說明內嵌圖、免責框） |
| `ArticleToc` | 文章側欄目錄，由內文 H2 自動產生 |
| `ArticleSideRail` | 側欄（TOC / 分享 / 促購卡 / 分類清單） |
| `EventFactsPanel` | News 內頁「Event details」面板（Dates / Venue / Booth / Contact + 預約按鈕） |
| `PrevNextNav` | News 內頁上一則／下一則 |
| `DownloadList` | PDF 下載清單（列顯示 `標題` + `EN · PDF · 說明`） |
| `LocationList` | 銷售據點（台灣卡片 / 國際依地區分組兩種呈現） |
| `PartnerInquiryForm` | 成為合作夥伴表單（client，`POST /contact` type=partnership） |
| `ContactForm` | 表單 + 驗證 + reCAPTCHA |
| `CtaBand` / `CtaPanels` | 頁尾 CTA 帶（可帶背景照）／Resources 雙欄 CTA |
| `Breadcrumb` / `Pagination` | 導覽輔助（產品麵包屑為 Category → SubCategory → Product 三層） |

---

## 7. 表單（Contact / Inquiry）

- 三種表單共用同一提交端點 `POST /api/contact`，以 `type` 區分：
  - `general`（Contact 頁）
  - `product`（產品詳情頁詢價，附 `productSlug`）
  - `partnership`（Partnership 頁，附公司/國家欄位）
- client component + zod 驗證；reCAPTCHA v3 token 隨送。
- 成功顯示確認、失敗顯示錯誤。
- 防濫用：honeypot 欄位 + 前端節流；真正防護在 API 端。

---

## 8. 效能與 SEO

- 圖片：`next/image` + Blob 網域白名單（`remotePatterns`）；WebP/AVIF；尺寸標註避免 CLS。
- ⚠️ **圖片位元組不得經過 SWA**：`next/image` 預設會由 SWA managed backend 代為優化並輸出，會直接吃掉 SWA Free 的 **100GB/月**頻寬（超額即中斷，無法加購）。因此採 **custom loader**（或 `images.unoptimized`）直接指向 Blob 上已依 preset 產生的尺寸變體，讓流量由 Blob 出。
- **圖片來源已於上傳時依 preset 正規化**（見 [11-media-specs.md](11-media-specs.md)）：API 回的 master 寬度即 preset 寬，前端只需給 `sizes` 讓 `next/image` 產生響應式尺寸，**不再於各版位挑不同來源圖**。產品圖全站 1:1，版位大小差異一律以 CSS 控制。
- 字型：`next/font/local` 自託管，避免外部請求；英文用 `reference/fonts/myriad-variable-concept/MyriadVariableConcept.woff2`（variable font，`font-weight: 300 900`）、中文以 Noto Sans TC 為 web 替代，詳見 [08-design.md](08-design.md) §4。
- 每頁 `generateMetadata` 產生 title/description/canonical/OG/hreflang。
- 結構化資料（JSON-LD）：`Organization`、`Product`、`BreadcrumbList`、`Article`（News）。
- 目標：Lighthouse ≥ 90、Core Web Vitals 綠。
- SSR 效能：無邊緣快取可用，改以 SSR 回應加 `Cache-Control: public, s-maxage=..., stale-while-revalidate=...`（給瀏覽器與中間代理）＋ API 端記憶體快取降低 TTFB；熱門頁的 DB 查詢務必走索引。

---

## 9. 託管（Azure Static Web Apps — Free 方案）

- Next.js 以 **hybrid（SSR）** 部署於 **SWA Free**（preview）；SSR 由 SWA 受管 runtime 執行。
- **必要設定**：`next.config` 設 **`output: 'standalone'`**，控制應用體積於 **250MB** 上限內（Free 限制）。
- **限制**：SWA「linked API」（整合外部 Azure Functions/App Service）在 hybrid 模式下不支援 → 本專案 API 為**獨立 Function App**，由 SSR 端以 HTTP（`API_BASE`）直接 fetch，**不**走 SWA linked API。
- hybrid Next.js 仍為 **preview**：留意功能演進；正式上線前驗證建置產物與冷啟動表現。
- ⚠️ **`staticwebapp.config.json` 的 navigation fallback 在 hybrid 模式不支援**，且該檔設定會覆蓋 `next.config.js`。**所有 redirect / rewrite / 語系 fallback 一律寫在 `next.config.js`**，該檔只留必要的安全標頭與 noindex。
- ⚠️ **必須放行 SWA 健康檢查路徑 `/.swa/health.html`**。本站有語系前綴 middleware（`/` → `/en`），若未排除會導致部署驗證失敗：
  ```js
  // middleware.ts
  export const config = { matcher: ['/((?!.swa).*)'] }
  ```
  `next.config.js` 的 `redirects()` / `rewrites()` 也要用同樣的 `(?!.swa)` 排除。
- **SWA CLI 的本機模擬與部署對 hybrid 不支援** → 本機一律 `next dev`。
- **`/admin` 後台掛在同一個 app**（方案只有一個 SWA）：以 client-side React 區塊實作，不做 SSR、`noindex`，其打包體積計入 250MB 上限。
- 自訂網域 `www.eunicemed.com` + apex（Free 上限 **2 個**）+ SWA 免費受管 TLS；**無 Front Door，故無 CDN/WAF**，安全標頭改由 Next.js `headers()` 輸出（見 [07-azure-deployment.md](07-azure-deployment.md) §7）。
- 部署由 GitHub Actions 觸發（`web.yml`，含 admin build 與 250MB gate）。
- ⚠️ **monorepo 下 standalone 產物會巢狀**：pnpm workspace 中 `server.js` 實際位於
  `.next/standalone/apps/web/server.js`，SWA 文件給的複製指令
  （`cp -r .next/static .next/standalone/.next/`）會把檔案放到沒人讀的位置 ——
  **build 完全成功，但部署後 CSS 與字型 404**。正確做法見 `apps/web/package.json` 的
  `postbuild`，該 script 一併執行 250MB gate（`scripts/check-size.mjs`）。
- ⚠️ **不要加 `generateStaticParams`**：加了之後 `next build` 會把該路由預先靜態化
  （輸出標成 `● SSG`），後台發布的內容要等下次部署才看得到，且無任何錯誤提示。
  本站用 `export const dynamic = 'force-dynamic'`，**驗收條件是 build 輸出全部為 `ƒ Dynamic`**。

---

## 10. 環境變數（前端）

| 變數 | 用途 |
|------|------|
| `API_BASE` | 伺服器端呼叫 API 的基底 URL（`https://func-eunicemed-prod.azurewebsites.net/api`） |
| `NEXT_PUBLIC_API_BASE` | `/admin` SPA 由瀏覽器呼叫 API 用（需 Function App 端開 CORS） |
| `NEXT_PUBLIC_SITE_URL` | 正式網域（canonical/sitemap） |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA 前端金鑰 |
| `NEXT_PUBLIC_MEDIA_BASE` | Blob 媒體基底網址（`https://{account}.blob.core.windows.net/media`） |

> 這些變數需**同時**設在 GitHub Actions 的 build step（build-time）與 SWA 資源的 Environment variables（request-time），否則 SSR 端會取不到值。

---

## 11. 驗收清單
- [ ] 頁面以純 SSR 渲染（無 ISR），含正確 metadata、hreflang、canonical
- [ ] 部署於 SWA Free（hybrid）、`output: 'standalone'`、產物 < 250MB、SSR 正常
- [ ] middleware 與 `next.config.js` 的 redirects/rewrites 已排除 `.swa` 路徑，部署驗證通過
- [ ] 圖片走 Blob 直連（custom loader / `unoptimized`），未經 SWA 圖片優化端點
- [ ] 所有路由帶語系前綴，多語系切換正確、內容隨 locale 變動
- [ ] mockup4 的 18 頁全部有對應路由（含 `/resources` 與子分類落地頁）
- [ ] 產品篩選/分頁/麵包屑可用；麵包屑為 Category → SubCategory → Product 三層
- [ ] 分類 rail 的筆數 count 正確（來自 `?facets=true`，非前端自算）
- [ ] 人體圖 4 部位可用鍵盤操作，下方部位卡為完整替代入口
- [ ] Contact 表單前後端驗證 + reCAPTCHA
- [ ] sitemap.xml / robots.txt 正確
- [ ] Lighthouse ≥ 90、無重大 a11y 問題
