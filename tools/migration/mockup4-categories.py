"""把 `mockup4/Products.dc.html` 的三張分類卡圖掛到分類上（預設**只灌本機**）。

總覽頁的分類卡讀的是 `Category.ImageMediaId`（preset `square`，docs/09 §4.1），
而 mockup4 那三格用的其實是**產品照** —— 設計稿裡沒有另外畫分類主視覺：

    Medical Compression Stockings ← stockings-for-venous-therapy-1--resile-urban.jpg
    Orthopedic Support            ← knee-support-1--aergo-knee-support.jpg
    Footcare & Insoles            ← silicone--silicone-insoles.jpg

所以這支**不上傳任何檔案**，而是去媒體庫找 `product-images.py` 已經傳過的
那三張，把既有的 Media Id 掛上去。原因是上傳端點不以檔名去重（CLAUDE.md
§7 未決事項）：同一個檔案再傳一次會多一列、共用同一個 blob，之後刪任一列
都會把另一列的圖砍成死連結。共用同一列就沒有這個問題。

副作用是 `altText` 會沿用產品名（「Resile™ Urban」），所以前台的分類卡
不採信媒體的 alt，一律用分類名稱 —— 與 mockup4 的 `alt` 寫法一致。

⚠️ 這是**版型上的代用圖**，不是客戶給的分類主視覺。客戶給了正式素材之後，
在後台「產品 → 分類 → 卡片圖」直接換掉即可，不必再跑這支。

用法：

    python3 tools/migration/mockup4-categories.py            # 自動登入本機 API
    python3 tools/migration/mockup4-categories.py /tmp/token [base-url]
"""
import json, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://localhost:7071/api'

# 分類 slug → 媒體檔名前綴（上傳時 `--` 會被正規化成 `-`，結尾另接內容雜湊）
CARDS = {
    'medical-compression-stockings': 'stockings-for-venous-therapy-1-resile-urban-',
    'orthopedic-support':            'knee-support-1-aergo-knee-support-',
    'footcare-insoles':              'silicone-silicone-insoles-',
}

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


def find_media(prefix):
    """媒體庫可能有同檔名的重複列（上傳端點不去重）—— 取最先出現的那一列。

    `silicone-silicone-insoles-` 也會命中 `-3-4-length` 與 `-with-toe-support`，
    所以比對的是「前綴 + 8 碼雜湊 + 副檔名」的完整長度，不是單純 startswith。
    """
    r = call('GET', f'/admin/media?presetKey=square&search={prefix}')
    for m in r.get('data') or []:
        name = m['fileName']
        if name.startswith(prefix) and len(name) == len(prefix) + len('xxxxxxxx.jpg'):
            return m
    return None


categories = {c['slug']: c for c in call('GET', '/admin/categories')['data']}

for slug, prefix in CARDS.items():
    cat = categories.get(slug)
    if cat is None:
        print(f'  {slug:30} ✗ 查無此分類')
        continue

    media = find_media(prefix)
    if media is None:
        print(f'  {slug:30} ✗ 媒體庫沒有 {prefix}*（先跑 product-images.py）')
        continue

    if cat['imageMediaId'] == media['id']:
        print(f"  {slug:30} · 已是 {media['fileName']}")
        continue

    r = call('PATCH', f"/admin/categories/{cat['id']}", {'imageMediaId': media['id']})
    ok = r.get('success')
    print(f"  {slug:30} {'✓' if ok else '✗'} {media['fileName']}"
          + ('' if ok else f" {r.get('message')} {r.get('errors')}"))
