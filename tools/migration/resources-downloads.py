"""
把 Resources 頁「Most requested documents」那一區的資料灌進去（en + zh-TW）。

用法：
    EM_API=http://localhost:7071/api python3 tools/migration/resources-downloads.py <token 檔> [PDF 目錄]

區段本身（`resources.quickDownloads`）只有 `ref:Download`，整段 `x-localeInvariant` ——
**會翻譯的是被引用的那三筆 `Download`**（標題與說明），不是這一段。所以腳本做兩件事：

1. 確認 mockup4 那三份文件在庫裡、而且 en 與 zh-TW 兩種語系的譯文都在；
   缺語系就補上（`PATCH /admin/downloads/{id}` 只送缺的那一邊，不覆蓋既有譯文）。
2. 依 mockup4 的順序寫入 `resources.quickDownloads`，**兩個語系各寫一次** ——
   區段是逐語系存的，只寫 en 的話 zh-TW 頁面那一區整段不會出現。

英文文案沿用 `legacy-downloads.py`（取自舊站 `/downloadpage01`），
中文為新譯；mockup4 的三個標題是版型示意（`Product Catalogue 2025` 等），
不採用 —— 標題是 CMS 資料，Downloads 頁與這裡必須是同一份。

**業務鍵是英文標題。** `Download` 沒有 slug，ref 存的是 uuid，
而 uuid 每台機器都不一樣，所以腳本先查再對，不寫死 id。

三筆都不在庫裡時（全新的本機資料庫），給第二個參數指向放 PDF 的目錄，
腳本會照 `legacy-downloads.py` 的三步（SAS → 直傳 → 登記）補建。PDF 抓法：

    curl -L -e https://www.eunicemed.com/downloadpage01 \
      -o /tmp/pdf/product-catalogue-2025.pdf https://www.eunicemed.com/s/2025catalouge_web-2bk4.pdf
    # 另兩份見 docs/10-legacy-content.md §8；沒帶 Referer 會拿到 0 byte
"""
import json, os, subprocess, sys, urllib.request

API = os.environ.get('EM_API', 'https://func-eunicemed-prod.azurewebsites.net/api')
TOKEN = open(sys.argv[1]).read().strip()
PDF_DIR = sys.argv[2] if len(sys.argv) > 2 else None


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{API}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=300))
    except urllib.error.HTTPError as e:
        return json.load(e)


# 檔名、英文標題（業務鍵）、英文說明、中文標題、中文說明。
# 順序就是 mockup4 那一區的三格順序（型錄 → 公司簡介 → 熱門精選）。
DOCS = [
    ('product-catalogue-2025.pdf',
     'Full product catalogue 2025',
     'Explore the complete EuniceMed range — compression stockings, orthopedic supports '
     'and silicone footcare.',
     '2025 完整產品型錄',
     '完整瀏覽 EuniceMed 的醫療彈性襪、矯型護具與矽膠足部照護產品線。'),
    ('company-profile.pdf',
     'Company profile',
     'Who we are, how we manufacture, and the standards behind every product.',
     '公司簡介',
     '關於我們、製造方式，以及每一件產品背後的標準。'),
    ('popular-selections.pdf',
     'Most popular product selections',
     'A short list of our best-selling supports for a quick and easy choice.',
     '熱門產品精選',
     '暢銷護具精選清單，快速找到適合的選擇。'),
]


