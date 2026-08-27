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
| 品牌色與 logo 使用規範、重出 logo 圖檔 | `reference/sbk/` |

> ⚠️ 若 `apps/web` 底下也放了字型檔，**同樣的授權問題會跟著進版控**。
> 上線前確認 Adobe 授權，或改用可再散布的替代字型。

---

## Logo 圖檔怎麼來的（可重出）

`apps/web/public/brand/eunicemed-logo.png`（亮底）與 `eunicemed-logo-on-dark.png`（深底）
**是進版控的**，因為前台 build 需要它們；但它們是從**不進版控**的
`reference/sbk/EuniceMed 素材整理新版 20250110.ai` 導出的衍生檔。
要換尺寸或修色，回頭從 `.ai` 重出，不要去拉伸現有的 PNG。

規範（`reference/sbk/標準EuniceMed logo 及其他圖形使用規範.pdf`）決定了兩件事：

1. **顏色取「數位媒體用 EuniceMed logo」那一組**：灰 `rgb(137,137,137)`、青 `rgb(0,181,205)`。
   `.ai` 檔內是特別色印刷值（`rgb(137,140,141)` / `rgb(11,157,184)`），**不可直接用在網站上**。
2. **版本取「小於 45mm（®加大）」那一支**。45mm ≈ 170px，網站上的 logo 一律小於此。
   深色底另有官方的「深色背景用」版本（字與外框 `#E1E1E1`，加號維持品牌青），
   即 `-on-dark` 那支 —— 不是把亮版反白算出來的。

重出步驟（macOS，需 `poppler` 與 Python 的 Pillow）：

```bash
# 1. 從 .ai 取出 logo 那一欄，600dpi、透明背景
pdftocairo -png -transp -r 600 -x 80 -y 6700 -W 1400 -H 2000 \
  "reference/sbk/EuniceMed 素材整理新版 20250110.ai" rows

# 2. rows-1.png 由上而下是三支：標準版 / ®加大 / ®加大深色背景用
#    取第 2、3 支（y 767–1233、1439–1905，x 135–1318），
#    把印刷色換成數位色，縮到 480px 寬，再量化成調色盤 PNG（22KB → 4.6KB）
```

```python
# 3. 換色 + 縮圖 + 量化。原稿只有兩個實色，反鋸齒只吃 alpha 不吃 RGB，
#    所以「非青即灰」的二值分類就夠，不必做色彩距離。
from PIL import Image

ROWS = {'eunicemed-logo': (767, 1233), 'eunicemed-logo-on-dark': (1439, 1905)}
im = Image.open('rows-1.png').convert('RGBA')

for name, (y0, y1) in ROWS.items():
    c = im.crop((135, y0, 1318, y1 + 1))
    px, (w, h) = c.load(), c.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if b - r > 60:                                    # 加號
                px[x, y] = (0, 181, 205, a)
            elif name.endswith('on-dark'):                    # 深底版的字與外框
                px[x, y] = (225, 225, 225, a)
            else:                                             # 亮底版的字與外框
                px[x, y] = (137, 137, 137, a)
    c = c.resize((480, round(480 * h / w)), Image.LANCZOS)
    c.quantize(colors=64, method=Image.Quantize.FASTOCTREE).save(
        f'apps/web/public/brand/{name}.png', optimize=True)
```

> `mockup4/images/logo.png` 與 `logo-on-dark.png` 是同樣的兩個檔（mockup4 不進版控）。
