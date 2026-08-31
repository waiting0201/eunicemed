# 04 · API 規格（Azure Functions）

> 上層導覽見 [CLAUDE.md](../CLAUDE.md)。資料模型見 [05-database.md](05-database.md)；頁面區段與欄位語意見 [09-page-blocks.md](09-page-blocks.md)。
>
> **本版為 mockup4 定案版**（2026-08），取代 2026-07 版之產品／文章端點形狀。
> 破壞性差異（**尚無實作，故直接改寫 v1、不升 v2**）：
> - `GET /products/{slug}` → `GET /products/{category}/{sub}/{slug}`（子分類進 URL）
> - `GET /insights?topic=` → `?category=`（Topic 列舉改 `ArticleCategory` 實體）
> - `GET /pages/{key}` 的 key 由 4 個放寬為 18 個，回應結構由 `blocks[]` 改為 `sections{}`
> - 各清單端點新增 `?facets=true`（分類 rail 的筆數 count）

---

## 1. 通則

- **平台**：Azure Functions v4、.NET 10 isolated worker、C#、HTTP trigger。
- **基底**：`https://{host}/api`（`host.json` 的 `routePrefix`）

> ⚠️ **URL 沒有版本段。** 本文件早期寫 `/api/v1`，實作從來沒有 ——
> `AppRouter` 比對的是 `["collections"]` 這種形狀。把前端的 `API_BASE`
> 設成 `/api/v1` 會讓每一頁 SSR 都 500，而 API 自己完全正常
> （2026-08-19 上線時實際發生過，見 [07 §13](07-azure-deployment.md)）。
- **格式**：JSON（UTF-8）；request/response 皆 camelCase。
- **版本**：URL 前綴 `v1`。破壞性變更升 `v2`。
- **語系**：讀取端點吃 `?locale=en|zh-TW`（預設 `en`）。
- **CORS**：僅允許前端與後台網域。
- **HTTPS only**、HSTS、最小權限。

### 端點分類
| 類別 | 路徑前綴 | 驗證 |
|------|----------|------|
| 公開讀取 | `/api/*` | 匿名 |
| 後台讀寫 | `/api/admin/*` | JWT + 角色 |
| 認證 | `/api/auth/*` | 視端點 |

---

## 2. 驗證與授權

- 後台登入 `POST /auth/login` → 回 `accessToken`（JWT，短效 15m）+ `refreshToken`（長效、輪替）。
- 受保護端點帶 `Authorization: Bearer {accessToken}`。
- JWT claims：`sub`、`role`、`name`、`exp`。角色：`Admin`/`Editor`/`Author`/`Viewer`（見 [03-cms.md](03-cms.md)）。
- 簽章金鑰存 **Function App 的 App Settings**（`Jwt__SigningKey`，本案無 Key Vault）；token 失效採短效 + refresh 輪替。

```
POST /api/auth/login        { email, password } → { accessToken, refreshToken, user }
POST /api/auth/refresh      { refreshToken } → { accessToken, refreshToken }
POST /api/auth/logout       (撤銷 refresh token)
```

---

## 3. 標準慣例

### 3.0 統一回應信封（ApiResponse）

**所有端點**（成功與失敗）皆回傳同一個信封，與 Jabez 專案一致：

```json
{
  "success": true,
  "data":    { /* 實際內容，失敗時為 null */ },
  "message": "Success",
  "errors":  [],
  "timestamp": "2026-08-17T08:53:14.7342560+00:00"
}
```

- `data` 為 `null` 時序列化會省略該欄位（`JsonIgnoreCondition.WhenWritingNull`）。
- 前端取值一律先解到 `.data`（Angular/Next.js 端可用 interceptor 統一 unwrap）。
- 實作於 `Api/Common/ApiResponse.cs`，Handler 一律寫 `ApiResponse.Ok(dto)` / `ApiResponse.Fail(msg, detail)`。

### 3.1 分頁
查詢參數 `page`（1 起）、`pageSize`（預設 20、上限 100）。分頁結果放在信封的 `data` 內：

```json
{
  "success": true,
  "data": {
    "items": [ /* ... */ ],
    "totalCount": 137,
    "page": 1,
    "pageSize": 20,
    "totalPages": 7
  },
  "message": "Success", "errors": [], "timestamp": "…"
}
```

