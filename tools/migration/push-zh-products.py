"""
把 149 筆產品的 zh-TW 翻譯寫進正式站。

⚠️ **翻譯一寫進去，中文站馬上就看得到** —— 這個站沒有「單一語言的草稿」狀態，
`status` 是整筆產品的，翻譯沒有各自的發布狀態（語言純度規格的直接後果）。

品牌詞（Aergo / Euniiz™ / Resile™）與型號代碼（ST / IU / TL / GT / AUXI / AG / UE / AI / +）
一律保留英文 —— CLAUDE.md §5.1 把品牌符號列為語言純度的例外。
"""
import json, os, sys, urllib.request

API = sys.argv[2] if len(sys.argv) > 2 else 'https://func-eunicemed-prod.azurewebsites.net/api'

def login():
    """access token 只有 15 分鐘，而這支要跑 149 筆 —— 過期就自己換一張，
    不然會像第一次那樣默默停在第 25 筆。"""
    body = json.dumps({'email': os.environ['ADMIN_EMAIL'],
                       'password': os.environ['ADMIN_PASSWORD']}).encode()
    req = urllib.request.Request(f'{API}/auth/login', data=body, method='POST',
                                 headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=60))['data']['accessToken']

TOKEN = login()
NAMES = json.load(open('tools/migration/zh-names.json'))
FEATURES = json.load(open('tools/migration/zh-features.json'))

def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{API}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        if e.code == 401:
            globals()['TOKEN'] = login()
            return call(method, path, body)
        return json.load(e)

ids, page = [], 1
while True:
    d = call('GET', f'/admin/products?page={page}&pageSize=100')['data']
    ids += [i['id'] for i in d['items']]
    if page >= d['totalPages']:
        break
    page += 1

done = untranslated = failed = 0
for pid in ids:
    p = call('GET', f'/admin/products/{pid}')['data']
    if 'zh-TW' in p['translations']:      # 可重跑：已經有中文的跳過
        continue

    en = p['translations'].get('en')
    if not en:
        continue

    name = NAMES.get(en.get('name'))
    if not name:
        untranslated += 1
        continue

    zh = {'name': name}
    if en.get('features'):
        zh['features'] = [
            {**f, 'body': FEATURES.get(f.get('body'), f.get('body'))}
            for f in en['features']
        ]
    for key in ('summary', 'featuredBlurb'):
        if en.get(key):
            zh[key] = FEATURES.get(en[key], en[key])

    r = call('PUT', f'/admin/products/{pid}', {
        'translations': {'zh-TW': zh},
        'rowVersion': p['rowVersion'],
    })
    if r.get('success'):
        done += 1
        if done % 25 == 0:
            print(f'  … {done}', flush=True)
    else:
        failed += 1
        print(f"  ✗ {p['slug']}: {r.get('message')} {r.get('errors')}", flush=True)

print(f'\n完成 {done}、沒有對應譯名 {untranslated}、失敗 {failed}')
