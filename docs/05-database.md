# 05 · 資料庫設計（SQL Server / Azure SQL）

> 上層導覽見 [CLAUDE.md](../CLAUDE.md)。對應 API 見 [04-api.md](04-api.md)；頁面區段與欄位語意見 [09-page-blocks.md](09-page-blocks.md)。
>
> **本版為 mockup4 定案版**（2026-08）：依 `mockup4/` 實際切出的 18 頁重新校準內容模型。
> 主要變更：`PageBlock` → `PageSection`、新增 SubCategory 第三層、認證/文章分類/FAQ 分類升為實體、Product 加 SKU 與尺寸表、News 加活動資訊。

---

## 1. 設計原則

- **Azure SQL Database（SQL Server 引擎）**，透過 **EF Core（.NET 10）Code-First + Migrations** 管理。
- 表名 **PascalCase 單數**；多對多用關聯表。
- 主鍵：`Id UNIQUEIDENTIFIER`（`NEWSEQUENTIALID()` 預設，兼顧分散式產生與索引）。
- 每表含稽核欄位：`CreatedAt`、`UpdatedAt`（`datetime2`，UTC）、`CreatedBy`、`UpdatedBy`。
- **多語系**：可翻譯內容拆「主表 + Translation 表」，以 `(EntityId, Locale)` 為鍵。slug 放主表（跨語系共用）。
- **軟刪除**：重要內容用 `IsDeleted BIT` + 過濾；表單不刪。
- 字串一律 `NVARCHAR`（Unicode）；金額/數值依需求。
- 索引：slug、locale、status、外鍵、排序欄位。
- **固定版面模型**：頁面版面鎖定於 mockup4，**不提供自由區塊建構器**。可編輯內容以 `(PageKey, SectionKey)` 定位，欄位由 `EuniceMed.Core/PageSchemas/*.json`（JSON Schema）定義；新增/移除/重排區段屬**版面變更**，走程式碼 PR + seed 同步器，不是編輯操作。詳見 §3.7 與 [09-page-blocks.md](09-page-blocks.md)。
- **JSON 欄位判準**：該資料是否需要**跨頁重用／被查詢／被計數／被獨立授權**？是 → 建表；否（只在單一表單裡一次編完）→ `NVARCHAR(MAX)` JSON。判定結果見 §3.11。

---

## 2. 實體關聯（ER 摘要）

```
Category 1───* SubCategory 1───* Product *───1 Collection
Product 1───* ProductImage
Product 1───* ProductTranslation        (Locale)
Product *───* BodyPart        (ProductBodyPart)
Product *───* Application     (ProductApplication)
Product *───* Download        (ProductDownload)
Product *───* Certification   (ProductCertification)
Product *───* Product         (ProductRelated，人工指定；空則自動計算)
Product *───* Tag             (ProductTag)
Category 1───* CategoryTranslation
SubCategory 1───* SubCategoryTranslation
Collection 1───* CollectionTranslation
Certification 1───* CertificationTranslation  (可對應一筆 Download)
Application 1───* ApplicationTranslation      (Type: bodyPart | specialCare；可對應 BodyPart)
Article *───1 ArticleCategory 1───* ArticleCategoryTranslation  (Kind: news | insight)
Article 1───* ArticleTranslation
Article 1───1 NewsEvent 1───* NewsEventTranslation              (news 專用，選填)
Article 1───* ArticleImage                                     (news 圖庫)
Article *───* Tag             (ArticleTag)
Faq *───1 FaqCategory 1───* FaqCategoryTranslation
Faq 1───* FaqTranslation
SalesLocation 1───* SalesLocationTranslation                   (LocationType: domestic | international)
Page 1───* PageSection 1───* PageSectionTranslation            (SectionKey 定位，不可增刪)
Download 1───* DownloadTranslation
Media (被 ProductImage / Download / Certification / ArticleImage / PageSection 引用；帶 PresetKey)
Media 1───* MediaVariant（縮圖輸出：WebP / 原格式，見 11-media-specs.md）
MediaUsage（媒體引用反查索引，含 JSON 內的引用）
MenuItem（自參照樹）+ MenuItemTranslation
Redirect
ContactSubmission (Type: general | product | partnership)
User *───* Role               (UserRole)
Setting 1───* SettingTranslation
```

---

## 3. 主要資料表（DDL 摘要）

> 以下為代表性 DDL；實際以 EF Migration 產生為準。`ROWVERSION` 供樂觀並行控制。

### 3.1 分類 / 子分類 / 系列

