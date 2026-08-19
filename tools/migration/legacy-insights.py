"""
把舊站 /healthy-life 的 8 篇衛教文章搬進正式站（Insights，type=2）。

舊站有幾篇的 slug 是 Squarespace 自動產生的亂碼（`project-one-gn46z`、
`d7o75j7twqvmznrxnpcc84qesnsyje`）—— 改成從標題產生的可讀 slug，
並在 `Redirect` 表補上舊網址的轉址，否則既有連結會 404。

分類一律 `medical`（kind=2）：八篇都是靜脈健康與護具選擇的衛教內容。
內文沿用舊站 HTML，伺服器會以 Article profile 白名單淨化。
"""
import json, os, sys, urllib.request
from datetime import datetime, timezone

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

# 舊 slug → 新 slug（可讀、取自標題）
SLUGS = {
 'd7o75j7twqvmznrxnpcc84qesnsyje': 'medical-compression-stockings-vs-regular-stockings',
 'how-medical-compression-stockings-can-keep-your-veins-healthy':
     'how-medical-compression-stockings-keep-veins-healthy',
 'how-unhealthy-veins-might-affect-the-body-and-daily-routine':
     'how-unhealthy-veins-affect-the-body',
 'project-four-hanb9': 'compression-stockings-for-swelling-and-leg-pain',
 'project-one-gn46z': 'how-to-choose-the-right-orthopaedic-support',
 'project-three-4h23m': 'compression-stockings-to-prevent-blood-clots',
 'project-two-xdjcw': 'living-with-chronic-pain-orthopedic-supports',
 'the-benefits-of-wearing-orthopedic-supports-for-sports-injuries':
     'orthopedic-supports-for-sports-injuries',
}

cats = {(c['kind'], c['slug']): c['id']
        for c in call('GET', '/admin/article-categories')['data']}

created = 0
for a in json.load(open('/tmp/legacy-insights.json')):
    new_slug = SLUGS[a['slug']]
    published = (datetime.fromtimestamp(a['published'] / 1000, timezone.utc)
                 .strftime('%Y-%m-%dT%H:%M:%S')) if a.get('published') else None

    r = call('POST', '/admin/articles', {
        'slug': new_slug,
        'type': 2,                                # insight
        'categoryId': cats[(2, 'medical')],
        'readMinutes': max(2, round(len(a['text'].split()) / 200)),
        'publishedAt': published,
        'translations': {'en': {
            'title': a['title'].replace('&amp;', '&').strip()[:200],
            'excerpt': a['text'][:270],
            'body': a['body'],
        }},
    })
    if not r.get('success'):
        print(f"  ✗ {a['title'][:50]}: {r.get('message')} {r.get('errors')}")
        continue

    call('POST', f"/admin/articles/{r['data']['id']}/publish")

    # 舊網址轉址 —— 不補的話既有連結與搜尋結果會 404
    red = call('POST', '/admin/redirects', {
        'fromPath': f"/healthy-life/{a['slug']}",
        'toPath': f'/insights/{new_slug}',
        'statusCode': 301,
    })
    print(f"  ✓ {a['title'][:52]}"
          + ('' if red.get('success') else f" （轉址：{red.get('message')}）"))
    created += 1

print(f'\n新增 {created} 篇')
