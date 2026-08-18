# 素材與參考檔（不進版控）

本 repo 是**公開**的，因此以下目錄**刻意排除在版控之外**（`.gitignore`）。
檔案仍在開發者的本機工作目錄裡，換機器或新人加入時需另外取得。

| 目錄 | 內容 | 為什麼不進版控 |
|---|---|---|
| `reference/sbk/` | 代理商（Weypro／subkarma）的品牌素材、logo 規範 PDF、`.ai` 原始檔、網站架構提案 | 客戶與代理商的未公開素材，約 35MB |
| `reference/fonts/myriad-variable-concept/` | Myriad Variable Concept（`.ttf` / `.woff2`） | **Adobe 商業字型**。下載點為第三方轉檔站，授權待法務確認（[08-design.md](08-design.md) §4）—— 放進公開 repo 等於再散布 |
| `reference/EuniceMed網站規劃書.pdf`、`EuniceMed官網建置時程.*` | 客戶的規劃與時程文件 | 客戶內部文件 |
| `reference/legacy/products.json` | 舊站產品匯入來源（149 筆） | 內含客戶產品資料，且匯入完成後不再需要 |
| `mockup/` `mockup2/` `mockup3/` `mockup4/` | 版型迭代，各約 38MB。**`mockup4` 是客戶定案的那一版** | 設計稿為客戶資產；圖片進了 git 歷史就拿不掉 |

## 取得方式

向專案負責人索取上述目錄的壓縮檔，解壓到 repo 根目錄即可 —— 路徑要與上表一致，
因為 `CLAUDE.md` 與 `docs/` 內的引用都是相對於 repo 根目錄寫的。

## 哪些地方會用到

| 用途 | 需要的目錄 |
|---|---|
| 切版時對照設計稿 | `mockup4/` |
| 前台字型（`apps/web/app/fonts/`）| `reference/fonts/`（字型檔實際上已複製進 `apps/web`，見下） |
| 舊站產品匯入 `POST /admin/products/import` | `reference/legacy/products.json` |
| 品牌色與 logo 使用規範 | `reference/sbk/` |

> ⚠️ 若 `apps/web` 底下也放了字型檔，**同樣的授權問題會跟著進版控**。
> 上線前確認 Adobe 授權，或改用可再散布的替代字型。