> 注意欄位名為 `totalCount`（不是 `total`），與 `Api/Common/PagedResult.cs` 一致。
> 清單端點若**未帶**任何分頁參數，回傳平面陣列而非 `PagedResult`（供下拉選單使用）。

### 3.2 錯誤格式

**不使用 RFC 7807 ProblemDetails。** 錯誤沿用同一個 `ApiResponse` 信封：

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    "The 'email' field is required.",
    "traceId:0HNC9M2K3P4Q5"
  ],
  "timestamp": "…"
}
```

- `errors` 是**字串陣列**（不是 field → messages 的 map）。欄位級錯誤請寫成 `"email: required"` 這種可讀字串。
- 本案無 Application Insights，因此每筆錯誤的 `errors` 最後一項一律附 `traceId:{id}`，同一個 id 也寫進結構化 log，可在 Function App log stream 反查。
- 頁面區段的 JSON Schema 驗證失敗時，`errors` 每一項以 **JSON Pointer** 開頭：`"/items/2/year: maxLength"`。
- 全部由 `Api/Middleware/ExceptionMiddleware.cs` 統一輸出；Handler 拋 `AppException.*`（見 `Api/Common/AppException.cs`）或直接回 `BadRequestObjectResult(ApiResponse.Fail(...))`。

| 狀態碼 | 意義 |
|--------|------|
| 200/201/204 | 成功 / 建立 / 無內容 |
| 400 | 驗證錯誤 |
| 401 / 403 | 未驗證 / 無權限 |
| 404 | 找不到資源 |
| 409 | 衝突（如 slug 重複） |
| 429 | 限流 |
| 500 | 伺服器錯誤 |

---

## 4. 公開讀取端點

### 分面計數（facets）

清單頁的分類 rail 需顯示筆數（FAQ、Insights、News、Downloads、產品篩選）。加 `?facets=true` 時，回應多一個 `facets` 物件；後端以單次 `GROUP BY` 取回，不逐項 count。

```json
{
  "items": [ /* ... */ ], "page": 1, "pageSize": 20, "total": 8, "totalPages": 1,
  "facets": {
    "categories":    [ { "slug": "medical", "label": "Medical", "count": 8 } ],
    "subCategories": [ { "slug": "knee-support", "label": "Knee Support", "count": 6 } ],
    "collections":   [ { "slug": "protect", "label": "Protect", "count": 12 } ],
    "bodyParts":     [ { "slug": "knee", "label": "Knee", "count": 16 } ]
  }
}
```

`facets` 的計數**不受同維度篩選影響**（選了 Medical 之後，其他分類仍顯示各自總數），但受其他維度篩選影響。

---

### 產品
```
GET /api/products
    ?locale=en&category={slug}&subCategory={slug}&collection={slug}&bodyPart=knee
    &featured=true&facets=true&page=1&pageSize=20&sort=newest|name|collection
