"""把 `mockup4/Home.dc.html` 的首頁素材與假資料灌進**本機**。

兩件事：

1. **Hero 輪播的 banner** —— 上傳 `mockup4/images/banner-src.jpg`。
   先用 `tools/crop-to-preset.py` 裁成 `hero-slide` 的 8:3、錨點 `center`，
   因為前台 `HeroSlider` 就是 `object-fit:cover;object-position:center`，
   裁出來的構圖與設計稿逐格相同（做法與理由見該工具的 docstring）。
   兩個語系的 `slides[0].image` 一起換掉 —— 那個欄位是 `x-localeInvariant`。

   裁好的檔案留在 **`mockup4/output/hero-banner.jpg`**（8000×3000，2.0MB）。
   正式站沒有這支腳本可跑，要人工從後台上傳**同一個檔案**：
   媒體 preset 選 `hero-slide`，再指到首頁 heroSlider 的第一張。
   上傳後會跳「建議 ≤500 KB」的 oversized 警告 —— 那說的是來源檔，
   管線縮出來的 master 只有 ~145 KB，照做法本來就會出現，不必理會。

2. **04 Trusted worldwide** —— 英文逐字取自 mockup4，中文為譯稿。

⚠️ **這是版型上的假資料，不是客戶內容，只灌本機。**
`home-sections.py`（打正式站）刻意不填 testimonial：正式站寧可讓語言純度
把整段藏起來，也不要放一段我們編出來的客戶推薦。這支是為了讓本機看得到
mockup4 的版面，預設 base URL 因此是 localhost，換成正式站前請先想清楚。

用法：

    python3 tools/migration/mockup4-home.py            # 自動登入本機 API
    python3 tools/migration/mockup4-home.py /tmp/token [base-url]
"""
import json, subprocess, sys, urllib.request, uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://localhost:7071/api'
BANNER = ROOT / 'mockup4' / 'images' / 'banner-src.jpg'
OUTPUT = ROOT / 'mockup4' / 'output'

args = sys.argv[1:]
token_file = args[0] if args else None
if len(args) > 1:
    BASE = args[1]


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{BASE}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        return json.load(e)


def login():
    """本機的種子帳號在 `Api/local.settings.json`，不寫死在這裡。"""
    cfg = json.loads((ROOT / 'Api' / 'local.settings.json').read_text())['Values']
    body = json.dumps({'email': cfg['Seed__AdminEmail'],
                       'password': cfg['Seed__AdminPassword']}).encode()
    req = urllib.request.Request(f'{BASE}/auth/login', data=body, method='POST',
                                 headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=30))['data']['accessToken']


TOKEN = Path(token_file).read_text().strip() if token_file else login()


# ── 1. Hero banner ──────────────────────────────────────────────────
# 產出的檔名帶內容雜湊，重跑會落在同一個 blob 上 —— 但**媒體庫仍會多一列**
# （上傳端點不以檔名去重）。所以先問媒體庫，有就沿用。
# 換掉來源圖時，先在後台刪掉這一筆再跑。
BANNER_FILE_PREFIX = 'hero-banner-'


def existing_banner():
    r = call('GET', f'/admin/media?presetKey=hero-slide&search={BANNER_FILE_PREFIX}')
    for m in r.get('data') or []:
        if m['fileName'].startswith(BANNER_FILE_PREFIX):
            return m
    return None


def crop_banner():
    """裁成 preset 比例，留在 `mockup4/output/` —— 正式站要靠人工從後台上傳同一張。"""
    OUTPUT.mkdir(parents=True, exist_ok=True)
    cropped = OUTPUT / 'hero-banner.jpg'
    subprocess.run([sys.executable, str(ROOT / 'tools' / 'crop-to-preset.py'),
                    str(BANNER), str(cropped), 'hero-slide', 'center'],
                   cwd=ROOT, check=True)
    return cropped


def upload_banner():
    """把裁好的圖以 multipart 上傳，回傳 mediaId。"""
    payload = crop_banner().read_bytes()

    # multipart/form-data 手工組 —— 標準庫沒有，為了一個檔案不值得裝 requests
    boundary = uuid.uuid4().hex
    parts = []
    for name, value in (('presetKey', 'hero-slide'),
                        ('altText', 'EuniceMed — Support Feels Personal')):
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"'
                     f'\r\n\r\n{value}\r\n'.encode())
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; '
                 f'filename="hero-banner.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'.encode()
                 + payload + b'\r\n')
    parts.append(f'--{boundary}--\r\n'.encode())
    body = b''.join(parts)

    req = urllib.request.Request(f'{BASE}/admin/media', data=body, method='POST',
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type':
                                              f'multipart/form-data; boundary={boundary}'})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=300))
    except urllib.error.HTTPError as e:
        r = json.load(e)
    if not r.get('success'):
        sys.exit(f"  hero banner  ✗ {r.get('message')} {r.get('errors')}")

    # 上傳的是全解析度來源，管線縮到 preset 寬度之後才是實際載入的那張 ——
    # 這裡的 oversized 警告講的是來源，不是產出，照做法本來就會出現
    print(f"  hero banner        ✓ {r['data']['url']}  "
          f"{r['data']['width']}×{r['data']['height']}")
    return r['data']['id']


if (found := existing_banner()) is not None:
    print(f"  hero banner        · 沿用 {found['fileName']}  {found['width']}×{found['height']}")
    media_id = found['id']
else:
    media_id = upload_banner()

sections = {s['sectionKey']: s for s in call('GET', '/admin/pages/home')['data']['sections']}
hero = sections['heroSlider']['translations']

PAYLOADS = {}
for locale, existing in hero.items():
    slides = existing.get('slides') or [{}]
    slides[0]['image'] = media_id
    PAYLOADS[('heroSlider', locale)] = {**existing, 'slides': slides}


# ── 2. 04 Trusted worldwide ─────────────────────────────────────────
# 英文逐字取自 mockup4/Home.dc.html（含短引言外層的彎引號）。
# 中文為譯稿；`ODM` 是品牌／產業符號，依 CLAUDE.md §5.1 維持英文。
# `video.poster` 不填 —— mockup4 那一格是佔位斜紋，沒有真的影片 poster。
PAYLOADS[('testimonial', 'en')] = {
    'title': 'Trusted worldwide',
    'quote': 'Consistent quality, every order.',
    'attribution': {'name': 'Distribution partner', 'region': 'Southeast Asia'},
    'miniQuotes': [
        {'quote': '“Their ODM team understood our patients.”', 'source': 'Homecare · Europe'},
        {'quote': '“Fit and comfort our customers notice.”', 'source': 'Pharmacy · Japan'},
    ],
    'floatingChip': 'Global reach. Local commitment.',
}
PAYLOADS[('testimonial', 'zh-TW')] = {
    'title': '值得全球信賴',
    'quote': '每批訂單，品質如一。',
    'attribution': {'name': '經銷夥伴', 'region': '東南亞'},
    'miniQuotes': [
        {'quote': '「他們的 ODM 團隊，懂我們的病人。」', 'source': '居家照護 · 歐洲'},
        {'quote': '「合身與舒適，客人一穿就知道。」', 'source': '藥局 · 日本'},
    ],
    'floatingChip': '全球佈局，在地承諾。',
}

for (key, locale), data in PAYLOADS.items():
    r = call('PUT', f'/admin/pages/home/sections/{key}', {'locale': locale, 'data': data})
    ok = r.get('success')
    print(f"  {key:18} {locale:6} {'✓' if ok else '✗'} {r.get('message', '')}"
          + ('' if ok else f" {r.get('errors')}"))
