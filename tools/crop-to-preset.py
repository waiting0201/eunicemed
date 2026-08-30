"""
把來源圖裁成某個 media preset 的比例，錨點與前台的 `object-position` 一致。

用法：
    python3 tools/crop-to-preset.py <來源> <輸出> <preset> [object-position] [版位比例]

    python3 tools/crop-to-preset.py mockup4/images/brand-pattern-src.jpg \
        out.jpg page-band center

**為什麼需要這一步**：媒體管線是「只縮不放、不裁切」（docs/11 §1、§4）——
preset 的 height 只用來出警告，實際裁切是前台的 `object-fit: cover` 做的。
所以丟一張 2480×3508 的直式圖進 `page-band`（2560×480），伺服器會原樣存下
8.7MP，瀏覽器下載一整張、CSS 丟掉其中 87% 只為了顯示一條 480px 的橫幅。
視覺結果是對的，頻寬不是 —— SWA Free 只有 100GB/月（docs/07 §7）。

先在這裡裁成 preset 的比例，管線就只剩「縮到 preset 寬度」這一件事要做。

**錨點必須與前台一致**，否則裁出來的構圖會與設計稿不同。目前 About 三處：
    page-band      → object-position: center       （PageBand.tsx）
    portrait-4x5   → object-position: top center   （about/page.tsx portraitImg）
    section-bg     → object-position: center 25%   （about/page.tsx s02Img）

**版位比例**（第 5 個參數，形如 `21:9`）用在「preset 的比例不等於版位比例」的地方 ——
裁切要跟著**版位**走，preset 只決定存檔寬度與大小上限。Partnership §01／§02 的
`WideShot` 就是這種：版位是 21:9（`img` 上的 2100×900 也是這個比例），
但 schema 掛的是 `section-bg`（2.844）與 `wide-16x9`（1.778）。
照 preset 裁會裁過頭，瀏覽器接著再 cover 一次，構圖就跟設計稿不同了。
"""
import json, sys
from PIL import Image

src, dst, preset_key = sys.argv[1], sys.argv[2], sys.argv[3]
position = sys.argv[4] if len(sys.argv) > 4 else 'center'
slot_ratio = sys.argv[5] if len(sys.argv) > 5 else None

presets = {p['key']: p for p in json.load(open('Api/Media/media-presets.json'))['presets']}
preset = presets[preset_key]
if slot_ratio:
    rw, rh = (float(n) for n in slot_ratio.replace('/', ':').split(':'))
    target = rw / rh
    shape = f'{preset_key} 版位 {slot_ratio}'
else:
    target = preset['width'] / preset['height']
    shape = f'{preset_key} {preset["aspect"]}'

# CSS 的 object-position：關鍵字換算成百分比。只有縱向那一維會用到 ——
# 這裡處理的都是「原圖比版位高」的情況（橫向溢出的話 x 才會有作用）
VERTICAL = {'top': 0.0, 'center': 0.5, 'centre': 0.5, 'bottom': 1.0}
parts = position.replace('%', '').split()
raw = parts[-1] if len(parts) > 1 else position
anchor = VERTICAL.get(raw, None)
if anchor is None:
    anchor = float(raw) / 100

img = Image.open(src)
w, h = img.size

if w / h > target:
    # 原圖比版位寬 → 裁左右（依水平錨點，這裡一律置中）
    new_w = round(h * target)
    left = (w - new_w) // 2
    box = (left, 0, left + new_w, h)
else:
    # 原圖比版位高 → 裁上下，位移由 object-position 的縱向值決定
    new_h = round(w / target)
    top = round((h - new_h) * anchor)
    box = (0, top, w, top + new_h)

out = img.crop(box)

# mockup4 有幾個檔案是 PNG 卻取名 .jpg（band-teal、about-athlete），Pillow 會回 RGBA。
# 目標是 JPEG，存不了 alpha —— 全不透明就直接轉；真有透明才疊白底並說明。
if out.mode in ('RGBA', 'LA', 'P'):
    out = out.convert('RGBA')
    alpha = out.getchannel('A')
    if alpha.getextrema() == (255, 255):
        out = out.convert('RGB')
    else:
        flat = Image.new('RGB', out.size, (255, 255, 255))
        flat.paste(out, mask=alpha)
        out = flat
        print('  ⚠ 來源有透明區域，已疊在白底上')

out.save(dst, quality=95, subsampling=0, optimize=True)

print(f'{src}  {w}×{h}  →  {dst}  {out.size[0]}×{out.size[1]}'
      f'   （{shape}，錨點 {position}）')
if out.size[0] < preset['width']:
    print(f'  ⚠ 寬度 {out.size[0]} < preset 的 {preset["width"]} —— '
          f'來源就這麼寬，放大是假的畫素，維持原寬')
if slot_ratio:
    print(f'  ⚠ 裁的是版位比例 {slot_ratio}，不是 {preset_key} 的 {preset["aspect"]} —— '
          f'上傳時會出現一則比例提示，可忽略')