GET /api/products/{category}/{sub}/{slug}?locale=en    # 公開產品詳情（與 URL 同構）
GET /api/products/by-slug/{slug}?locale=en             # 扁平查詢：預覽、後台、舊 URL 301 解析
```

- `featured=true` 時依 `Product.FeaturedSortOrder` 排序（首頁 01 Hero products）；回應含 `towerImage`。
- 路徑三段（category / sub / slug）皆會驗證歸屬；不符時回 404（不做寬鬆比對，避免重複內容）。

`ProductListItemDto`（列表卡／精選卡）：
```json
{
  "slug": "knee-support-iu", "name": "Knee Support IU", "sku": "CPO-1603",
  "category": { "slug": "orthopedic-support", "name": "Orthopedic Support" },
  "subCategory": { "slug": "knee-support", "name": "Knee Support" },
  "collection": { "slug": "protect", "name": "Protect" },
  "bodyParts": ["knee"],
  "image": { "url": "https://cdn/…", "alt": "…" },
  "towerImage": { "url": "https://cdn/…", "alt": "…" },
  "featuredBlurb": "Targeted stability for high-load movement.",
  "url": "/en/products/orthopedic-support/knee-support/knee-support-iu"
}
```

`ProductDto`（詳情，欄位對應 [09](09-page-blocks.md) §4.3 的 7 個區塊）：
```json
{
  "id": "…", "slug": "knee-support-iu", "sku": "CPO-1603",
  "name": "Knee Support IU",
  "category":    { "slug": "orthopedic-support", "name": "…" },
  "subCategory": { "slug": "knee-support", "name": "…" },
  "collection":  { "slug": "protect", "name": "Protect" },
  "bodyParts": ["knee"],
  "conditions": ["Sports strain", "Ligament support"],
  "summary": "…", "description": "<html>",
  "images": [ { "url": "…", "alt": "…", "isPrimary": true } ],
  "features": [ { "icon": "breathable", "title": "High-breathable knit", "body": "…" } ],
  "useCaseImage": { "url": "…", "alt": "…" },
  "useCases": [ { "title": "…", "body": "…" } ],
  "specs": [ { "label": "Material", "value": "Nylon / Lycra / carbon" } ],
  "sizeChart": {
    "measureLabel": "thigh circumference",
    "sizes": ["S","M","L","XL","XXL"],
    "rows": [ { "label": null, "values": ["34–38","38–42","42–46","46–50","50–54"] } ],
    "footnote": null
  },
  "sizeChartDiagram": { "url": "…", "alt": null },
  "certifications": [ { "slug": "iso-13485", "mark": "ISO 13485", "subLabel": "…", "logo": "…" } ],
  "downloads": [ { "title": "Catalogue", "url": "…pdf", "type": "catalog",
                   "fileLocale": "EN", "fileExt": "PDF", "description": "…", "sizeBytes": 1048576 } ],
  "relatedProducts": [ { "slug": "…", "name": "…", "image": "…", "url": "…" } ],
  "seo": { "title": "…", "description": "…", "ogImage": "…" },
  "publishedAt": "2026-01-10T00:00:00Z"
}
```

> `relatedProducts` 優先取 `ProductRelated`；為空時自動以同 SubCategory → 同 Category → 同 BodyPart 補足 4 筆（見 [05](05-database.md) §3.2）。

### 分類 / 子分類 / 系列 / 認證
```
GET /api/categories?locale=en&include=subCategories
GET /api/categories/{category}?locale=en            # 分類落地頁內容（hero/stats/supportLevels/SEO）
GET /api/sub-categories?locale=en&category={slug}
GET /api/sub-categories/{category}/{sub}?locale=en  # 子分類落地頁內容
GET /api/collections?locale=en
GET /api/certifications?locale=en                   # About 認證帶與產品頁標章列共用
```

`CategoryDto` / `SubCategoryDto`：
```json
{
  "slug": "orthopedic-support", "name": "Orthopedic Support",
  "description": "…",
  "image": { "url": "…", "alt": "…", "variants": [ … ] },
  "heroImage": { "url": "…", "alt": "…", "variants": [ … ] },
  "stats": [ { "value": "28", "label": "products" }, { "value": "5", "label": "body parts" },
             { "value": "CE · ISO 13485", "label": "certified" } ],
  "supportLevels": { "title": "Three levels of support", "lead": "…",
                     "items": [ { "collection": { "slug": "care", "name": "Care" }, "body": "…" } ] },
  "subCategories": [ { "slug": "knee-support", "name": "Knee Support", "count": 6 } ],
  "seo": { "title": "…", "description": "…" }
}
```

> `stats[].value` 為 `"auto"` 時由 API 代入實際產品數。
>
> `image` 是總覽頁分類卡的方形圖（`ImageMediaId`，preset `square`），
> `heroImage` 是落地頁的 16:10 大圖（`HeroImageMediaId`）—— 兩張不同用途，別互相代用。

### 應用方案（Applications）
```
GET /api/applications?locale=en&type=body-part|special-care
GET /api/applications/body-map?locale=en       # 人體圖專用：僅 ShowOnBodyMap=1
GET /api/applications/{slug}?locale=en         # 含關聯產品、concerns、supportLevels、howTo
```

`BodyMapDto`（陣列）：
```json
[ { "slug": "knee", "name": "Knee", "productCount": 16,
    "copy": "Wear knee supports to prevent injury…", "ctaLabel": "See knee solutions",
    "map": { "hotspot": { "cx": 152, "cy": 395 }, "chip": { "cx": 154, "cy": 334 } },
    "url": "/en/applications/knee" } ]