```sql
CREATE TABLE Category (
    Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Slug         NVARCHAR(120) NOT NULL,
    SortOrder    INT NOT NULL DEFAULT 0,
    ImageMediaId     UNIQUEIDENTIFIER NULL,   -- 總覽頁分類卡用圖
    HeroImageMediaId UNIQUEIDENTIFIER NULL,   -- 分類頁 hero（preset `wide-16x10`）
    IsDeleted    BIT NOT NULL DEFAULT 0,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    RowVer       ROWVERSION
);
CREATE UNIQUE INDEX UX_Category_Slug ON Category(Slug) WHERE IsDeleted = 0;

CREATE TABLE CategoryTranslation (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    CategoryId  UNIQUEIDENTIFIER NOT NULL REFERENCES Category(Id),
    Locale      VARCHAR(10) NOT NULL,          -- en, zh-TW
    Name        NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,            -- 分類頁 hero lead
    StatsJson         NVARCHAR(MAX) NULL,      -- [{value,label}] ×3，見 09 §4.2
    SupportLevelsJson NVARCHAR(MAX) NULL,      -- {title,lead,items:[{collectionSlug,body}]}
    SeoTitle       NVARCHAR(200) NULL,
    SeoDescription NVARCHAR(400) NULL,
    CONSTRAINT UX_CategoryTr UNIQUE (CategoryId, Locale)
);

-- 【新】子分類：Category → SubCategory → Product 第三層，有獨立 URL（SEO 落地頁）
CREATE TABLE SubCategory (
    Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    CategoryId   UNIQUEIDENTIFIER NOT NULL REFERENCES Category(Id),
    Slug         NVARCHAR(120) NOT NULL,       -- 全站唯一（URL 為 /products/{category}/{sub}）
    SortOrder    INT NOT NULL DEFAULT 0,
    ImageMediaId     UNIQUEIDENTIFIER NULL,
    HeroImageMediaId UNIQUEIDENTIFIER NULL,
    Status       TINYINT NOT NULL DEFAULT 1,   -- 0 Draft 1 Published 2 Archived
    IsDeleted    BIT NOT NULL DEFAULT 0,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    RowVer       ROWVERSION
);
CREATE UNIQUE INDEX UX_SubCategory_Slug ON SubCategory(Slug) WHERE IsDeleted = 0;
CREATE INDEX IX_SubCategory_Category ON SubCategory(CategoryId, SortOrder);

CREATE TABLE SubCategoryTranslation (
    Id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    SubCategoryId  UNIQUEIDENTIFIER NOT NULL REFERENCES SubCategory(Id),
    Locale         VARCHAR(10) NOT NULL,
    Name           NVARCHAR(200) NOT NULL,
    Description    NVARCHAR(MAX) NULL,         -- 落地頁敘述文案（避免 thin page，見 §6 註）
    StatsJson      NVARCHAR(MAX) NULL,
    SeoTitle       NVARCHAR(200) NULL,
    SeoDescription NVARCHAR(400) NULL,
    CONSTRAINT UX_SubCategoryTr UNIQUE (SubCategoryId, Locale)
);

CREATE TABLE Collection (
    Id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Slug      NVARCHAR(120) NOT NULL,           -- care | protect | advance
    Strength  TINYINT NOT NULL,                 -- 1=Care 2=Protect 3=Advance
    SortOrder INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE UNIQUE INDEX UX_Collection_Slug ON Collection(Slug);

CREATE TABLE CollectionTranslation (
    Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    CollectionId UNIQUEIDENTIFIER NOT NULL REFERENCES Collection(Id),
    Locale       VARCHAR(10) NOT NULL,
    Name         NVARCHAR(200) NOT NULL,
    Description  NVARCHAR(MAX) NULL,
    CONSTRAINT UX_CollectionTr UNIQUE (CollectionId, Locale)
);
```

### 3.2 產品

```sql
CREATE TABLE Product (
    Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Slug          NVARCHAR(160) NOT NULL,
    Sku           NVARCHAR(60) NULL,             -- 型號，如 CPO-1603（產品頁顯示）
    CategoryId    UNIQUEIDENTIFIER NOT NULL REFERENCES Category(Id),
    SubCategoryId UNIQUEIDENTIFIER NULL REFERENCES SubCategory(Id),  -- 決定 URL 第三段
    CollectionId  UNIQUEIDENTIFIER NULL REFERENCES Collection(Id),
    Status        TINYINT NOT NULL DEFAULT 0,    -- 0 Draft 1 Published 2 Archived
    IsFeatured    BIT NOT NULL DEFAULT 0,        -- 首頁 01 Hero products 自動取用
    FeaturedSortOrder INT NOT NULL DEFAULT 0,    -- 首頁精選排序（取前 8 筆，masonry 逐欄由上而下）
    -- 【2026-08-14 移除】TowerImageMediaId（1:2, 700×1400）：首頁改 Pinterest 式 masonry，
    --   各版位皆用 ProductImage 的主圖（preset `square`），大小只由版位決定。見 11-media-specs.md §3。
    UseCaseImageMediaId  UNIQUEIDENTIFIER NULL,  -- 產品頁 02 使用情境照（preset `photo-4x3`）
    SizeChartDiagramMediaId UNIQUEIDENTIFIER NULL, -- 產品頁 03 尺寸表旁的量測部位線稿（preset `measure-diagram`）；
                                                  --   語系無關：圖上沒有文字，部位名稱在 SizeChartJson.measureLabel
    SortOrder     INT NOT NULL DEFAULT 0,
    PublishedAt   DATETIME2 NULL,
    IsDeleted     BIT NOT NULL DEFAULT 0,
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy     UNIQUEIDENTIFIER NULL,
    UpdatedBy     UNIQUEIDENTIFIER NULL,
    RowVer        ROWVERSION
);
CREATE UNIQUE INDEX UX_Product_Slug ON Product(Slug) WHERE IsDeleted = 0;
CREATE INDEX IX_Product_Category ON Product(CategoryId, Status);
CREATE INDEX IX_Product_SubCategory ON Product(SubCategoryId, Status);
CREATE INDEX IX_Product_Collection ON Product(CollectionId, Status);
CREATE INDEX IX_Product_Sku ON Product(Sku) WHERE IsDeleted = 0;
CREATE INDEX IX_Product_Featured ON Product(IsFeatured, FeaturedSortOrder) WHERE Status = 1 AND IsDeleted = 0;

CREATE TABLE ProductTranslation (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    ProductId   UNIQUEIDENTIFIER NOT NULL REFERENCES Product(Id),
    Locale      VARCHAR(10) NOT NULL,
    Name        NVARCHAR(250) NOT NULL,
    Summary     NVARCHAR(600) NULL,
    Description NVARCHAR(MAX) NULL,             -- 淨化後 HTML
    FeaturedBlurb NVARCHAR(300) NULL,           -- 首頁精選卡一句話文案
    FeaturesJson  NVARCHAR(MAX) NULL,           -- [{icon,title,body}] ×2–6（09 §5 產品頁 01）
    UseCasesJson  NVARCHAR(MAX) NULL,           -- [{title,body}] ×2–5（模板自動編號 01/02/03）
    SpecsJson     NVARCHAR(MAX) NULL,           -- [{label,value}]
    SizeChartJson NVARCHAR(MAX) NULL,           -- {measureLabel,sizes:[],rows:[{label?,values:[]}],footnote?}
    ConditionsJson NVARCHAR(MAX) NULL,          -- 適用症狀 chip
    SeoTitle    NVARCHAR(200) NULL,
    SeoDescription NVARCHAR(400) NULL,
    OgImageMediaId UNIQUEIDENTIFIER NULL,
    CONSTRAINT UX_ProductTr UNIQUE (ProductId, Locale)
);
CREATE INDEX IX_ProductTr_Locale ON ProductTranslation(Locale);

CREATE TABLE ProductImage (          -- 一律 1:1（preset `square`, 1200×1200）
    Id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    ProductId UNIQUEIDENTIFIER NOT NULL REFERENCES Product(Id),
    MediaId   UNIQUEIDENTIFIER NOT NULL REFERENCES Media(Id),
    IsPrimary BIT NOT NULL DEFAULT 0,
    SortOrder INT NOT NULL DEFAULT 0
);
-- 主圖同時供：首頁精選 4 格、型錄卡、相關產品卡、產品頁主視覺與縮圖列。
-- 產品不再需要直式（1:2）或 3:4 的另一套圖，見 11-media-specs.md §3。

-- 【新】相關產品：mockup4 為 4 格固定版位且明顯人工挑選（跨部位混排）
CREATE TABLE ProductRelated (
    ProductId        UNIQUEIDENTIFIER NOT NULL REFERENCES Product(Id),
    RelatedProductId UNIQUEIDENTIFIER NOT NULL REFERENCES Product(Id),
    SortOrder        INT NOT NULL DEFAULT 0,
    PRIMARY KEY (ProductId, RelatedProductId)
);
-- 未指定（0 筆）時，API 自動以「同 SubCategory → 同 Category → 同 BodyPart」補齊 4 筆。

CREATE TABLE BodyPart (            -- knee, ankle, elbow, wrist, back, foot, leg
    Id   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Slug NVARCHAR(60) NOT NULL UNIQUE,
    NameEn NVARCHAR(80) NOT NULL,
    NameZhTw NVARCHAR(80) NOT NULL,
    ShowOnBodyMap BIT NOT NULL DEFAULT 0,   -- 人體圖只顯示 4 個部位；其餘 3 個僅供篩選
    SortOrder     INT NOT NULL DEFAULT 0
);
CREATE TABLE ProductBodyPart (
    ProductId  UNIQUEIDENTIFIER NOT NULL REFERENCES Product(Id),
    BodyPartId UNIQUEIDENTIFIER NOT NULL REFERENCES BodyPart(Id),
    PRIMARY KEY (ProductId, BodyPartId)
);
```

