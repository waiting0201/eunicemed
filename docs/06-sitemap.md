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
- 允許所有公開頁；**封鎖** `/admin` 與 `/api/`。
- 指向 sitemap：`Sitemap: https://www.eunicemed.com/sitemap.xml`。
- 非正式環境（dev/stg）整站 `Disallow: /` 並加 `noindex`，避免被索引。
- **檢索型 AI 爬蟲逐一列名並允許**（第二組 `User-agent`，見 `app/robots.ts` 的 `AI_CRAWLERS`）。
  訓練型不在這份檔案裡處理 —— 由 Cloudflare 擋。完整說明見 §9。

> ⚠️ **線上的 robots.txt 不只這一份。** Cloudflare 會在我們這段之前接一段
> managed content。改完一定要去線上抓一次確認合併結果，`next start` 看不到那一段。

---

## 5. 每頁 SEO 要件

每頁透過 `generateMetadata` 輸出，且**一律經過 `lib/seo.ts` 的 `pageMetadata()`**——
六項綁在同一支，新頁面不會只做到其中幾項（這正是 2026-09-01 之前的狀況：
19 頁都有 canonical，但只有 3 頁有 Open Graph、全站沒有 Twitter Card）：

- `<title>`、`meta description`（可由 CMS 的 SEO 欄位覆寫，否則用預設範本）
- `canonical`（自身語系絕對網址）
- `hreflang`（en / zh-TW / x-default）
- Open Graph（`og:title`、`og:description`、`og:image`、`og:type`、`og:locale`、`og:url`、`og:site_name`）
- Twitter Card（`summary_large_image`）
- 缺圖時用全站預設 OG 圖 `public/brand/og-default.png`（1200×630，由 `tools/og-image.py` 產生）

> ⚠️ **hreflang 只列該路徑真的有內容的語系**，與 sitemap.xml 同一份判準 ——
> 語系清單來自 `lib/hreflang.ts`（查 `GET /sitemap`，5 分鐘快取，與 `lib/redirects.ts`
> 同一個作法）。**不可以在頁面裡寫死 `{ en, zh-TW }`**：缺翻譯的頁面會 404，
> 那等於對搜尋引擎宣告一個不存在的替代版本。
> 唯一的例外是 contact —— 它整份寫在程式碼裡（沒有 `api.page`），但後端的 sitemap
> 還沒收錄它，所以在該頁以 `locales` 參數明寫。

`SITE_URL` 只有 `lib/site.ts` 一份，頁面不再各自讀 `process.env.NEXT_PUBLIC_SITE_URL`。

---

## 6. 結構化資料（JSON-LD）

節點一律由 `lib/schema.ts` 組出、由 `components/JsonLd.tsx` 輸出（分開是為了
每一段都能單獨貼進 Rich Results 測試工具驗證）。

| 頁面 | Schema | 掛在哪 |
|------|--------|--------|
| 全站（layout） | `Organization`（名稱、logo、地址、電話、母公司、`sameAs`） | `app/[locale]/layout.tsx` |
| 麵包屑 | `BreadcrumbList` | `components/Breadcrumb.tsx`；產品詳情與文章詳情自己刻了麵包屑，各掛一份 |
| 產品詳情 | `Product`（名稱、SKU、圖、描述、品牌、分類、規格） | 產品詳情頁 |
| News / Insights 內文 | `NewsArticle` / `Article` | `components/ArticleDetailPage.tsx` |
| FAQ | `FAQPage`（Question/Answer） | FAQ 頁，**只列篩選後畫面上真的有的題目** |
| Contact | `ContactPage` + `ContactPoint`（含 `hoursAvailable`） | Contact 頁 |
| Where to Buy | `ItemList` of `Organization`（經銷商） | Where to Buy 頁 |

其他頁面共用 layout 的 `Organization`，不再各掛一份；需要指涉品牌的地方一律用
`@id`（`{SITE_URL}/#organization`）指回去。

