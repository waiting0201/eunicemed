"""首頁區段的 zh-TW。譯自已上線的英文版，品牌標語保留英文（品牌符號例外）。

⚠️ 2026-08-28 後台範圍收斂（docs/15）之後只剩 3 個區段有 schema：
heroSlider、featuredProducts（只有 promo）、bodyPartBand（只有背景圖）。
版面文案已搬進前端常數，這支腳本跟著收斂，否則重跑會 400。
"""
import json, sys, urllib.request

API = 'https://func-eunicemed-prod.azurewebsites.net/api'
TOKEN = open(sys.argv[1]).read().strip()

def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{API}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=90))
    except urllib.error.HTTPError as e:
        return json.load(e)

media = {s['sectionKey']: s for s in call('GET', '/admin/pages/home')['data']['sections']}
hero_img = (media['heroSlider']['translations'].get('en') or {}).get('slides', [{}])[0].get('image')
band_bg = (media['bodyPartBand']['translations'].get('en') or {}).get('background')

SECTIONS = {
    'heroSlider': {
        'slides': [{'image': hero_img, 'alt': 'EuniceMed — 支撐，是很個人的事',
                    'link': {'label': '', 'url': '/zh-TW/products'}}],
        'intervalSeconds': 6,
    },
    'featuredProducts': {
        'promo': {'eyebrow': '完整型錄', 'title': '為每一種動作而生的支撐',
                  'link': {'label': '→', 'url': '/zh-TW/products'}},
    },
    # 收斂後只剩背景圖，且它是 x-localeInvariant —— 沿用英文版那一張
    'bodyPartBand': {'background': band_bg},
}

for key, data in SECTIONS.items():
    r = call('PUT', f'/admin/pages/home/sections/{key}', {'locale': 'zh-TW', 'data': data})
    print(f"  {key:18} {'✓' if r.get('success') else '✗'} {r.get('message','')}"
          + ('' if r.get('success') else f" {r.get('errors')}"))