> **`BodyPart` seed 7 筆 vs 人體圖 4 部位**：兩者刻意不同。7 筆供產品篩選列（Knee / Ankle / Back & Waist / Elbow / Wrist…）使用；人體圖只渲染 `ShowOnBodyMap = 1` 的 4 筆（back / knee / ankle / foot），與 [09-page-blocks.md](09-page-blocks.md) §5.3 一致。

### 3.3 認證（Certification）

```sql
-- 【新】由 Product.CertificationsJson 升為實體：About §05 與產品頁 §04 共用同一份資料，
-- 且每筆需 mark / sub-label / description 三欄並可連下載檔 —— JSON 字串陣列做不到。
CREATE TABLE Certification (
    Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Slug         NVARCHAR(80) NOT NULL UNIQUE,   -- iso-13485 | ce | oeko-tex-100 | patented | mit
    Mark         NVARCHAR(80) NOT NULL,          -- 標章主字（品牌符號，不翻譯）
    LogoMediaId  UNIQUEIDENTIFIER NULL REFERENCES Media(Id),
    DownloadId   UNIQUEIDENTIFIER NULL REFERENCES Download(Id),  -- 對應認證文件
    SortOrder    INT NOT NULL DEFAULT 0,
    Status       TINYINT NOT NULL DEFAULT 1,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE CertificationTranslation (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    CertificationId UNIQUEIDENTIFIER NOT NULL REFERENCES Certification(Id),
    Locale          VARCHAR(10) NOT NULL,
    SubLabel        NVARCHAR(120) NULL,          -- 標章下方小字
    Description     NVARCHAR(400) NULL,          -- About 認證帶的說明句
    CONSTRAINT UX_CertificationTr UNIQUE (CertificationId, Locale)
);
CREATE TABLE ProductCertification (
    ProductId       UNIQUEIDENTIFIER NOT NULL REFERENCES Product(Id),
    CertificationId UNIQUEIDENTIFIER NOT NULL REFERENCES Certification(Id),
    PRIMARY KEY (ProductId, CertificationId)
);
```

### 3.4 應用方案（Applications）

```sql
CREATE TABLE Application (
    Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Slug         NVARCHAR(120) NOT NULL,
    Type         TINYINT NOT NULL,               -- 1 bodyPart（依部位） 2 specialCare（特殊照護）
    BodyPartId   UNIQUEIDENTIFIER NULL REFERENCES BodyPart(Id),   -- Type=1 時對應
    ImageMediaId UNIQUEIDENTIFIER NULL REFERENCES Media(Id),      -- hero（preset `portrait-4x5`）
    CardImageMediaId    UNIQUEIDENTIFIER NULL REFERENCES Media(Id),  -- specialCare 卡（preset `card-16x10`）
    FittingImageMediaId UNIQUEIDENTIFIER NULL REFERENCES Media(Id),  -- 穿戴指引圖（preset `wide-16x10`）
    ShowOnBodyMap   BIT NOT NULL DEFAULT 0,
    MapPositionJson NVARCHAR(MAX) NULL,          -- {hotspot:{cx,cy},chip:{cx,cy}}，SVG 座標，見 09 §5.3
    Status       TINYINT NOT NULL DEFAULT 0,
    SortOrder    INT NOT NULL DEFAULT 0,
    IsDeleted    BIT NOT NULL DEFAULT 0,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    RowVer       ROWVERSION
);
CREATE UNIQUE INDEX UX_Application_Slug ON Application(Slug) WHERE IsDeleted = 0;
CREATE INDEX IX_Application_BodyMap ON Application(ShowOnBodyMap, SortOrder) WHERE Status = 1;

CREATE TABLE ApplicationTranslation (
    Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    ApplicationId UNIQUEIDENTIFIER NOT NULL REFERENCES Application(Id),
    Locale        VARCHAR(10) NOT NULL,
    Name          NVARCHAR(200) NOT NULL,
    Lead          NVARCHAR(800) NULL,            -- hero 引言
    Body          NVARCHAR(MAX) NULL,            -- 淨化後 HTML（選用長文）
    MapCopy       NVARCHAR(600) NULL,            -- 人體圖右側資訊面板文案
    MapCtaLabel   NVARCHAR(120) NULL,            -- 「See knee solutions」
    StatsJson         NVARCHAR(MAX) NULL,        -- [{value,label}]；value 可填 "auto" 取產品數
    ConcernsJson      NVARCHAR(MAX) NULL,        -- [{title,body}] ×2–6（01 常見困擾）
    SupportLevelsJson NVARCHAR(MAX) NULL,        -- [{collectionSlug,body,bestFor,linkUrl}] ×3
    HowToJson         NVARCHAR(MAX) NULL,        -- [{title,body}] ×2–5（04 如何選擇與穿戴）
    Disclaimer    NVARCHAR(MAX) NULL,            -- 醫療免責；空值取模板預設
    SeoTitle      NVARCHAR(200) NULL,
    SeoDescription NVARCHAR(400) NULL,
    CONSTRAINT UX_ApplicationTr UNIQUE (ApplicationId, Locale)
);

CREATE TABLE ProductApplication (
    ProductId     UNIQUEIDENTIFIER NOT NULL REFERENCES Product(Id),
    ApplicationId UNIQUEIDENTIFIER NOT NULL REFERENCES Application(Id),
    SortOrder     INT NOT NULL DEFAULT 0,
    PRIMARY KEY (ProductId, ApplicationId)
);
```