```

`ApplicationDto`（詳情）：
```json
{
  "slug": "knee", "type": "body-part", "name": "Knee", "lead": "…",
  "heroImage": { "url": "…", "alt": "…" },
  "stats": [ { "value": "12", "label": "products" } ],
  "concerns": [ { "title": "…", "body": "…" } ],
  "supportLevels": [ { "collection": { "slug": "care", "name": "Care" },
                       "body": "…", "bestFor": "…", "linkUrl": "…" } ],
  "recommendedProducts": [ /* ProductListItemDto */ ],
  "howTo": [ { "title": "…", "body": "…" } ],
  "fittingImage": { "url": "…", "alt": "…" },
  "disclaimer": "<p>…</p>",
  "related": [ { "slug": "ankle", "name": "Ankle", "productCount": 11 } ],
  "seo": { "title": "…", "description": "…" }
}
```

### 文章（News / Insights，同一 Article 實體）
```
GET /api/news?locale=en&category={slug}&tag={slug}&facets=true&page=1&pageSize=10
GET /api/news/{slug}?locale=en
GET /api/insights?locale=en&category={slug}&facets=true&page=1
GET /api/insights/{slug}?locale=en
GET /api/article-categories?locale=en&kind=news|insight&facets=true
```

`ArticleDto`（詳情，News 與 Insights 共用；不適用欄位回 `null`）：
```json
{
  "slug": "health-rehab-2026", "type": "news",
  "category": { "slug": "exhibitions", "name": "Exhibitions" },
  "title": "…", "standfirst": "…", "excerpt": "…",
  "publishedAt": "2026-09-02T00:00:00Z",
  "author": "Justy", "readMinutes": 6,
  "cover": { "url": "…", "alt": "…" },
  "body": "<html>",
  "toc": [ { "id": "why-compression", "text": "Why compression works" } ],
  "tags": [ { "slug": "compression", "name": "Compression" } ],
  "disclaimer": "<p>…</p>",
  "gallery": [ { "url": "…", "alt": "…" } ],
  "event": { "datesLabel": "16–19 November 2026", "startDate": "2026-11-16", "endDate": "2026-11-19",
             "venue": "Messe Düsseldorf, Germany", "booth": "Hall 4 · C22",
             "contactEmail": "service@comfortplus-medical.com",
             "ctaLabel": "Request a meeting", "ctaUrl": "/en/contact" },
  "prev": { "slug": "…", "title": "…" },
  "next": { "slug": "…", "title": "…" },
  "related": [ { "slug": "…", "title": "…", "cover": "…" } ],
  "seo": { "title": "…", "description": "…", "ogImage": "…" }
}
```

> `toc` 由 `Body` 的 H2 於伺服器端解析產生（並回填 anchor id），非資料庫欄位。
> `event` / `gallery` / `prev` / `next` 僅 `type=news` 有值；`readMinutes` / `tags` 主要用於 `type=insight`。

### FAQ
```
GET /api/faqs?locale=en&category={slug}&facets=true
GET /api/faq-categories?locale=en&facets=true
```

### 下載中心
```
GET /api/downloads?locale=en&type=catalog|manual|certificate&productSlug={slug}&facets=true
```

`DownloadDto`：
```json
{ "id": "…", "title": "Full product catalogue 2026", "description": "All three categories, 68 pages.",
  "type": "catalog", "fileLocale": "EN", "fileExt": "PDF", "sizeBytes": 8388608,
  "url": "https://cdn/…pdf" }
```

> `fileLocale` 為**檔案語言**（清單顯示 `EN · PDF · 說明`），與 `?locale=` 站台語系無關（見 [05](05-database.md) §3.8）。

### 銷售據點（Where to Buy）
```
GET /api/sales-locations?locale=en
```
```json
{
  "domestic": [ { "name": "…", "address": "…", "note": "3 branches in Taipei",
                  "phone": "…", "websiteUrl": "…" } ],
  "international": [ { "region": "Europe",
                       "items": [ { "name": "…", "websiteUrl": "…" } ] } ]
}
```

### 頁面（區段內容）
```
GET /api/pages/{key}?locale=en
```

`key` ∈ 18 個（見 [05-database.md](05-database.md) §4）：
`home` `about` `products` `product-category` `product-detail` `applications` `application-detail`
`partnership` `resources` `faq` `insights` `article-detail` `news` `news-detail` `downloads`
`where-to-buy` `contact` `privacy`

```json
{
  "key": "about",
  "sections": {
    "hero":         { "_enabled": true, "band": "https://cdn/…", "eyebrow": "About EuniceMed",
                      "title": "Understood.\nIn good hands.", "lead": "…" },
    "milestones":   { "_enabled": true, "background": "https://cdn/…", "title": "Steady growth. Deep roots.",
                      "items": [ { "year": "2008", "event": "…" } ] },
    "certificates": { "_enabled": true, "title": "…", "lead": "…",
                      "cta": { "label": "Download certificates", "url": "/en/downloads" },
                      "items": [ { "certification": "iso-13485" } ] }
  },
  "refs": {
    "certifications": { "iso-13485": { "mark": "ISO 13485", "subLabel": "…", "description": "…",
                                       "logo": "https://cdn/…" } },
    "products": {}, "articles": {}, "downloads": {}
  }
}
```

**回應規則**

- `sections` 為物件（key = `sectionKey`），**不是陣列**——版面順序由前端模板決定，不由資料決定。
- `_enabled: false` 的區段仍回傳（供後台預覽），前端模板自行略過。
- `media` 欄位在公開端點已解析為 **Blob 絕對網址**（`https://{account}.blob.core.windows.net/media/...`）；後台端點則回原始 `mediaId`。
- `ref:Entity` 欄位保留識別字串，實體內容放 `refs`，避免前端二次往返。
- 缺該語系翻譯的區段：**整段不回傳**（語言純度原則，見 [08-design.md](08-design.md) §5.2）。

