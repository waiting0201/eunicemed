# 06 · Sitemap、URL 結構與 SEO

> 上層導覽見 [CLAUDE.md](../CLAUDE.md)。前端實作見 [02-frontend.md](02-frontend.md)。

---

## 1. 資訊架構（IA / 網站地圖）

> IA 源自 `reference/sbk/EuniceMed Website Ref_Weypro.pdf`（subkarma 提案 260626 V01），**並以客戶定案的 `mockup4/` 18 頁為準**。
> 各頁區段與可編輯欄位見 [09-page-blocks.md](09-page-blocks.md)。

**Header 導覽**：Logo｜About 關於我們｜Products 產品｜Applications 應用方案｜Partnership 合作夥伴｜Resources 資源中心｜**Where to Buy 銷售據點**（強調 CTA）｜語系切換 EN/中
**浮動按鈕**：Contact us 聯絡我們（＋ AI Agent，列 open question）
**Footer**：Logo｜Contact Us｜Latest News｜Privacy & Legal｜Where to Buy｜LinkedIn

```
Home  /[locale]
│     （Banner/品牌影片、明星商品、應用方案總覽(icon)、Why Partner、
│       客戶見證(video/文章)、最新消息）
├── About 關於我們               /[locale]/about
│     （品牌故事與承諾、企業發展里程碑、製造與品質(廠房照片)、各項認證）
├── Products 產品               /[locale]/products
│   └── 分類列表                 /[locale]/products/{category}
│       │     medical-compression-stockings | orthopedic-support | footcare-insoles
│       └── 子分類落地頁          /[locale]/products/{category}/{sub}
│           │     17 筆（knee-support、travel-stockings、silicone…，見 05 §4）
│           └── 產品詳情          /[locale]/products/{category}/{sub}/{product-slug}
│                 （Features、Use Cases、Specifications & Size chart、Certifications、
│                   Downloads、Related Products、Inquiry 詢價）
├── Applications 應用方案        /[locale]/applications
│   ├── 依部位（膝/踝/腰背/足…，人體圖互動） /[locale]/applications/{slug}
│   └── 特殊照護（老人照護、拇趾外翻…）      /[locale]/applications/{slug}
├── Partnership 合作夥伴         /[locale]/partnership
│     （OEM/ODM 服務、經銷商服務、成為合作夥伴 Partner Inquiry 表單）
├── Resources 資源中心           /[locale]/resources
│   │     （總覽頁：四大入口卡、近期文章/消息、熱門下載、Contact/Partnership CTA；
│   │       子頁共用 Resources 次導覽列 Overview｜FAQ｜Insights｜Downloads｜News）
│   ├── FAQ 常見問題             /[locale]/faq
│   ├── Insights 文章列表        /[locale]/insights（topic：醫療/ESG/贊助）
│   │   └── 文章內頁             /[locale]/insights/{article-slug}
│   ├── Downloads 下載中心       /[locale]/downloads（型錄/認證文件/使用手冊）
│   └── Latest News 最新消息     /[locale]/news
│       └── 內文                 /[locale]/news/{news-slug}
├── Where to Buy 銷售據點        /[locale]/where-to-buy
├── Contact                     /[locale]/contact
└── Privacy & Legal             /[locale]/privacy
```

語系：`en`（預設）、`zh-TW`。`/` 自動依偏好重導至 `/en`。

> **產品 URL 為四段** `/{locale}/products/{category}/{sub}/{slug}`。子分類是唯一產生可索引 URL 的產品維度——其餘篩選（Collection、BodyPart）走 query string。
> 四段而非「子分類頁與產品頁同層」，是為了避開 `/products/{category}/{X}` 無法靜態區分「X 是子分類還是產品」的歧義。
> 舊 IA 轉址：`/behind-the-motion → /about`、`/download → /downloads`（見 §7）。

---

## 2. URL 規範

| 規則 | 說明 |
|------|------|
| 語系前綴 | 每個 URL 皆帶 `/{locale}`（`/en/...`、`/zh-TW/...`） |
| slug | 小寫、連字號分隔、不含語系字、穩定不變（改名走 Redirect） |
| 結尾斜線 | 無 trailing slash（統一） |
| 大小寫 | 全小寫 |
| 分頁 | News/Insights 用 `?page=2`（canonical 指自身，非第一頁） |
| 篩選 | 產品/文章篩選（collection、bodyPart、文章 category）用 query string，**非**建立可索引 URL（避免重複內容） |
| 子分類 | **例外**：子分類為可索引落地頁 `/products/{category}/{sub}`，並成為產品 URL 的第三段。內容不足者以 `Status=0` 不發布，避免 thin page（見 [05-database.md](05-database.md) §6） |

---

## 3. sitemap.xml

由 Next.js `app/sitemap.ts` 動態產生，資料來源 `GET /api/sitemap`：