### 3.5 文章（Article：News / Insights 共用）

```sql
-- 【新】文章分類：取代 Article.Topic 列舉。News 與 Insights 的分類列都要顯示筆數 count
-- 並可排序、可當篩選條件，故必須是實體。以 Kind 分流，兩邊 slug 各自獨立。
CREATE TABLE ArticleCategory (
    Id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Kind      TINYINT NOT NULL,                -- 1 news 2 insight
    Slug      NVARCHAR(80) NOT NULL,
    SortOrder INT NOT NULL DEFAULT 0,
    Status    TINYINT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UX_ArticleCategory UNIQUE (Kind, Slug)
);
CREATE TABLE ArticleCategoryTranslation (
    Id                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    ArticleCategoryId UNIQUEIDENTIFIER NOT NULL REFERENCES ArticleCategory(Id),
    Locale            VARCHAR(10) NOT NULL,
    Name              NVARCHAR(120) NOT NULL,
    PromoJson         NVARCHAR(MAX) NULL,       -- 側欄促購卡覆寫 {title,body,ctaLabel,linkUrl}
    CONSTRAINT UX_ArticleCategoryTr UNIQUE (ArticleCategoryId, Locale)
);

CREATE TABLE Article (
    Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Slug         NVARCHAR(180) NOT NULL,
    Type         TINYINT NOT NULL DEFAULT 1,     -- 1 news（最新消息） 2 insight（專欄文章）
    CategoryId   UNIQUEIDENTIFIER NULL REFERENCES ArticleCategory(Id),   -- Kind 須與 Type 一致
    CoverMediaId UNIQUEIDENTIFIER NULL REFERENCES Media(Id),             -- 封面（preset `wide-16x9`）
    ReadMinutes  SMALLINT NULL,                  -- Insights meta「6 min read」
    IsFeatured   BIT NOT NULL DEFAULT 0,         -- News 列表大卡
    Status       TINYINT NOT NULL DEFAULT 0,
    PublishedAt  DATETIME2 NULL,
    IsDeleted    BIT NOT NULL DEFAULT 0,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    RowVer       ROWVERSION
);
CREATE UNIQUE INDEX UX_Article_Slug ON Article(Slug) WHERE IsDeleted = 0;
CREATE INDEX IX_Article_Published ON Article(Type, Status, PublishedAt DESC);
CREATE INDEX IX_Article_Category ON Article(CategoryId, Status, PublishedAt DESC);

CREATE TABLE ArticleTranslation (
    Id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    ArticleId  UNIQUEIDENTIFIER NOT NULL REFERENCES Article(Id),
    Locale     VARCHAR(10) NOT NULL,
    Title      NVARCHAR(300) NOT NULL,
    Standfirst NVARCHAR(600) NULL,          -- 標題下方導言（大字）
    Body       NVARCHAR(MAX) NULL,          -- 淨化後 HTML；H2 供側欄 TOC 自動產生
    Excerpt    NVARCHAR(600) NULL,          -- 卡片摘要
    AuthorName NVARCHAR(120) NULL,          -- meta 行「Justy」
    Disclaimer NVARCHAR(MAX) NULL,          -- 文末免責框；空值取模板預設
    SeoTitle   NVARCHAR(200) NULL,
    SeoDescription NVARCHAR(400) NULL,
    CONSTRAINT UX_ArticleTr UNIQUE (ArticleId, Locale)
);

-- 【新】News Detail 的「Event details」面板（1:1，選填）
CREATE TABLE NewsEvent (
    ArticleId    UNIQUEIDENTIFIER NOT NULL PRIMARY KEY REFERENCES Article(Id),
    StartDate    DATE NULL,
    EndDate      DATE NULL,
    ContactEmail NVARCHAR(320) NULL,
    CtaUrl       NVARCHAR(400) NULL,
    UpdatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE NewsEventTranslation (
    Id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    ArticleId  UNIQUEIDENTIFIER NOT NULL REFERENCES NewsEvent(ArticleId),
    Locale     VARCHAR(10) NOT NULL,
    DatesLabel NVARCHAR(160) NULL,          -- 覆寫日期顯示（如「16–19 November 2026」）
    Venue      NVARCHAR(300) NULL,
    Booth      NVARCHAR(120) NULL,
    CtaLabel   NVARCHAR(120) NULL,          -- 「Request a meeting」
    CONSTRAINT UX_NewsEventTr UNIQUE (ArticleId, Locale)
);

-- 【新】News Detail 圖庫
CREATE TABLE ArticleImage (
    Id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    ArticleId UNIQUEIDENTIFIER NOT NULL REFERENCES Article(Id),
    MediaId   UNIQUEIDENTIFIER NOT NULL REFERENCES Media(Id),
    SortOrder INT NOT NULL DEFAULT 0
);
```

### 3.6 FAQ / 銷售據點