### 導覽 / 設定
```
GET /api/menus?locale=en            # 主選單 / 頁尾結構（Resources 次導覽固定於模板，不在此）
GET /api/settings?locale=en         # 公司資訊（地址/電話/信箱/營業時間）、社群、SEO 預設
```

### Sitemap 資料（供前端產生 sitemap.xml）
```
GET /api/sitemap                    # 回所有可索引 URL + lastmod（含子分類落地頁，見 06 文件）
```

---

## 5. 公開寫入端點

### 聯絡 / 詢價 / 合作表單（共用端點，以 `type` 區分）
```
POST /api/contact
{
  "type": "general | product | partnership",
  "name": "...", "email": "...", "phone": "...",
  "company": "...",            // partnership 必填
  "country": "...",            // partnership/product 選填
  "partnershipType": "oem | odm | distributor",   // partnership 必填
  "productSlug": "...",        // product（產品頁詢價）必填
  "subject": "...", "message": "...",
  "locale": "en", "recaptchaToken": "..."
}
→ 201 { "id": "...", "status": "received" }
```
- 驗證欄位（依 `type` 條件必填）+ **reCAPTCHA v3** + honeypot；限流（IP/分鐘，**自製 token bucket** —— 本案無 WAF/APIM）。
  - ⚠️ **reCAPTCHA 低分不擋件。** 未達 `Recaptcha__MinScore`（預設 0.5）者照樣 `201`、照樣入庫，
    只是 `Status` 直接記成 `spam`、跳過通知信，並把分數存進 `RecaptchaScore` 供收件匣顯示。
    三支表單是這個站的商業目的，為了一個猜出來的門檻丟掉真的詢價，比收下幾封垃圾信貴得多。
  - 沒帶 token（機器人直接打 API）同樣是標記而非拒絕；**驗證服務連不上時放行**，
    未設 `Recaptcha__SecretKey` 時整段跳過（與 SMTP 同一個模式）。
- 寫入 `ContactSubmission`，**再**以品牌方既有信箱的 **SMTP**（MailKit）寄信通知 `service@comfortplus-medical.com`。
  - **順序不可顛倒**：先入庫再寄信。SMTP 失敗只記 log 並回 `201`，不得讓端點回錯造成訪客重複送出。
  - 寄件網域需設 SPF（必要時 DKIM），否則通知信易被判垃圾；若信箱有每日寄送量上限，需納入速率限制考量。
- `type=product` 時由 `productSlug` 解析出 `ProductId`，並把當下的 `Product.Sku` 寫入 `ProductSku` 快照——產品日後改名或換 slug 仍可追溯詢價來源。
- `subject` 的可選值由 `GET /pages/contact` 的 `form.subjectOptions` 提供，API 端不硬編碼。

---

## 6. 後台端點（JWT + 角色）

CRUD 對應每個內容模組，皆 `/api/admin/...`：

