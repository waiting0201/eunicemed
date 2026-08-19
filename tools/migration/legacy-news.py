"""
把舊站 /news-2 的 10 篇消息搬進正式站。

分類判斷用標題關鍵字：展會（exhibition/fair/booth）→ exhibitions，
其餘（賽事贊助、選手成績）→ sponsorship。舊站沒有分類，這是遷移時的推斷，
**不確定的一律落在 sponsorship**，之後由編輯者在後台調整比猜錯好。

內文沿用舊站的 HTML，伺服器端會以 Article profile 白名單淨化
（h2/h3/p/ul/ol/li/blockquote/figure/img/a/strong/em），其餘標籤會被剝掉。
"""
import json, re, sys, urllib.request
from datetime import datetime, timezone

BASE = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:7072/api'
TOKEN = open(sys.argv[1]).read().strip()

def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{BASE}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=90))
    except urllib.error.HTTPError as e:
        return json.load(e)

cats = {(c['kind'], c['slug']): c['id'] for c in call('GET', '/admin/article-categories')['data']}
EXHIBITION = re.compile(r'exhibit|fair|booth|rehacare|health\s*&?\s*rehab', re.I)

articles = json.load(open('/tmp/legacy-news.json'))
created = skipped = 0

for a in articles:
    title = a['title'].replace('&amp;', '&').strip()
    if not title:
        continue

    kind_slug = 'exhibitions' if EXHIBITION.search(title) else 'sponsorship'
    published = None
    if a.get('published'):
        # Squarespace 給的是毫秒 epoch
        published = datetime.fromtimestamp(a['published'] / 1000, timezone.utc)\
                            .strftime('%Y-%m-%dT%H:%M:%S')

    body = call('POST', '/admin/articles', {
        'slug': a['slug'][:180],
        'type': 1,                                   # news
        'categoryId': cats[(1, kind_slug)],
        'isFeatured': False,
        'tagIds': [],
        'publishedAt': published,
        'translations': {'en': {
            'title': title[:200],
            'excerpt': (a.get('excerpt') or '').strip()[:280] or None,
            'body': a.get('body') or None,
        }},
    })

    if not body.get('success'):
        print(f"  ✗ {title[:50]}: {body.get('message')} {body.get('errors')}")
        skipped += 1
        continue

    pub = call('POST', f"/admin/articles/{body['data']['id']}/publish")
    print(f"  ✓ {kind_slug:12} {title[:56]}" + ('' if pub.get('success') else f" （發布失敗：{pub.get('message')}）"))
    created += 1

print(f'\n新增 {created}、失敗 {skipped}')
