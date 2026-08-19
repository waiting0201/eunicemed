"""
把舊站 /downloadpage01 的三份 PDF 搬進正式站。

PDF 不走 `POST /admin/media`（那支只收圖片），而是 SAS 直傳 Blob 再登記成 Media，
最後才建立下載項目 —— 三步缺一不可，見 docs/07 §6 與 docs/13 的踩坑。

⚠️ 舊站的 `/s/xxx.pdf` 會 302 到 static1.squarespace.com，
而且**沒帶 Referer 會拿到 0 byte** —— 抓檔時要帶 `-e https://www.eunicemed.com/downloadpage01`。
"""
import json, os, subprocess, sys, urllib.request

API = 'https://func-eunicemed-prod.azurewebsites.net/api'
DIR = sys.argv[1]

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
        return json.load(urllib.request.urlopen(req, timeout=300))
    except urllib.error.HTTPError as e:
        if e.code == 401:
            globals()['TOKEN'] = login()
            return call(method, path, body)
        return json.load(e)

# type: 1 型錄 / 2 使用說明 / 3 認證文件（DownloadType）
FILES = [
    ('product-catalogue-2025.pdf', 1, 'Full product catalogue 2025',
     'Explore the complete EuniceMed range — compression stockings, orthopedic supports and silicone footcare.',
     '2025 完整產品型錄', '完整瀏覽 EuniceMed 的醫療彈性襪、矯型護具與矽膠足部照護產品線。'),
    ('company-profile.pdf', 1, 'Company profile',
     'Who we are, how we manufacture, and the standards behind every product.',
     '公司簡介', '關於我們、製造方式，以及每一件產品背後的標準。'),
    ('popular-selections.pdf', 1, 'Most popular product selections',
     'A short list of our best-selling supports for a quick and easy choice.',
     '熱門產品精選', '暢銷護具精選清單，快速找到適合的選擇。'),
]

for i, (fname, dtype, en_title, en_desc, zh_title, zh_desc) in enumerate(FILES):
    path = os.path.join(DIR, fname)

    sas = call('POST', '/admin/uploads/sas',
               {'fileName': fname, 'contentType': 'application/pdf'})
    if not sas.get('success'):
        print(f'  ✗ {fname} 取 SAS 失敗: {sas.get("message")}')
        continue

    up = subprocess.run(['curl', '-s', '-m', '600', '-X', 'PUT', sas['data']['uploadUrl'],
                         '-H', 'x-ms-blob-type: BlockBlob',
                         '-H', 'Content-Type: application/pdf',
                         '--data-binary', f'@{path}',
                         '-o', '/dev/null', '-w', '%{http_code}'],
                        capture_output=True, text=True).stdout.strip()
    if up not in ('201', '200'):
        print(f'  ✗ {fname} 直傳失敗 HTTP {up}')
        continue

    reg = call('POST', '/admin/uploads/register',
               {'blobUrl': sas['data']['blobUrl'], 'displayName': en_title})
    if not reg.get('success'):
        print(f'  ✗ {fname} 登記失敗: {reg.get("message")}')
        continue

    dl = call('POST', '/admin/downloads', {
        'mediaId': reg['data']['id'],
        'type': dtype,
        'fileLocale': 'en',          # 檔案本身的語言，與介面語系無關
        'status': 1,
        'sortOrder': i,
        'productIds': [],
        'translations': {
            'en': {'title': en_title, 'description': en_desc},
            'zh-TW': {'title': zh_title, 'description': zh_desc},
        },
    })
    size = os.path.getsize(path) // 1024 // 1024
    print(f"  {'✓' if dl.get('success') else '✗'} {en_title} ({size} MB)"
          + ('' if dl.get('success') else f" {dl.get('message')} {dl.get('errors')}"))
