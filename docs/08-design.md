# 08 · 品牌與設計規範（Design Guidelines）

> 上層導覽見 [CLAUDE.md](../CLAUDE.md)。來源檔存於 `reference/sbk/`：
> - `標準EuniceMed logo 及其他圖形使用規範.pdf` — CIS logo/色彩規範
> - `EuniceMed Website Ref_Weypro.pdf` — subkarma「Website Sitemap Design Reference」260626 V01（品牌定位、字型、網站架構與風格方向）
> - `EuniceMed 素材整理新版 20250110.ai` — 包裝/型錄素材總表（icon、認證標章、色票、logo 變體）
>
> **適用範圍：對外品牌與公開網站**。版面已由 `mockup4/` 鎖定，照著切即可。
> **本文件不涵蓋 CMS 後台介面** —— 後台沒有 mockup、沒有設計稿，是要現場設計的：
> 沿用本文件 §2–§4 的品牌色與字型 token，但版面規則與設計流程另見 [03-cms.md](03-cms.md) §8.1，
> 且**動手前必須先啟動 `frontend-design` skill**。

---

## 1. 品牌定位（All in one Premium Promise）

| 面向 | 內容 |
|------|------|
| 品牌承諾 | To set a new standard for thoughtfully crafted medical supports — helping people move with confidence, and giving partners a team they can truly count on. |
| 品牌願景 | We deliver clinically trusted, comfort-first medical supports — with the flexibility, service, and precision your patients and business deserve. |
| 品牌感覺 | Understood 充分理解 · In Good Hands 安心託付 |
| 品牌價值 | Excellence 卓越 · Care 關懷 · Partnership 夥伴關係 |
| 品牌個性 | Precise 精準講究 · Diligent 細心盡責 · Approachable 溫暖親切 |
| 品牌語調 | Purposeful 使命導向 · Considerate 同理關懷 |
| Slogan | **Not Just a Motion**（字標單色 Pantone 7466c） |
| Campaign 標語 | Support Feels Personal |

> 文案撰寫（含 UI 字串、SEO 描述）依上述語調：專業精準但溫暖親切，避免誇大療效宣稱。

---

## 2. 色彩系統

### 2.1 品牌主色

| 色 | Pantone（特別色） | CMYK | RGB / HEX（數位媒體） | 用途 |
|----|------------------|------|----------------------|------|
| 品牌灰 | Pantone 423c | K=60% | `rgb(137,137,137)` / **`#898989`** | Logo 主字、輔助文字 |
| 品牌青 | Pantone 7466c | C73 M0 Y20 K0 | `rgb(0,181,205)` / **`#00B5CD`** | Logo「+」、Aergo 子品牌、Slogan、主 CTA/強調色 |

> 網站以 **HEX 值**為準（設計規範「數位媒體用」章節）；印刷品才用 Pantone/CMYK。

### 2.2 產品系列（Collection）專色

| 系列 | Pantone | 近似 HEX（供網站標籤/徽章，實作時以設計稿校準） | 定位 |
|------|---------|--------------------------------|------|
| **CARE** | Pantone 7746c | `#A8AD3C`（橄欖綠） | 日常輕度緩解 |
| **PROTECT** | Pantone 5415c | `#5B7F95`（灰藍） | 高強度活動的強力支撐 |
| **ADVANCE** | Pantone 5125c | `#7A4D6F`（暗紫） | 復健導向的針對性保護 |

### 2.3 Tailwind 設計 token（建議命名）

```js
// tailwind.config — theme.extend.colors
brand: {
  teal: '#00B5CD',   // Pantone 7466c
  gray: '#898989',   // Pantone 423c
},
collection: {
  care: '#A8AD3C',      // Pantone 7746c
  protect: '#5B7F95',   // Pantone 5415c
  advance: '#7A4D6F',   // Pantone 5125c
}
```

---

## 3. Logo 使用規則

| 版本 | 使用情境 |
|------|----------|
| 標準 logo（灰字＋青 +、圓角外框） | 淺色背景 |
| 深色背景版（反白） | 深色背景；灰改 25% 濃度處理 |
| 小尺寸版（寬 < 45mm，® 加大） | 印刷小面積；網站上小尺寸（如 favicon 旁、footer）比照使用 ® 加大版向量檔 |
| 紙盒用（青底白框反白） | 包裝；網站深青色塊上可比照 |

- Logo 檔一律使用 `reference/sbk/EuniceMed 素材整理新版 20250110.ai` 內的向量原稿轉出 SVG，**不得自行重繪或改色**。
- 子品牌：**AerGo**（青色字標，Pantone 7466c）、**motif MEDICAL**；與主 logo 並用時遵循素材檔配置。
- 認證/產地標章素材（ISO 13485、CE、Oeko-Tex Confidence in Textiles、Patented、Taiwan）也在素材檔內，供 About/產品頁/footer 使用。

---

## 4. 字型

| 語系 | 規範字型 | 網站實作注意 |
|------|----------|--------------|
| 英文 | **Myriad Variable Concept** | 字型檔已入庫 `reference/fonts/myriad-variable-concept/`（`MyriadVariableConcept.woff2` + `.ttf`）。為 variable font，含 **Weight（Light–Black）與 Width（Condensed–SemiExtended）兩軸**，一檔涵蓋全部字重。下載來源：<https://www.onlinewebfonts.com/download/3a86b8ec8855002aad8b288eaba8915d>（品牌方提供之下載點；該站為第三方轉檔站，正式上線前建議法務確認 Adobe 授權）。 |
| 中文 | **微軟正黑體（Microsoft JhengHei）** | Windows 系統字型、無 webfont 授權；網站以 **Noto Sans TC** 為 web 替代，font stack 保留 `"Microsoft JhengHei"` 於前位。 |