```
# 產品
GET    /admin/products?status=&search=&category=&subCategory=&page=   # search 同時比對 Name 與 Sku
GET    /admin/products/{id}
POST   /admin/products
PUT    /admin/products/{id}
DELETE /admin/products/{id}
POST   /admin/products/{id}/publish      # Draft → Published（純 SSR，下一請求即反映）
POST   /admin/products/{id}/unpublish
GET/PUT /admin/products/{id}/related     # ProductRelated 排序陣列（空陣列 = 回到自動計算）
POST   /admin/products/import            # 由 reference/legacy/products.json 匯入（Admin only，見 05 §4.1）

# 分類 / 子分類 / 系列 / 認證
GET/POST/PUT/DELETE /admin/categories[/{id}]
GET/POST/PUT/DELETE /admin/sub-categories[/{id}]        # ★新
GET/POST/PUT/DELETE /admin/collections[/{id}]
GET/POST/PUT/DELETE /admin/certifications[/{id}]        # ★新

# 應用方案 / 部位
GET/POST/PUT/DELETE /admin/applications[/{id}]  (+ /publish)
GET/PUT             /admin/body-parts[/{id}]            # ShowOnBodyMap、排序

# 文章 / 文章分類 / 活動 / 圖庫
GET/POST/PUT/DELETE /admin/articles[/{id}]      (+ /publish；type=news|insight)
GET/POST/PUT/DELETE /admin/article-categories[/{id}]    # ★新（kind=news|insight）
GET/PUT/DELETE      /admin/articles/{id}/event          # ★新 NewsEvent
GET/PUT             /admin/articles/{id}/gallery        # ★新 ArticleImage 排序

# FAQ / 下載 / 據點
GET/POST/PUT/DELETE /admin/faqs[/{id}]
GET/POST/PUT/DELETE /admin/faq-categories[/{id}]        # ★新
GET/POST/PUT/DELETE /admin/downloads[/{id}]
GET/POST/PUT/DELETE /admin/sales-locations[/{id}]

# 頁面區段（固定版型：只能改內容與啟用狀態，不能增刪區段）
GET    /admin/page-schema/{key}                         # ★新 該頁全部區段的 JSON Schema
GET    /admin/pages                                     # 18 頁清單（含 kind、最後更新）
GET    /admin/pages/{key}                               # 全區段 × 全語系
PUT    /admin/pages/{key}/sections/{sectionKey}
       { "locale": "en", "data": { … }, "syncInvariantFields": true }
PATCH  /admin/pages/{key}/sections/{sectionKey}/enabled  { "isEnabled": false }
       # 不提供 POST / DELETE sections —— 區段由 schema registry 與 seed 同步器決定

# 選單 / 轉址 / 設定
GET/PUT             /admin/menus
GET/POST/PUT/DELETE /admin/redirects[/{id}]
GET/PUT             /admin/settings                     # 含 SettingTranslation

# 媒體
GET    /admin/media-presets       # ★新 尺寸規格表（後台上傳欄位的提示文字來源，見 11-media-specs.md §2）
POST   /admin/media               # ★改 multipart 代傳；必帶 presetKey，伺服器端依 preset 寬縮圖
GET    /admin/media?search=&presetKey=
GET    /admin/media/{id}/usages   # ★新 引用反查（MediaUsage）；有引用時 DELETE 回 409
POST   /admin/media/{id}/reprocess # ★新 以目前 preset 重新輸出 master 與 variants（preset 調整或換 preset 時）
DELETE /admin/media/{id}
POST   /admin/uploads/sas         # PDF 專用：取 Blob SAS 直傳網址（文件不需縮圖）

# 表單收件匣
GET    /admin/contact-submissions?type=&status=&page=
PATCH  /admin/contact-submissions/{id}   # 標記已處理
GET    /admin/contact-submissions/export # CSV

# 使用者（Admin only）
GET/POST/PUT/DELETE /admin/users[/{id}]
```

**規則**

- 發布僅更新 DB 狀態；前端為**純 SSR**，下一次請求即反映，**無需呼叫前端 revalidation webhook**。
- `PUT /admin/pages/{key}/sections/{sectionKey}` 以該 `sectionKey` 的 JSON Schema 驗證 `data`；失敗回 400，`errors` 每一項以 JSON Pointer 開頭標出欄位路徑（如 `"/items/2/year: maxLength"`）。
- `syncInvariantFields: true`（後台預設）時，把標有 `x-localeInvariant` 的欄位一併寫入其他語系（見 [09-page-blocks.md](09-page-blocks.md) §9.3）。
- **頁面區段沒有 Draft 狀態**：儲存即生效（純 SSR）。需要預覽未上線文案時走 Next.js Draft Mode + token。
- 任何實體存檔後同步重建自身的 `MediaUsage` 列。