```sql
-- 【新】FAQ 分類：要排序、要顯示 count、後台要下拉選單 → 由自由字串升為實體
CREATE TABLE FaqCategory (
    Id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Slug      NVARCHAR(80) NOT NULL UNIQUE,   -- use | sizing | order
    SortOrder INT NOT NULL DEFAULT 0,
    Status    TINYINT NOT NULL DEFAULT 1
);
CREATE TABLE FaqCategoryTranslation (
    Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    FaqCategoryId UNIQUEIDENTIFIER NOT NULL REFERENCES FaqCategory(Id),
    Locale        VARCHAR(10) NOT NULL,
    Name          NVARCHAR(160) NOT NULL,
    CONSTRAINT UX_FaqCategoryTr UNIQUE (FaqCategoryId, Locale)
);

CREATE TABLE Faq (
    Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    FaqCategoryId UNIQUEIDENTIFIER NOT NULL REFERENCES FaqCategory(Id),
    Status        TINYINT NOT NULL DEFAULT 1,
    SortOrder     INT NOT NULL DEFAULT 0,
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Faq_Category ON Faq(FaqCategoryId, Status, SortOrder);

CREATE TABLE FaqTranslation (
    Id       UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    FaqId    UNIQUEIDENTIFIER NOT NULL REFERENCES Faq(Id),
    Locale   VARCHAR(10) NOT NULL,
    Question NVARCHAR(500) NOT NULL,
    Answer   NVARCHAR(MAX) NOT NULL,        -- 淨化後 HTML
    CONSTRAINT UX_FaqTr UNIQUE (FaqId, Locale)
);

CREATE TABLE SalesLocation (
    Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    LocationType TINYINT NOT NULL DEFAULT 1,  -- 1 domestic（台灣通路卡） 2 international（國際經銷列）
    CountryCode  VARCHAR(2) NOT NULL,         -- ISO 3166-1（分組用）
    WebsiteUrl   NVARCHAR(400) NULL,
    Phone        NVARCHAR(50) NULL,
    Status       TINYINT NOT NULL DEFAULT 1,
    SortOrder    INT NOT NULL DEFAULT 0,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_SalesLocation_Type ON SalesLocation(LocationType, Status, SortOrder);

CREATE TABLE SalesLocationTranslation (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    SalesLocationId UNIQUEIDENTIFIER NOT NULL REFERENCES SalesLocation(Id),
    Locale          VARCHAR(10) NOT NULL,
    Name            NVARCHAR(200) NOT NULL,
    Address         NVARCHAR(400) NULL,
    RegionLabel     NVARCHAR(120) NULL,       -- 國際列的地區標籤（Europe / Japan / Southeast Asia）
    Note            NVARCHAR(200) NULL,       -- 分店註記（如「3 branches in Taipei」）
    CONSTRAINT UX_SalesLocationTr UNIQUE (SalesLocationId, Locale)
);
```

### 3.7 頁面區段（Page Sections）

> **取代舊版 `PageBlock` / `PageBlockTranslation`。**
> 舊模型以 `BlockType` + `SortOrder` 定位區塊——但 `BlockType` 是**型別**不是**身分**：同一頁出現兩個 `iconText`（首頁 03 Why Partner 與 About 04 Manufacturing points）時，前端只能靠 `SortOrder` 認人，編輯一拖曳就壞版。
> 版面既已鎖定 mockup4，需要的是**穩定身分**：`(PageKey, SectionKey)`。

```sql
CREATE TABLE Page (
    Id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Key]     NVARCHAR(80) NOT NULL UNIQUE,   -- 18 個 key，見 §4 Seed
    Kind      TINYINT NOT NULL DEFAULT 1,     -- 1 singleton（單例頁） 2 template（模板頁共用文案）
    Status    TINYINT NOT NULL DEFAULT 1,
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE PageSection (
    Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    PageId        UNIQUEIDENTIFIER NOT NULL REFERENCES Page(Id),
    SectionKey    NVARCHAR(60) NOT NULL,      -- 穩定身分，見 09 各頁區段表
    SchemaVersion SMALLINT NOT NULL DEFAULT 1,
    IsEnabled     BIT NOT NULL DEFAULT 1,     -- 後台唯一可切換的結構性欄位（整段隱藏）
    SortOrder     INT NOT NULL DEFAULT 0,     -- 唯讀：僅供後台側欄排列；版面順序由前端模板決定
    UpdatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedBy     UNIQUEIDENTIFIER NULL,
    RowVer        ROWVERSION,
    CONSTRAINT UX_PageSection UNIQUE (PageId, SectionKey)
);

CREATE TABLE PageSectionTranslation (
    Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    PageSectionId UNIQUEIDENTIFIER NOT NULL REFERENCES PageSection(Id),
    Locale        VARCHAR(10) NOT NULL,
    DataJson      NVARCHAR(MAX) NOT NULL,     -- 該區段之完整 payload，依 SectionKey 對應 JSON Schema 驗證
    CONSTRAINT UX_PageSectionTr UNIQUE (PageSectionId, Locale)
);
```

**規則**

1. **一 locale 一份完整 payload**：所有欄位（含 media / link / number）都在 `DataJson` 內。
   若把「非翻譯欄位」拆到主表，repeatable 陣列（milestones、concerns、steps）的兩份 JSON 必須靠 index 配對，新增或刪除一筆就錯位。整包同 locale 最不易壞。
   代價（圖片要選兩次）由後台「同步至其他語系」勾選解決（預設開，只同步 media / link / number / enum 型欄位），不進 schema。
2. **Schema registry 放程式碼不放 DB**：`EuniceMed.Core/PageSchemas/{pageKey}.{sectionKey}.json`（JSON Schema Draft 2020-12）。API 以 `GET /admin/page-schema/{key}` 供後台動態生成表單。版面改版走 PR，不是編輯操作。
3. **區段不可新增／刪除／排序**：`PageSection` 列由 seed 同步器依 schema registry 建立。API 不提供 `POST` / `DELETE` sections。
4. **`DataJson` 內的 media 以 `mediaId` GUID 字串存**；引用關係另寫入 `MediaUsage`（§3.10）以維持媒體庫的引用查詢。

### 3.8 下載 / 媒體

