"""
把 mockup4 的 Partnership 頁內容與圖片上傳（en + zh-TW）。

用法：
    EM_API=http://localhost:7071/api python3 tools/migration/partnership-content.py <token 檔>

**只處理留在 CMS 的欄位。** 頁首 eyebrow／標題／導言與版型綁死，寫在
`apps/web/app/[locale]/partnership/page.tsx` 的 `COPY`（docs/15-cms-scope.md），
這裡不送 —— 送了會撞上 additionalProperties:false 而 400。
表單的欄位標籤、送出鈕（`Submit inquiry`）同理，在 `PartnershipForm` 裡。

英文逐字取自 `mockup4/Partnership.dc.html`；中文為新譯，品牌符號與商用縮寫
（EuniceMed、OEM / ODM、MOQ）維持英文（CLAUDE.md §5.1）。

圖片先由 `tools/crop-to-preset.py` 裁好再上傳 —— 管線本身不裁切（docs/11 §1、§4）。
§01／§02 那兩張的**版位是 21:9**（`page.tsx` 的 `S.shot`），但 schema 掛的 preset
是 `section-bg`（2.84:1）與 `wide-16x9`（1.78:1），所以裁切跟著版位走、
preset 只決定存檔寬度：見 SLOTS 的第 3 欄。
"""
import json, os, re, subprocess, sys, urllib.request

# 預設打正式站；本機用 EM_API=http://localhost:7071/api 覆寫
API = os.environ.get('EM_API', 'https://func-eunicemed-prod.azurewebsites.net/api')
TOKEN = open(sys.argv[1]).read().strip()
SRC = 'mockup4/images'
OUT = 'mockup4/exports/partnership'   # 裁好的交付版本（隨時可重生，見該目錄 README）


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{API}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=180))
    except urllib.error.HTTPError as e:
        return json.load(e)


def find_or_upload(path, preset, alt):
    """已經傳過就重用 —— 這支腳本要能重跑，不該每跑一次多一張同樣的圖。

    比對的是**伺服器存下的檔名**：上傳時檔名會被 slug 化再接一段內容雜湊，
    `01-hero-band__page-band.jpg` → `01-hero-band-page-band-829698ae.jpg`。
    拿本機檔名直接比會永遠比不中，於是每跑一次就多一列同圖的 Media
    （而它們共用同一個 blob，刪任一列會弄壞另一列 —— CLAUDE.md §7）。
    """
    filename = os.path.basename(path)
    stem = re.sub(r'[^a-z0-9]+', '-', os.path.splitext(filename)[0].lower()).strip('-')
    hit = call('GET', f'/admin/media?presetKey={preset}&search={stem}')
    data = hit.get('data')
    rows = data.get('items', []) if isinstance(data, dict) else (data or [])
    for m in rows:
        if isinstance(m, dict) and m.get('fileName', '').startswith(stem):
            print(f'  = {filename} 已存在，重用 {m["id"]}')
            return m['id']

    # multipart 用 curl —— Python 手刻 boundary 只會多一個出錯的地方
    out = subprocess.run(
        ['curl', '-s', '-m', '300', '-X', 'POST', f'{API}/admin/media',
         '-H', f'Authorization: Bearer {TOKEN}',
         '-F', f'presetKey={preset}', '-F', f'altText={alt}',
         '-F', f'file=@{path}'],
        capture_output=True, text=True).stdout
    try:
        r = json.loads(out)
    except json.JSONDecodeError:
        print(f'  ✗ {filename}: {out[:160]}')
        return None

    if not r.get('success'):
        print(f'  ✗ {filename}: {r.get("message")} {r.get("errors")}')
        return None

    for w in (r.get('data') or {}).get('warnings') or []:
        print(f'    ⚠ {w}')
    print(f'  ✓ {filename} → {r["data"]["id"]}')
    return r['data']['id']


# 來源、preset、裁切比例、錨點、輸出檔名、alt。
#
# 錨點必須與前台的 object-position 逐字一致，否則構圖與設計稿不同：
#   page-band    → PageBand.tsx                 object-position: center
#   §01 21:9     → partnership/page.tsx focus25  object-position: center 25%
#   §02 21:9     → partnership/page.tsx focus30  object-position: center 30%
#
# 第 3 欄是**版位比例**，None 表示就用 preset 的比例。§01／§02 給 21:9 的理由：
# 照 section-bg（2.84:1）裁 §01，上下會切得比版位更多，瀏覽器接著再 cover 一次
# 改切左右並放大 —— 跑者被裁掉，構圖跑掉。§02 照 wide-16x9 裁結果是對的
# （同錨點連續兩次縱向裁切等於直接裁一次），但會多存 24% 用不到的畫素。
SLOTS = [
    ('pattern-08-src.jpg', 'page-band',   None,   'center',     '01-hero-band', ''),
    ('band-runner.jpg',    'section-bg',  '21:9', 'center 25%', '02-distributor-wide',
     'Athlete in motion with EuniceMed support'),
    ('hero-model.jpg',     'wide-16x9',   '21:9', 'center 30%', '03-oem-odm-wide',
     'EuniceMed back support'),
]