### 媒體上傳與縮圖

> 尺寸規格總表見 [11-media-specs.md](11-media-specs.md)。**API 是縮圖的執行者**，後台只負責顯示提示與送出 `presetKey`。

```http
GET /api/admin/media-presets
200 OK
{
  "presets": [
    { "key": "square", "label": { "en": "Product image (1:1)", "zh-TW": "產品圖（1:1）" },
      "aspect": "1:1", "width": 1200, "height": 1200, "maxBytes": 256000,
      "formats": ["jpg","png","webp"],
      "hint": { "zh-TW": "建議尺寸 1200×1200（1:1）· JPG/PNG/WebP · 建議 ≤250 KB · 上傳後自動縮至 1200px 寬" } }
  ]
}
```

```http
POST /api/admin/media          # multipart/form-data
  file=<binary>  presetKey=square  altText=...
201 Created
{
  "id": "…", "presetKey": "square",
  "url": "https://cdn/…/knee-support-iu-8f3a.jpg",   -- normalized master
  "width": 1200, "height": 1200, "sizeBytes": 184320,
  "original": { "width": 3000, "height": 3000, "sizeBytes": 4210000 },
  "variants": [ { "format": "webp", "width": 1200, "url": "…" },
                { "format": "jpg",  "width": 1200, "url": "…" } ],
  "warnings": [ { "code": "aspect_mismatch", "expected": "1:1", "actual": "3:4",
                  "message": "此欄位建議 1:1，您的圖為 3:4，兩側會被裁切" } ]
}
```

- **`presetKey` 為必填**；未知的 key 回 400。伺服器據此決定縮圖寬度（等比、**只縮不放**）、輸出格式與大小門檻。
- 回應的 `warnings` 為**不阻擋**的提醒（比例不符、解析度不足、檔案偏大），後台原樣顯示。
- 真正拒絕的情形回 ProblemDetails：格式不符 `415`、超過硬上限 `413`、像素超限或檔案損毀 `400`（規則見 [11](11-media-specs.md) §4）。
- 圖片走**代傳**（要在伺服器縮圖）；**PDF 走 `POST /admin/uploads/sas` 直傳**再回報 metadata，避免大檔佔用 Function。
- `POST /admin/media/{id}/reprocess` 供 preset 調整或欄位換 preset 時重新輸出；`MediaUsage` 不變、URL 以新雜湊產生並更新 `Media.BlobUrl`。
- 公開端點的 media 欄位回 **Blob 絕對網址**（master）。因無 CDN 且前端不走 SWA 圖片優化（見 [07](07-azure-deployment.md) §7.3），**API 應一併回傳可用的 variant 清單（含 WebP 與各寬度）**，讓前端 custom loader 直接挑選。

---

## 7. 內容發布與快取

> 前端為純 SSR、不使用 ISR，故**無 On-Demand Revalidation 串接**。

```
CMS 發布 → API /admin/.../publish → 更新 DB 狀態 Published
        → 前端下一次 SSR 請求即取得最新內容
```

- 本案**無 Front Door/CDN**，發布後下一次請求即可見，無邊緣快取延遲。
- 若在 API 端加記憶體快取以吸收尖峰，**發布動作必須同步失效對應 key**，否則會出現「後台已發布、前台未更新」。

---

## 8. 專案結構（API）

**單一專案**，結構與 [Jabez/Api](/Users/tim/webapps/Jabez/Api) 完全一致。**不採用**多專案分層，**不採用** Repository Pattern。

```
Api/
├── Api.csproj                  # RootNamespace/AssemblyName = EuniceMed.Api
├── Program.cs                  # HostBuilder + ConfigureFunctionsWebApplication + 手動 DI + 啟動 migrate
├── host.json                   # routePrefix "api"
├── local.settings.example.json
├── Functions/RouterFunction.cs # 唯一 HTTP entry point，Route = "{*route}"
├── Routing/AppRouter.cs        # C# list-pattern 分派全部路由 + 權限表
├── Middleware/ExceptionMiddleware.cs
├── Handlers/                   # 一個模組一支，sealed class + primary constructor
├── Services/
│   ├── Dapper/                 # 讀取服務（公開端點一律走這裡）
│   └── JwtService / BlobStorageService / EmailService / ImageService / SchemaRegistry
├── Data/
│   ├── AppDbContext.cs  AppDbContextFactory.cs
│   ├── Configurations/         # 一個實體一支 <Entity>Configuration.cs，seed 用 HasData
│   ├── Migrations/
│   └── Seed/                   # PageSectionSynchronizer、LegacyProductImporter
├── Models/Entities/  Models/Dtos/   # DTO 一律 sealed record 位置參數
├── Common/                     # ApiResponse PagedResult AppException Clock Constants LocaleQuery
├── PageSchemas/                # {pageKey}.{sectionKey}.json（見 09 §9），EmbeddedResource
├── Media/media-presets.json    # 見 11 §2，EmbeddedResource
└── http/                       # 各階段的 .http 驗收檔
```