def create(fname, en_title, en_desc, zh_title, zh_desc, sort_order):
    """庫裡沒有時才走這條 —— PDF 不收在 `POST /admin/media`（那支只收圖片），
    要 SAS 直傳 Blob 再登記成 Media，見 docs/07 §6。"""
    if not PDF_DIR:
        print(f'  ✗ {en_title}：庫裡沒有，且未給 PDF 目錄 —— 略過')
        return None

    path = os.path.join(PDF_DIR, fname)
    if not os.path.exists(path):
        print(f'  ✗ {en_title}：找不到 {path}')
        return None

    sas = call('POST', '/admin/uploads/sas',
               {'fileName': fname, 'contentType': 'application/pdf'})
    if not sas.get('success'):
        print(f'  ✗ {fname} 取 SAS 失敗：{sas.get("message")}')
        return None

    up = subprocess.run(['curl', '-s', '-m', '600', '-X', 'PUT', sas['data']['uploadUrl'],
                         '-H', 'x-ms-blob-type: BlockBlob',
                         '-H', 'Content-Type: application/pdf',
                         '--data-binary', f'@{path}',
                         '-o', '/dev/null', '-w', '%{http_code}'],
                        capture_output=True, text=True).stdout.strip()
    if up not in ('200', '201'):
        print(f'  ✗ {fname} 直傳失敗 HTTP {up}')
        return None

    reg = call('POST', '/admin/uploads/register',
               {'blobUrl': sas['data']['blobUrl'], 'displayName': en_title})
    if not reg.get('success'):
        print(f'  ✗ {fname} 登記失敗：{reg.get("message")}')
        return None

    dl = call('POST', '/admin/downloads', {
        'mediaId': reg['data']['id'],
        'type': 1,                   # DownloadType.Catalog
        'fileLocale': 'en',          # 檔案本身的語言，與介面語系無關
        'status': 1,
        'sortOrder': sort_order,
        'productIds': [],
        'translations': {
            'en':    {'title': en_title, 'description': en_desc},
            'zh-TW': {'title': zh_title, 'description': zh_desc},
        },
    })
    if not dl.get('success'):
        print(f'  ✗ {en_title} 建立失敗：{dl.get("message")} {dl.get("errors")}')
        return None

    print(f'  ✓ {en_title} 已建立 {dl["data"]["id"]}')
    return dl['data']['id']


def translate(row, en_title, en_desc, zh_title, zh_desc):
    """補上缺的語系。PATCH 只送缺的那一邊 —— 既有譯文可能已被客戶改過，不覆蓋。"""
    have = row.get('translations') or {}
    missing = {}
    if not (have.get('en') or {}).get('title'):
        missing['en'] = {'title': en_title, 'description': en_desc}
    if not (have.get('zh-TW') or {}).get('title'):
        missing['zh-TW'] = {'title': zh_title, 'description': zh_desc}

    if not missing:
        print(f'  = {en_title}：en / zh-TW 皆已有譯文')
        return

    r = call('PATCH', f'/admin/downloads/{row["id"]}', {'translations': missing})
    ok = r.get('success')
    print(f'  {"✓" if ok else "✗"} {en_title}：補上 {"、".join(missing)}'
          + ('' if ok else f' {r.get("message")} {r.get("errors")}'))


print('── 對齊三份文件')
existing = call('GET', '/admin/downloads').get('data') or []
by_title = {(d.get('translations') or {}).get('en', {}).get('title'): d for d in existing}

ids = []
for i, (fname, en_title, en_desc, zh_title, zh_desc) in enumerate(DOCS):
    row = by_title.get(en_title)
    if row:
        translate(row, en_title, en_desc, zh_title, zh_desc)
        ids.append(row['id'])
    else:
        new_id = create(fname, en_title, en_desc, zh_title, zh_desc, i)
        if new_id:
            ids.append(new_id)

if not ids:
    sys.exit('沒有可引用的下載項目，區段不寫。')

data = {'items': [{'download': i} for i in ids]}

# 區段逐語系儲存，所以兩個語系各寫一次；`syncInvariantFields` 只會同步到
# **已存在**的語系列，靠它補不出另一語系（docs/09 §9.3）
for locale in ('en', 'zh-TW'):
    r = call('PUT', '/admin/pages/resources/sections/quickDownloads',
             {'locale': locale, 'data': data, 'syncInvariantFields': True})
    ok = r.get('success')
    print(f'  {"✓" if ok else "✗"} quickDownloads（{locale}）{r.get("message", "")}'
          + ('' if ok else f' {r.get("errors")}'))
