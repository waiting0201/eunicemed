"""
把 mockup4/images/products 的產品照上傳到正式站，並掛成該產品的主圖。

檔名是 `{子分類前綴}--{產品 slug}.jpg`，而前綴在 mockup 裡有 `-1` 之類的變體
（`back-support-1` vs 資料庫的 `back-support`），所以**以 `--` 右半邊的 slug 當鍵**。

舊站把同一支產品拆成兩筆（`…-st` 與 `…-st-2`，多半是顏色或尺寸），
mockup 只有一張圖 —— 找不到時去掉結尾的 `-2` 再找一次，兩筆共用同一張。

圖片是 1000×1000，低於 square preset 的 1200 —— 上傳會回一則
「解析度不足」的警告，不影響存檔（docs/11 §4）。真正的產品照到位後可在後台換掉。
"""
import json, os, re, subprocess, sys, urllib.request

API = 'https://func-eunicemed-prod.azurewebsites.net/api'
TOKEN = open(sys.argv[1]).read().strip()
IMG_DIR = 'mockup4/images/products'

def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{API}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=180))
    except urllib.error.HTTPError as e:
        return json.load(e)

def upload(path, alt):
    """multipart 用 curl —— Python 手刻 boundary 只會多一個出錯的地方。"""
    out = subprocess.run(
        ['curl', '-s', '-m', '180', '-X', 'POST', f'{API}/admin/media',
         '-H', f'Authorization: Bearer {TOKEN}',
         '-F', 'presetKey=square', '-F', f'altText={alt}', '-F', f'file=@{path}'],
        capture_output=True, text=True).stdout
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return {'success': False, 'message': out[:120]}

by_slug = {}
for f in os.listdir(IMG_DIR):
    if '--' in f:
        by_slug.setdefault(f.split('--', 1)[1].rsplit('.', 1)[0], f)

items, page = [], 1
while True:
    d = call('GET', f'/admin/products?page={page}&pageSize=100')['data']
    items += d['items']
    if page >= d['totalPages']:
        break
    page += 1

done = shared = missing = failed = 0
for p in items:
    slug = p['slug']
    f = by_slug.get(slug)
    if not f:
        base = re.sub(r'-\d+$', '', slug)
        f = by_slug.get(base)
        if f:
            shared += 1
    if not f:
        missing += 1
        continue

    name = p.get('nameEn') or slug
    m = upload(os.path.join(IMG_DIR, f), name)
    if not m.get('success'):
        print(f"  ✗ 上傳 {slug}: {m.get('message')}", flush=True)
        failed += 1
        continue

    media_id = m['data']['id']
    full = call('GET', f"/admin/products/{p['id']}")['data']
    r = call('PUT', f"/admin/products/{p['id']}", {
        'images': [{'mediaId': media_id, 'isPrimary': True, 'sortOrder': 0}],
        'rowVersion': full['rowVersion'],
    })
    if r.get('success'):
        done += 1
        if done % 20 == 0:
            print(f'  … 已完成 {done}', flush=True)
    else:
        print(f"  ✗ 掛圖 {slug}: {r.get('message')} {r.get('errors')}", flush=True)
        failed += 1

print(f'\n完成 {done}（其中 {shared} 筆與另一款共用同一張）、缺圖 {missing}、失敗 {failed}')
