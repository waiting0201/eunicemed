"""
產生全站共用的 Open Graph 預設圖（1200×630）。

用法（在 repo 根目錄）：
    python3 tools/og-image.py

輸出：apps/web/public/brand/og-default.png

**為什麼要有這張圖**：分享任何沒有自己封面的頁面（首頁、產品列表、FAQ、
下載…）到 LINE／Facebook／Slack 時，`og:image` 缺席的結果是一塊空白，
而那正是社群上最常被點的版位。內容有自己的圖時仍以內容的圖優先，
這張只是保底（`lib/seo.ts` 的 `OG_IMAGE_DEFAULT`）。

**字型**：品牌英文字 Myriad Variable Concept 的 TTF 在 `reference/fonts/`
（不進版控，見 docs/14）。字型缺席時直接失敗而不是換一套字 ——
用系統字硬出一張圖，會讓品牌識別在最常被看到的版位上是錯的。

輸出的 PNG 有進版控；這支腳本只在版型或標語改變時重跑。
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
INK = '#16333B'       # 主文字（docs/08 的 ink）
MUTED = '#66787F'     # 次文字
CYAN = '#00B5CD'      # 品牌色 Pantone 7466c
TINT = '#F5FAFB'      # 淺色區塊底
HALO = '#E9F8FA'      # 圖示底色

FONT = 'reference/fonts/myriad-variable-concept/MyriadVariableConcept.ttf'
LOGO = 'apps/web/public/brand/eunicemed-logo.png'
OUT = 'apps/web/public/brand/og-default.png'


def myriad(size, weight):
    """Myriad 是 variable font，字重要用 axes 指定，不是換檔案。"""
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_axes([weight])
    return f


def centered(draw, text, font, y, fill):
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    draw.text(((W - (right - left)) / 2 - left, y - top), text, font=font, fill=fill)
    return bottom - top


img = Image.new('RGB', (W, H), TINT)
draw = ImageDraw.Draw(img)

# 右上角的淡色暈開 —— mockup4 到處都是這種淺青色塊，用來讓純色底不那麼平
draw.ellipse((W - 380, -260, W + 260, 380), fill=HALO)
draw.ellipse((-300, H - 200, 260, H + 320), fill=HALO)

logo = Image.open(LOGO).convert('RGBA')
logo = logo.resize((520, round(520 * logo.height / logo.width)), Image.LANCZOS)
img.paste(logo, ((W - logo.width) // 2, 150), logo)

# 標語是品牌符號，不翻譯（docs/08 §5.2）。破折號那一刀分成兩行，
# 一整行 46px 在 1200 寬會逼近邊界，縮小字級又會讓它在縮圖裡讀不出來。
centered(draw, 'Not Just a Motion', myriad(52, 600), 402, INK)
centered(draw, 'enhancing your quality of life', myriad(30, 400), 474, MUTED)

draw.rectangle((0, H - 8, W, H), fill=CYAN)

img.save(OUT, optimize=True)
print(f'{OUT}  {img.width}×{img.height}')