**分層責任**：`AppRouter` 負責驗證與授權（Handler 內禁止重複檢查角色）；`Handlers` 負責請求解析、商業規則、回應組裝；**讀取走 Dapper read service、寫入走 EF Core**。

- Function 內**不拼接 SQL 字串**（防注入）。Dapper 一律具名參數，且 `Locale` 等 `varchar` 欄位必須以 `DbType.AnsiString` 傳送。
- 新增一個端點要動的地方固定四處：`Models/Dtos/`、`Handlers/`、`Routing/AppRouter.cs`（分派 + 權限兩處）、`Program.cs`（若是新 Handler 要 `AddScoped`）。
- 設定/連線字串來自 **App Settings**（本案無 Key Vault）；SQL 與 Blob 優先以 **Managed Identity** 存取，避免存放密碼。
- **執行環境為 Flex Consumption（Linux）**：僅支援 isolated worker model；無 deployment slot；app 初始化逾時 30 秒 —— 啟動階段不要做重量級初始化（大量 seed、schema 掃描應改為背景或首次請求時 lazy 載入）。

---

## 9. 安全與韌性
- 輸入驗證（FluentValidation）、輸出編碼、HTML 內容淨化（News/描述）。
- 限流：**自製 token bucket**（無 Front Door/APIM）對 `POST /contact` 與 `POST /auth/login`。注意 Flex Consumption 會多實例水平擴展，**行程內計數器在多實例下會失準** —— 低流量下可接受，若需精確則改以 DB 計數（`ContactSubmission` 已有時間戳可查）。
- CORS 僅允許 `https://www.eunicemed.com`（`/admin` SPA 的瀏覽器 XHR 用）。
- 例外不外洩堆疊；統一 `ApiResponse.Fail` + `traceId`（見 §3.2）。**本案無 Application Insights**，故 `traceId` 需一併寫進結構化 log，才能在 Function App log stream 對照查詢。
- 冷啟動：always-ready 設為 **0**（成本考量），故首個請求會有冷啟動延遲。降低影響的做法：精簡啟動路徑、避免啟動時連 DB、公開讀取加短期記憶體快取。若客戶無法接受，改設 1 個 always-ready 會產生固定月費，需另行核可。

---

## 10. 驗收清單
- [ ] 公開端點匿名可讀、回應符合 `ApiResponse` 信封與 `PagedResult` 分頁格式
- [ ] 缺該語系翻譯的內容整筆消失（不 fallback 露出他語）；Dapper 的 `@locale` 以 `varchar(10)` 送出，索引未失效
- [ ] 後台端點 JWT + 角色強制
- [ ] `POST /contact` 驗證 + reCAPTCHA + 寄信 + 入庫 + 限流；`type=product` 有寫入 `ProductSku` 快照
- [ ] 發布後純 SSR 下一請求即反映（無需 revalidate）
- [ ] `GET /pages/{key}` 支援全部 18 個 key，回 `sections{}` 物件並解析 `refs`
- [ ] `PUT /admin/pages/.../sections/{sectionKey}` 通過 JSON Schema 驗證，錯誤以 JSON Pointer 回報
- [ ] `?facets=true` 於產品／FAQ／Insights／News／Downloads 皆可用且計數正確
- [ ] `GET /products/{category}/{sub}/{slug}` 驗證三段歸屬，不符回 404
- [ ] `docs/api-routes.md` 的路由表與 `Api/Routing/AppRouter.cs` 一致（本案不產 OpenAPI，這份表就是 API 契約）
- [ ] 每階段的 `Api/http/*.http` 全部通過實測（照 Jabez 慣例：必須實際輸入測試資料跑過 CRUD，不得只靠目視檢查）