- 列出所有**已發布**且可索引的頁面（靜態頁 + 分類 + **子分類** + 產品 + 應用方案 + News/Insights + 下載中心）。
- 每筆含 `loc`、`lastmod`（內容 `UpdatedAt`）、`changefreq`、`priority`。
- 多語系以 `xhtml:link rel="alternate" hreflang="..."` 列出各語系版本。
- 規模大時拆分 sitemap index（如 `sitemap-products.xml`、`sitemap-news.xml`）。

```xml
<url>
  <loc>https://www.eunicemed.com/en/products/orthopedic-support/knee-support/knee-support-iu</loc>
  <lastmod>2026-01-10</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
  <xhtml:link rel="alternate" hreflang="en"    href="https://www.eunicemed.com/en/products/orthopedic-support/knee-support/knee-support-iu"/>
  <xhtml:link rel="alternate" hreflang="zh-TW" href="https://www.eunicemed.com/zh-TW/products/orthopedic-support/knee-support/knee-support-iu"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://www.eunicemed.com/en/products/orthopedic-support/knee-support/knee-support-iu"/>
</url>
```

### priority / changefreq 建議
| 頁型 | priority | changefreq |
|------|----------|-----------|
| 首頁 | 1.0 | daily |
| 分類列表 / Applications 總覽 | 0.9 | weekly |
| **子分類落地頁** | 0.8 | weekly |
| 產品詳情 / 應用方案內頁 | 0.8 | weekly |
| Partnership / Where to Buy | 0.7 | monthly |
| News/Insights 內文 | 0.7 | monthly |
| Resources 總覽 / Downloads / About / FAQ | 0.6 | monthly |
| Contact / Privacy | 0.4 | yearly |

---

## 4. robots.txt

由 `app/robots.ts` 產生：
- 允許所有公開頁；**封鎖** `admin.` 子網域與 `/api/`。
- 指向 sitemap：`Sitemap: https://www.eunicemed.com/sitemap.xml`。
- 非正式環境（dev/stg）整站 `Disallow: /` 並加 `noindex`，避免被索引。

---

## 5. 每頁 SEO 要件

每頁透過 `generateMetadata` 輸出：
- `<title>`、`meta description`（可由 CMS 的 SEO 欄位覆寫，否則用預設範本）
- `canonical`（自身語系絕對網址）
- `hreflang`（en / zh-TW / x-default）
- Open Graph（`og:title`、`og:description`、`og:image`、`og:type`、`og:locale`）
- Twitter Card
- 產品/News 缺圖時用全站預設 OG 圖

---

## 6. 結構化資料（JSON-LD）

| 頁面 | Schema |
|------|--------|
| 全站（layout） | `Organization`（名稱、logo、地址、電話、社群 `sameAs`，含 LinkedIn） |
| 麵包屑 | `BreadcrumbList` |
| 產品詳情 | `Product`（名稱、圖、描述、品牌、分類） |
| News / Insights 內文 | `Article`（標題、作者、日期、圖） |
| FAQ | `FAQPage`（Question/Answer） |
| Contact / Where to Buy | `LocalBusiness` / `Organization` 含 `address`、`telephone` |

> 醫療相關宣稱用詞需經法務/法規審閱，避免不當療效宣稱。

---

## 7. 內容遷移與轉址（SEO 保值）

- 舊站 URL → 新站 URL 對照表存入 `Redirect`（301）。
- 本次 IA 改版固定轉址：`/{locale}/behind-the-motion → /{locale}/about`、`/{locale}/download → /{locale}/downloads`。
- **產品 URL 轉址**（子分類進 URL 後）：
  - `/{locale}/products/{slug}` → `/{locale}/products/{category}/{sub}/{slug}`
  - `/{locale}/products/{category}/{slug}` → `/{locale}/products/{category}/{sub}/{slug}`
  - 兩者皆由 `GET /products/by-slug/{slug}` 解析出完整路徑後 301。因舊站尚未上線，此規則主要用於舊 Squarespace 站的既有曝光（見 [10-legacy-content.md](10-legacy-content.md) §5.4、§10）。
- 舊 `?topic=` 文章篩選參數 301 至 `?category=`。
- Next.js middleware 或 `next.config` redirects 讀取套用。
- 上線後於 Google Search Console 提交新 sitemap、監控 404 與索引狀態。

---

## 8. 驗收清單
- [ ] sitemap.xml 含所有已發布頁與 hreflang，lastmod 正確
- [ ] robots.txt 正確、非正式環境 noindex
- [ ] 每頁 canonical / hreflang / OG 完整
- [ ] JSON-LD 通過 Rich Results 測試
- [ ] 301 轉址涵蓋舊站主要 URL
- [ ] Search Console 已提交並無重大索引錯誤
