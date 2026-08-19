"""
把 8 篇 Insights 的英文原文複製到 zh-TW，讓中文站也看得到這些衛教文章。

⚠️ **這是語言純度規格的刻意例外**（docs/08 §5.2：未翻譯內容應隱藏而非露出他語）。
系統本身沒有「回退到另一語言」的機制 —— 公開查詢是 translation 的 INNER JOIN，
所以要讓中文站顯示，唯一的方式就是**在 zh-TW 放一份內容**，這裡放的是英文原文。

決定的理由：這 8 篇是每篇 2,000–3,700 字的衛教長文，客戶可能想重寫而不是翻譯；
在那之前，中文站看得到英文版比完全看不到有用。
拿到中文稿之後，直接以同一支端點覆蓋 zh-TW 即可，不需要改任何程式。
"""
import json, os, urllib.request

API = 'https://func-eunicemed-prod.azurewebsites.net/api'

def login():
    b = json.dumps({'email': os.environ['ADMIN_EMAIL'],
                    'password': os.environ['ADMIN_PASSWORD']}).encode()
    r = urllib.request.Request(f'{API}/auth/login', data=b, method='POST',
                               headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r, timeout=60))['data']['accessToken']

TOKEN = login()

def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{API}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=180))
    except urllib.error.HTTPError as e:
        if e.code == 401:
            globals()['TOKEN'] = login()
            return call(method, path, body)
        return json.load(e)

arts = call('GET', '/admin/articles?type=insight&pageSize=50')['data']['items']
done = 0
for a in arts:
    d = call('GET', f"/admin/articles/{a['id']}")['data']
    en = d['translations'].get('en')
    if not en or 'zh-TW' in d['translations']:
        continue
    r = call('PUT', f"/admin/articles/{a['id']}", {
        'translations': {'zh-TW': dict(en)},
        'rowVersion': d['rowVersion'],
    })
    print(f"  {'✓' if r.get('success') else '✗'} {en['title'][:52]}"
          + ('' if r.get('success') else f" {r.get('message')}"))
    done += bool(r.get('success'))

print(f'\n完成 {done} 篇（中文站顯示英文原文）')