def prepare(source, preset, ratio, position, stem):
    """裁成版位比例，輸出到 OUT。"""
    os.makedirs(OUT, exist_ok=True)
    dst = os.path.join(OUT, f'{stem}__{preset}.jpg')
    subprocess.run(
        [sys.executable, 'tools/crop-to-preset.py',
         os.path.join(SRC, source), dst, preset, position] + ([ratio] if ratio else []),
        check=True)
    return dst


print('── 裁切並上傳圖片')
ids = {}
for source, preset, ratio, position, stem, alt in SLOTS:
    ids[preset] = find_or_upload(prepare(source, preset, ratio, position, stem), preset, alt)

band, distributor_img, oem_img = ids['page-band'], ids['section-bg'], ids['wide-16x9']

DISTRIBUTOR_EN = (
    '<p>We support our distribution partners with marketing assets, product education '
    'and clear communication on MOQ and lead times.</p>'
    '<p>Whether you serve pharmacies, clinics or homecare channels, our team helps you '
    'carry EuniceMed with confidence.</p>'
)

DISTRIBUTOR_ZH = (
    '<p>我們以行銷素材、產品教育，以及 MOQ 與交期上的清楚溝通，支援每一位經銷夥伴。</p>'
    '<p>無論您經營的是藥局、診所或居家照護通路，我們的團隊都能讓您安心地銷售 EuniceMed。</p>'
)

OEM_EN = (
    '<p>Bring your concept to a market-ready medical support. Our in-house team handles '
    'design, sampling, certification support and scaled production.</p>'
)

OEM_ZH = (
    '<p>把您的構想做成可上市的醫療支撐產品。從設計、打樣、認證支援到量產，'
    '都由我們的自有團隊一手承接。</p>'
)

# `label` 是純文字欄位（React 直接輸出），所以是 `&`，不是 mockup4 原始碼裡的 `&amp;`
CHIPS = [
    ('Design & sampling',       '設計與打樣'),
    ('Certification support',   '認證支援'),
    ('Material sourcing',       '材料採購'),
    ('Scaled production',       '量產製造'),
]

STEPS = [
    ('Talk',   'Share your market and requirements.',  '洽談', '告訴我們您的市場與需求。'),
    ('Sample', 'Evaluate products or prototypes.',     '打樣', '評估產品或原型。'),
    ('Agree',  'Confirm terms, MOQ and timeline.',     '議定', '確認條件、MOQ 與時程。'),
    ('Ship',   'Production, QC and delivery.',         '出貨', '生產、品管與交付。'),
]

# 下拉選單的三個選項（mockup4 的 <select>）。key 是 schema 的 enum，不翻譯
TYPES = [('oem', 'OEM', 'OEM'), ('odm', 'ODM', 'ODM'), ('distributor', 'Distributor', '經銷商')]


def sections(locale):
    en = locale == 'en'
    return {
        'hero': {'band': band} if band else None,
        'distributor': {
            'title': 'Distributor services' if en else '經銷服務',
            'body': DISTRIBUTOR_EN if en else DISTRIBUTOR_ZH,
            **({'image': distributor_img} if distributor_img else {}),
        },
        'oemOdm': {
            'title': 'OEM / ODM services' if en else 'OEM / ODM 服務',
            'body': OEM_EN if en else OEM_ZH,
            'chips': [{'label': (ce if en else cz)} for ce, cz in CHIPS],
            **({'image': oem_img} if oem_img else {}),
        },
        'becomePartner': {
            'title': 'How to become a partner' if en else '如何成為合作夥伴',
            'steps': [{'title': (te if en else tz), 'body': (be if en else bz)}
                      for te, be, tz, bz in STEPS],
            'formTitle': 'Partner inquiry' if en else '夥伴洽詢',
            'formIntro': ("Tell us about your business and we'll be in touch within "
                          'two working days.' if en else
                          '告訴我們您的業務概況，我們會在兩個工作天內與您聯繫。'),
            'partnershipTypes': [{'key': k, 'label': (le if en else lz)}
                                 for k, le, lz in TYPES],
        },
    }


for locale in ('en', 'zh-TW'):
    print(f'\n── 寫入區段（{locale}）')
    for key, data in sections(locale).items():
        if data is None:
            print(f'  – {key:14} 略過（缺圖）')
            continue
        r = call('PUT', f'/admin/pages/partnership/sections/{key}',
                 {'locale': locale, 'data': data, 'syncInvariantFields': True})
        ok = r.get('success')
        print(f'  {"✓" if ok else "✗"} {key:14} {r.get("message", "")}'
              + ('' if ok else f' {r.get("errors")}'))