- 以 `next/font/local` 自託管 woff2（variable font 宣告 `font-weight: 300 900`），避免外部字型請求（見 [02-frontend.md](02-frontend.md)）。
- 建議 stack：`"Myriad Variable Concept", "Microsoft JhengHei", "Noto Sans TC", sans-serif`。

---

## 5. 品牌圖形與視覺風格

- **核心圖形**：青色系**同心弧線／四分之一圓條紋**（濃淡漸層的 stripe 弧），用於 hero、視覺分隔與海報；亦有波浪飄帶變體（素材檔）。
- **攝影風格**：真實使用情境（運動、辦公、日常），淺灰/白背景，產品（灰＋青配色的護具）為視覺焦點。
- **版面風格（已定案）**：以 Weypro Concept B 中的 **spur.fit 參考**為基準——現代 SaaS 質感：淺色漸層 hero、深墨色粗標題、pill 按鈕、玻璃感浮動註記 chip。實作範本見 `mockup/`（v2）。

### 5.1 設計原則（實作準則）：對齊 spur.fit

| 面向 | 準則 |
|------|------|
| Hero | **淺色霧藍漸層**（`#F4FAFC → #E3F2F6 → #CFE9EF`）＋深墨色標題；首頁採左文案、右照片卡（圓角 26px、深陰影）、照片旁浮動註記 chip；弧線紋理低透明度（~5%）當背景 |
| 文字（加重） | 標題 Myriad **Semibold（h1 680 / h2 620 / h3 570）**、字距微收（-0.015em）、行高緊（1.16）；關鍵字用品牌青 `--teal-deep` 高亮；內文 400、行高 1.7；標題色深墨 `#16333B` |
| 色彩 | 品牌青做 CTA、高亮字、chip 圓點，以及中段**滿版青色漸層帶**（Why Partner／認證／詢價區青底反白）；一個畫面限「青＋墨＋白」；系列專色僅徽章 |
| 簽名元素 | **浮動註記 chip**（白玻璃 pill＋teal 脈動點＋柔和陰影）：hero 標產品功能點、Applications 標人體部位——全站共用同一語彙 |
| 按鈕 | pill 形、字重 620、teal 底帶色陰影（`0 8px 22px rgba(0,150,170,.28)`）、hover 上浮 2px |
| 卡片 | 圓角 20px、1px 淺框（`#DFE9EC`）、hover 上浮＋柔和大陰影 |
| 動效（easing） | 回彈曲線 `cubic-bezier(0.34,1.56,0.64,1)`（pop）＋緩出 `cubic-bezier(0.22,1,0.36,1)`；內容切換＝淡入＋上移 12px；`prefers-reduced-motion` 全面尊重 |
| 圖像 | 明亮自然光情境照；去背產品圖配淺灰底；避免暗調濾鏡 |

### 5.1a 應用方案人體圖（已定案，取代 09 §4.3 線稿版）

- **僅 4 個部位**：膝 Knee、踝 Ankle、腰背 Back & Waist、足 Foot。
- 人形為**實心柔和漸層剪影**（`#D9EBF0 → #B7D5DE`，`userSpaceOnUse` 漸層讓多形狀無縫成一體），粗臂粗腿、圓端點——**不用細線稿**。
- 熱點＝白心 teal 環＋漣漪 pulse；選取時該部位以 blur glow 用 pop easing 彈入。
- 每部位配一顆浮動 chip（簽名元素樣式）；marker／chip／右側部位卡**三向連動**；資訊卡切換帶淡入上移。

> 一句話檢核：**「淺底、粗標、青點睛、chip 會呼吸」**。

### 5.2 文案語言純度（每語系單一語言）

- **英文版頁面不得出現中文、中文版頁面不得出現英文**——所有 UI 字串、導覽標籤、按鈕、tooltip、表單欄位、錯誤訊息、alt 文字皆須是該 locale 的單一語言，**不做中英並列標籤**（如「About 關於我們」這種併排寫法僅限內部文件，不進 UI）。
- 例外（視為品牌符號，不算外語）：logo「EUNICEMED」、子品牌 AerGo/motif、slogan「Not Just a Motion」字標、系列名 **CARE / PROTECT / ADVANCE**（註冊分級名，中文版保留原文，可於首次出現時加中文說明）、認證縮寫（ISO 13485、CE）、產品型號（CPO-XXXX）。
- CMS 內容（產品描述、文章）同樣遵守：zh-TW 翻譯欄位不得以英文原文充數；未翻譯完成的內容在該語系**不顯示**（fallback 隱藏，而非露出英文）。

---

## 6. 產品素材規範（型錄/包裝 → 網站可沿用）

- **功能/材質 icon 集**：約 40 個線條 icon（透氣、抗菌碳纖、Lycra、矽膠、洗滌方式等），來源為素材 .ai 檔，網站產品頁 Features 區以此組 icon 呈現。
- **尺寸標示**：S / M / L / XL / XXL / S-M / L-XL / One Size；尺寸對照表（身高/圍度）格式見素材檔。
- **產品編號**格式：`CPO-XXXX`。
- 包裝色票（CPF 系列色等）屬印刷用，網站不需引入。