```sql
CREATE TABLE Media (
    Id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    BlobUrl   NVARCHAR(500) NOT NULL,           -- normalized master（已依 preset 寬縮圖）
    FileName  NVARCHAR(260) NOT NULL,
    MimeType  NVARCHAR(120) NOT NULL,
    SizeBytes BIGINT NOT NULL,
    AltText   NVARCHAR(300) NULL,
    Width     INT NULL,                         -- master 實際寬（= preset 寬，除非原圖較小）
    Height    INT NULL,
    -- ★【新 2026-08-14】上傳當下套用的尺寸規格，決定縮圖寬與後台提示文字
    PresetKey     VARCHAR(30) NOT NULL,         -- square | page-band | hero-slide | ...（11-media-specs.md §2）
    OriginalWidth  INT NULL,                    -- 上傳原檔尺寸（供「解析度不足」判斷與重新輸出）
    OriginalHeight INT NULL,
    OriginalBlobUrl NVARCHAR(500) NULL,         -- 原檔保留於 `media-originals` 容器，不對外
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Media_Preset ON Media(PresetKey, CreatedAt DESC);

-- ★【新】縮圖輸出：每個 Media 至少 WebP + 原格式各一列
CREATE TABLE MediaVariant (
    Id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    MediaId   UNIQUEIDENTIFIER NOT NULL REFERENCES Media(Id) ON DELETE CASCADE,
    Format    VARCHAR(10) NOT NULL,             -- webp | jpg | png | svg
    Width     INT NOT NULL,
    Height    INT NOT NULL,
    SizeBytes BIGINT NOT NULL,
    BlobUrl   NVARCHAR(500) NOT NULL,
    CONSTRAINT UX_MediaVariant UNIQUE (MediaId, Format, Width)
);
```

> **「解析度不足」不存欄位**：由 `Media.Width < preset.Width` 於 API/後台即時判斷（preset 值可能調整，存下來就會過期）。
> **`PresetKey` 為必填**：沒有 preset 就不知道要縮多寬、後台也無法顯示建議尺寸。既有資料補寫時，以引用該圖的欄位反推（`MediaUsage.FieldPath` → preset 對照表，[11](11-media-specs.md) §5）。

```sql

CREATE TABLE Download (
    Id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    MediaId   UNIQUEIDENTIFIER NOT NULL REFERENCES Media(Id),
    Type      TINYINT NOT NULL,             -- 1 catalog 2 manual 3 certificate
    FileLocale VARCHAR(10) NOT NULL,        -- ★【檔案語言】清單列顯示為「EN · PDF」；
                                            --   與站台語系無關（原名 Locale，語意曾與 Translation.Locale 混淆）
    Status    TINYINT NOT NULL DEFAULT 1,
    SortOrder INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE DownloadTranslation (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    DownloadId  UNIQUEIDENTIFIER NOT NULL REFERENCES Download(Id),
    Locale      VARCHAR(10) NOT NULL,       -- 站台語系（介面顯示用）
    Title       NVARCHAR(300) NOT NULL,
    Description NVARCHAR(300) NULL,         -- 清單列第三段說明文字
    CONSTRAINT UX_DownloadTr UNIQUE (DownloadId, Locale)
);
CREATE TABLE ProductDownload (
    ProductId  UNIQUEIDENTIFIER NOT NULL REFERENCES Product(Id),
    DownloadId UNIQUEIDENTIFIER NOT NULL REFERENCES Download(Id),
    PRIMARY KEY (ProductId, DownloadId)
);
```

> **`Download` 的兩個 locale 欄位**：`Download.FileLocale` = 檔案本身的語言（顯示為 `EN · PDF`）；`DownloadTranslation.Locale` = 站台語系（決定標題與說明用哪個語言顯示）。舊版兩者同名為 `Locale`，語意不明，本版更名釐清。

### 3.9 標籤 / 導覽 / 轉址

```sql
CREATE TABLE Tag (
    Id   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Slug NVARCHAR(80) NOT NULL UNIQUE,
    NameEn NVARCHAR(120) NOT NULL,
    NameZhTw NVARCHAR(120) NULL
);
CREATE TABLE ProductTag ( ProductId UNIQUEIDENTIFIER, TagId UNIQUEIDENTIFIER, PRIMARY KEY(ProductId,TagId) );
CREATE TABLE ArticleTag ( ArticleId UNIQUEIDENTIFIER, TagId UNIQUEIDENTIFIER, PRIMARY KEY(ArticleId,TagId) );

CREATE TABLE MenuItem (
    Id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    ParentId  UNIQUEIDENTIFIER NULL REFERENCES MenuItem(Id),
    Menu      VARCHAR(20) NOT NULL,          -- header | footer
    Url       NVARCHAR(400) NOT NULL,
    SortOrder INT NOT NULL DEFAULT 0
);
CREATE TABLE MenuItemTranslation (
    Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    MenuItemId UNIQUEIDENTIFIER NOT NULL REFERENCES MenuItem(Id),
    Locale VARCHAR(10) NOT NULL,
    Label  NVARCHAR(200) NOT NULL,
    CONSTRAINT UX_MenuItemTr UNIQUE (MenuItemId, Locale)
);

CREATE TABLE Redirect (
    Id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    FromPath   NVARCHAR(400) NOT NULL UNIQUE,
    ToPath     NVARCHAR(400) NOT NULL,
    StatusCode SMALLINT NOT NULL DEFAULT 301,
    CreatedAt  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
```

> **Resources 次導覽列**（Overview｜FAQ｜Insights｜Downloads｜News）**不進 `MenuItem`**，固定於前端模板。版面已鎖定，若開放編輯，一次改壞會讓五頁同時失去導覽。

### 3.10 媒體引用索引（MediaUsage）

```sql
-- PageSection 的 media 藏在 DataJson 內，無法用 FK 反查。此表在任何實體存檔時重建自身列，
-- 供媒體庫「這張圖被誰用了 / 可否刪除」查詢。
CREATE TABLE MediaUsage (
    MediaId   UNIQUEIDENTIFIER NOT NULL REFERENCES Media(Id),
    Entity    NVARCHAR(80) NOT NULL,        -- PageSection | Product | Article | Application | Category | ...
    EntityId  UNIQUEIDENTIFIER NOT NULL,
    Locale    VARCHAR(10) NULL,
    FieldPath NVARCHAR(200) NOT NULL,       -- 如 "milestones[2].image"、"slides[0].image"
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (MediaId, Entity, EntityId, FieldPath)
);
CREATE INDEX IX_MediaUsage_Entity ON MediaUsage(Entity, EntityId);
```

### 3.11 JSON 欄位一覽（判準結果）

