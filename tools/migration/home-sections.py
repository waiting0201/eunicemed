"""
把舊站 www.eunicemed.com 的首頁文案填進正式站。

原則：**只填舊站或 docs/10 真的存在的品牌文案**。
舊站沒有對應內容的區段（testimonial）就不填 —— 語言純度會讓它整段不顯示，
那比放一段我們編出來的客戶推薦好。

⚠️ 2026-08-28 後台範圍收斂（docs/15）之後，版型上的欄位已不在 schema 裡。
這支腳本必須跟著收斂，否則重跑會撞上 additionalProperties 全數 400。
"""
import json, sys, urllib.request

BASE = 'https://func-eunicemed-prod.azurewebsites.net/api'
TOKEN = open(sys.argv[1]).read().strip()

def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{BASE}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=60))
    except urllib.error.HTTPError as e:
        return json.load(e)

# ── 內容 ────────────────────────────────────────────────────────────
# 來源標註：[舊站] = www.eunicemed.com 首頁逐字；[PDF] = docs/10 §1 的 Company Profile
SECTIONS = {
    # 只剩檔期性的全型錄漸層帶 —— 區段標題、02/03/05 整段的文案都已搬進
    # apps/web/app/[locale]/page.tsx 的 COPY（決議見 docs/15-cms-scope.md）。
    # 背景圖不在這裡：它是媒體欄位，由後台上傳。
    'featuredProducts': {
        'promo': {
            'eyebrow': 'Full catalogue',
            'title': 'Supports for every motion',
            'link': {'label': '→', 'url': '/en/products'},
        },
    },
}

for key, data in SECTIONS.items():
    r = call('PUT', f'/admin/pages/home/sections/{key}',
             {'locale': 'en', 'data': data})
    ok = r.get('success')
    print(f"  {key:18} {'✓' if ok else '✗'} {r.get('message','')}"
          + ('' if ok else f" {r.get('errors')}"))