> **`Product` 沒有 `offers`** —— 本站不是電商，沒有價格。測試工具會提示缺這一欄，
> 那是預期的：捏造價格才是真的錯。
>
> 醫療相關宣稱用詞需經法務/法規審閱，避免不當療效宣稱。**JSON-LD 的文字一律取自
> CMS 既有欄位，不在程式裡另外造句** —— 結構化資料會被逐字引用，自行改寫等於
> 繞過內容端的審閱。

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
- [x] sitemap.xml 含所有已發布頁與 hreflang，lastmod 正確
- [x] robots.txt 正確、非正式環境 noindex
- [x] 每頁 canonical / hreflang / OG / Twitter Card 完整（19 頁，2026-09-01）
- [x] JSON-LD 七種節點皆已輸出（2026-09-01）
- [ ] JSON-LD 通過 Rich Results 測試（**要等正式網域上線才驗得了**）
- [x] 301 轉址涵蓋舊站主要 URL
- [ ] Search Console 已提交並無重大索引錯誤

**已知的內容缺口**（不是程式問題，但會讓結構化資料少欄位）：
- 文章沒上封面 → `Article.image` 缺席，Google 的文章複合式結果需要它
- 產品沒填 summary／SEO 敘述 → `Product.description` 缺席

---

## 9. AI 搜尋（GEO）

搜尋引擎之外，ChatGPT／Claude／Perplexity／Gemini 這類引擎也會來抓，而它們
「一次只讀幾頁就要回答問題」。針對這件事本站做兩件：

**1. `robots.txt` 對 AI 爬蟲表態**（§4）。**政策是「可被引用，不可被訓練」**，
而這件事**由兩個地方合力達成**：

| 誰 | 管哪一半 | 怎麼改 |
|---|---|---|
| Cloudflare（AI Crawl Control 的 managed robots.txt） | 訓練／索引型：`GPTBot`、`ClaudeBot`、`CCBot`、`Google-Extended`、`Amazonbot`、`Applebot-Extended`、`Bytespider`、`meta-externalagent` → `Disallow: /`，並附 `Content-Signal: search=yes,ai-train=no,use=reference` | Cloudflare 後台，**不在這個 repo** |
| `app/robots.ts` 的 `AI_CRAWLERS` | 檢索／回答型：`OAI-SearchBot`、`Claude-SearchBot`、`PerplexityBot`、`ChatGPT-User`… → 明示 `Allow` | 改這支檔案 |

型錄站被摘要引用是曝光而非損失，所以會附出處的那一群全部放行；
拿去訓練是另一回事，那一半連著一則歐盟著作權指令第 4 條的權利保留聲明。

> **踩坑（2026-09-01）**：第一版把訓練型也寫進 `AI_CRAWLERS` 的 `Allow`，
> 於是同一支 `GPTBot` 在同一個 robots.txt 裡有兩個相反的群組。依 RFC 9309
> 同名群組要合併、等長規則取寬鬆者 —— 我們的 `Allow: /` 會蓋過 Cloudflare 的
> `Disallow: /`，等於一邊聲明保留權利一邊放行。**本機完全看不出來**，
> Cloudflare 那段是在邊緣加的，`next start` 抓到的只有我們自己那份。

**2. `/llms.txt`**（`app/llms.txt/route.ts`，格式見 llmstxt.org）。它**不是 sitemap 的替代品**：
sitemap 給爬蟲列出全部網址，llms.txt 給模型「站台是什麼 + 別講錯什麼」。
最有價值的是開頭那幾條前提 —— 沒有它們，模型會把型錄站當成電商而編出價格與購買連結：

- 這是型錄站不是電商，沒有價格、購物車、結帳
- 產品網址的四段結構、三個支撐強度系列（Care／Protect／Advance）
- 雙語但**缺翻譯回 404 不 fallback**，所以英文網址不保證有中文版
- 醫療宣稱來自製造商文案，不可被推廣成醫療建議

分類、子分類與應用方案的目錄由 API 即時帶出（純 SSR，後台改了下一次抓取就是新的）；
後端掛掉時只出骨架，不回 500。

> JSON-LD 對 GEO 同樣重要 —— 模型抽取事實時，結構化資料比散文可靠得多。
> 特別是 `FAQPage`（問答對）與 Where to Buy 的 `ItemList`（「哪裡買得到」是最常被問的一類）。