| 資料 | 決定 | 理由 |
|------|------|------|
| Certification | **建表** | About + 產品頁兩處重用，且要接下載檔 |
| Article / FAQ 分類 | **建表** | 列表 rail 要 count、要排序、要當篩選條件 |
| SubCategory | **建表** | 有獨立 URL + 產品 FK + 篩選維度 |
| ProductRelated | **建表** | Product↔Product 關聯；JSON 存 GUID 會失去 FK 與刪除保護 |
| NewsEvent | **建表** | 有日期型別（排序／未來活動查詢） |
| SizeChart / Specs / Features / UseCases | **JSON** | 只在該產品表單內編輯，不跨頁不查詢 |
| Category / SubCategory stats、supportLevels | **JSON** | 只在該分類表單內編輯 |
| Application concerns / howTo / supportLevels / mapPosition | **JSON** | 只在該應用方案表單內編輯 |
| PageSection 全部欄位 | **JSON** | 見 §3.7 規則 1 |

### 3.12 表單 / 使用者 / 設定

```sql
CREATE TABLE ContactSubmission (
    Id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Type      TINYINT NOT NULL DEFAULT 0,    -- 0 general 1 product（詢價） 2 partnership
    Name      NVARCHAR(200) NOT NULL,
    Email     NVARCHAR(320) NOT NULL,
    Phone     NVARCHAR(50) NULL,
    Company   NVARCHAR(200) NULL,            -- partnership 用
    Country   NVARCHAR(80) NULL,
    PartnershipType NVARCHAR(40) NULL,       -- oem | odm | distributor（partnership 表單下拉）
    ProductId UNIQUEIDENTIFIER NULL REFERENCES Product(Id),   -- product 詢價來源
    ProductSku NVARCHAR(60) NULL,            -- 送件當下的型號快照（產品改名/換 slug 後仍可追溯）
    Subject   NVARCHAR(300) NULL,
    Message   NVARCHAR(MAX) NOT NULL,
    Locale    VARCHAR(10) NULL,
    IpAddress NVARCHAR(60) NULL,
    Status    TINYINT NOT NULL DEFAULT 0,    -- 0 received 1 handled 2 spam
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Contact_Status ON ContactSubmission(Type, Status, CreatedAt DESC);
-- DB 端的速率限制靠這條數同一個 IP 的近期筆數（04 §9）。
-- 行程內的 token bucket 在 Flex Consumption 上是每個實例各一份，擋不住跨實例的洗版
CREATE INDEX IX_Contact_Ip ON ContactSubmission(IpAddress, CreatedAt);

CREATE TABLE [User] (
    Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    -- 登入識別，全站唯一。**不驗 email 格式**，填 admin 這種純帳號名也可以；
    -- 欄位名沿用 Email 是為了避開 prod 的欄位改名（2026-09-01）
    Email        NVARCHAR(320) NOT NULL UNIQUE,
    DisplayName  NVARCHAR(200) NOT NULL,
    PasswordHash NVARCHAR(MAX) NOT NULL,
    IsActive     BIT NOT NULL DEFAULT 1,
    LastLoginAt  DATETIME2 NULL,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE Role ( Id UNIQUEIDENTIFIER PRIMARY KEY, Name NVARCHAR(60) NOT NULL UNIQUE );
CREATE TABLE UserRole ( UserId UNIQUEIDENTIFIER, RoleId UNIQUEIDENTIFIER, PRIMARY KEY(UserId,RoleId) );
CREATE TABLE RefreshToken (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId UNIQUEIDENTIFIER NOT NULL REFERENCES [User](Id),
    TokenHash NVARCHAR(MAX) NOT NULL,
    ExpiresAt DATETIME2 NOT NULL,
    RevokedAt DATETIME2 NULL
);

-- AuditLog 已於 2026-08-30 移除（migration `DropAuditLog`），理由見 15-cms-scope.md §8。

CREATE TABLE Setting (
    [Key]     NVARCHAR(120) NOT NULL PRIMARY KEY,   -- company.address, company.phone, company.email,
                                                    -- company.hours, social.linkedin, seo.default...
    ValueJson NVARCHAR(MAX) NOT NULL,               -- 不需翻譯的值（URL、email、電話）
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
-- 需翻譯的設定值（地址、營業時間文字）走此表；Contact 頁四格資訊即由此取用
CREATE TABLE SettingTranslation (
    [Key]     NVARCHAR(120) NOT NULL REFERENCES Setting([Key]),
    Locale    VARCHAR(10) NOT NULL,
    ValueJson NVARCHAR(MAX) NOT NULL,
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY ([Key], Locale)
);
```

---

## 4. 種子資料（Seed）

- **`Role`**：Admin、Editor、Author、Viewer。
- **`Category`**（3）：`medical-compression-stockings`、`orthopedic-support`、`footcare-insoles`。
- **`SubCategory`**（17，slug 取自 `mockup4/images/products/` 檔名前綴，去掉尾碼 `-1`）：

  | Category | SubCategory slug |
  |---|---|
  | medical-compression-stockings | `stockings-for-venous-therapy`、`stockings-for-edema-therapy`、`stockings-for-antiembolism`、`stockings-for-everyday`、`travel-stockings`、`diabetic-socks` |
  | orthopedic-support | `knee-support`、`back-support`、`ankle-support`、`wrist-support`、`elbow-support`、`shoulder-support`、`neck-support` |
  | footcare-insoles | `silicone`、`gel`、`moisturizing`、`high-heel-sandals` |

- **`Collection`**（3）：care(1)、protect(2)、advance(3)。
- **`Certification`**（5）：`iso-13485`、`ce`、`oeko-tex-100`、`patented`、`mit`。
- **`BodyPart`**（7）：knee、ankle、elbow、wrist、back、foot、leg；其中 `ShowOnBodyMap = 1` 僅 **back、knee、ankle、foot**。
- **`Application`**：
  - `Type = bodyPart`（4，與人體圖一致）：`back`、`knee`、`ankle`、`foot`，`ShowOnBodyMap = 1`，`MapPositionJson` 取自 `mockup4/Applications.dc.html`（SVG viewBox 座標）：

    | slug | hotspot (cx, cy) | chip (cx, cy) |
    |---|---|---|
    | back | 130, 195 | 130, 204 |
    | knee | 152, 395 | 154, 334 |
    | ankle | 108, 505 | 107, 470 |
    | foot | 165, 538 | 168, 504 |

  - `Type = specialCare`（3）：`elderly-care`、`bunion-relief`、`post-operative-recovery`。
- **`ArticleCategory`**：`Kind = news` → `exhibitions`、`sponsorship`、`company`；`Kind = insight` → `medical`、`esg`、`sponsorship`。
- **`FaqCategory`**（3）：`use`（Product use）、`sizing`（Sizing）、`order`（Ordering & partnership）。
- **`Page`**（18）：

  | Kind | Key |
  |---|---|
  | 1 singleton | `home`、`about`、`products`、`applications`、`partnership`、`resources`、`faq`、`insights`、`news`、`downloads`、`where-to-buy`、`contact`、`privacy` |
  | 2 template | `product-category`、`product-detail`、`application-detail`、`article-detail`、`news-detail` |

  > 子分類頁沿用 `product-category` 的共用文案，不另設 key。

- **`PageSection`**：由 seed 同步器依 `EuniceMed.Core/PageSchemas` 建立（約 60–70 筆），`SectionKey` 清單見 [09-page-blocks.md](09-page-blocks.md)。
- **`Setting` / `SettingTranslation`**：公司地址、電話、信箱、營業時間、LinkedIn、SEO 預設。
- 預設 Admin 帳號（密碼由環境變數注入，首次登入強制改密）。

### 4.1 舊站產品匯入對照

`reference/legacy/products.json` 結構為 `{ subCategorySlug: [{ name, model, features[], image, file }] }`：

| 來源 | 目標 |
|---|---|
| 物件 key | `SubCategory.Slug` |
| `model` | `Product.Sku` |
| `name` | `ProductTranslation.Name`（locale = en） |
| `features[]` | `ProductTranslation.FeaturesJson[].body`（`icon`/`title` 需人工補） |
| `image` | `ProductImage` → `Media` |
| `file` | `Download`（type 依副檔判定）+ `ProductDownload` |

由 `POST /admin/products/import` 或一次性 seeding script 執行，見 [04-api.md](04-api.md) §6。完整 slug 對照見 [10-legacy-content.md](10-legacy-content.md) §5.4。

---

## 5. 遷移與環境

- **EF Core Migrations** 唯一變更途徑；遷移檔納版控、過 code review。
- **套用時機：Function App 啟動時自動執行 `db.Database.MigrateAsync()`**（`Api/Program.cs`，位於 `host.Build()` 之後、`host.RunAsync()` 之前）。與 Jabez 專案一致，CI 不碰資料庫，也因此不受客戶 SQL 防火牆政策影響。

  > ⚠️ **這條路的代價**：Flex Consumption 的 app init 有 **30 秒硬上限且不可調整**，且**沒有 deployment slot**。migration 若逾時或失敗，等於整個 Function App 起不來，而目標是**客戶的正式資料庫**。因此：
  > - 破壞性變更一律「擴張 → 遷移 → 收縮」拆成三支 PR，每一步都能與舊版程式共存。
  > - 大型資料回填**不要**寫進 migration，改成維護端點或背景工作。
  > - schema 變大後要定期實測冷啟動耗時（`curl -w '%{time_total}'`），把數字記錄下來。
  > - 部署前確認客戶 DB 的 PITR 還原點。
- **媒體 preset 遷移（2026-08-14）**：`Media` 加 `PresetKey`（必填）、`OriginalWidth/Height`、`OriginalBlobUrl`，新增 `MediaVariant` 表，`Product` 刪 `TowerImageMediaId`。既有資料以 `MediaUsage.FieldPath` 反推 preset（對照見 [11-media-specs.md](11-media-specs.md) §5），無引用者暫填 `square` 並於媒體庫標示待確認；已入庫圖片以背景工作重新輸出 master 與 variant，不阻塞部署。
- **PageSection seed 同步器**：緊接在啟動 migrate 之後執行，比對 `PageSchemas` 目錄與 `PageSection` 資料列——新增缺少的區段（帶 schema 預設值）、標記已移除的區段為停用（不硬刪，保留內容供回溯）。**不由編輯者觸發**。
  同步失敗時只寫 `Console.Error` 不重拋（照 Jabez importer 的做法）——區段同步失敗不該讓整個 Function App 起不來。另提供 `POST /admin/maintenance/sync-page-sections` 供手動重跑。
- **只有一套 prod 資料庫**（客戶提供），無雲端 staging；正式庫禁手改，一切走 migration。
- 備援：Azure SQL 自動備份 + PITR；正式環境啟用異地備援/長期保留。

---

## 6. 效能與安全

- 熱路徑查詢（依 slug/locale/status）皆有覆蓋索引；`IX_Product_Featured`、`IX_Application_BodyMap`、`IX_Article_Category` 為 mockup4 版面新增的熱路徑。
- 分類 rail 的 count（FAQ / Insights / News / Downloads）以 `GROUP BY` 單次查詢取回，不逐項 count；見 [04-api.md](04-api.md) `?facets=true`。
- `DataJson` / `*Json` 欄位在寫入時以 JSON Schema 驗證（API 層），DB 端不加 `ISJSON` CHECK 以免影響寫入效能；查詢不依賴 JSON 內容。
- 大量讀取可加 Dapper 投影或 API 端記憶體快取。**本案無 Front Door/CDN**，純 SSR 熱頁的每次請求都會打到 DB，索引與連線池是唯一防線。
- 連線採 **Managed Identity**（`Authentication=Active Directory Default`）優先；DB 由客戶提供，需在其 SQL Server 設 Entra 管理員後 `CREATE USER [func-eunicemed-prod] FROM EXTERNAL PROVIDER`，授 `db_datareader`/`db_datawriter`/`EXECUTE`。若客戶只提供帳密，則連線字串放 **App Settings**（本案無 Key Vault），並使用最小權限帳號（非 `sa`）。
- 連線池：Flex Consumption 會水平擴展多實例，每實例各有連線池。需設定 `Max Pool Size` 與 Function App 的 max instance count，避免打爆客戶 DB 的連線上限（上線前需與客戶確認該上限）。
- 啟用 TDE（透明資料加密，Azure SQL 預設）；可選 Always Encrypted 於敏感欄位。
- 所有查詢參數化（EF/Dapper），杜絕 SQL injection。

> **子分類落地頁的 thin-page 風險**：17 筆子分類中部分（如 `travel-stockings`、`diabetic-socks`）產品數僅 1–2 筆。`SubCategoryTranslation.Description` 為 SEO 必填欄位，內容不足者應以 `Status = 0` 不發布，避免產出薄內容頁。
