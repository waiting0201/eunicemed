"""
客戶的產品資料表（EuniceMed_產品資料填寫 _1105 修改.xlsx）→ 產品主檔，en + zh-TW。

**預設只預覽，`--apply` 才寫入。**

    pip install openpyxl
    ADMIN_EMAIL=… ADMIN_PASSWORD=… python3 tools/migration/products-2026-11.py <xlsx> [--apply]
    # 本機：EM_API=http://localhost:7071/api（帳密用 local.settings.json 的 Seed__Admin*）

## 對照規則

- **一個品號 = 一個產品**（客戶 ④ 待確認事項的回覆：以品號為辨識依據，同名不改名）。
  比對順序：Sku → 同英文名且尚無 Sku 的舊站產品 → 新增。
- **彈性襪**：舊站把同一款襪子依子分類複製成 2–3 筆（resile-urban / -2 / -3），都沒有 Sku；
  資料表則是一款 2–3 個壓力的品號。兩邊筆數剛好一對一，依壓力接到舊站那一筆：
  18-21 → 日常（everyday）、23-32 → 水腫（edema）、34-46 → 靜脈（venous）。
  這樣舊網址全部保留，資料表列的其他子分類進 SecondarySubCategoryIds。
- 一般產品：舊子分類仍在資料表的清單內就維持為主子分類（網址不變），否則取清單第一個；
  網址改變時由 AdminProductHandler 自動寫轉址。
- **CPF-2604** 握力球(圓形) 接舊站唯一一筆 Gel Hand Therapy Ball（原本誤放在高跟鞋墊）。
- **CPO-7305** 視為舊站 CPO-7303（Aergo Elbow Support）改號 —— 資料表沒有 7303。
- 系列由「支撐強度」推：輕度／壓力一級 → care、中度／壓力二級 → protect、高度／壓力三級 → advance。
- 部位：本站只有 7 個 BodyPart，小腿／大腿／腿（整體）→ leg；肩、頸、手/拇指沒有對應，略過並列出。
- 資料表**沒有**的舊站產品 → 退回草稿（照片與資料保留）。
- 新產品建立後直接發布（資料表全數「上架」）—— 照片還沒到，卡片會先沒有圖。

不處理：適用情境（Tags）、特殊照護分組（Application 只有 3 筆對得上）、主圖檔名與 alt（照片未到）。
"""
import json, os, re, sys, urllib.error, urllib.request, warnings
from collections import OrderedDict, defaultdict

API = os.environ.get('EM_API', 'https://func-eunicemed-prod.azurewebsites.net/api')
APPLY = '--apply' in sys.argv
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]

# ═══════════════════════════════════════════════════════════════════════════
# API
# ═══════════════════════════════════════════════════════════════════════════

def login():
    body = json.dumps({'email': os.environ['ADMIN_EMAIL'],
                       'password': os.environ['ADMIN_PASSWORD']}).encode()
    req = urllib.request.Request(f'{API}/auth/login', data=body, method='POST',
                                 headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=60))['data']['accessToken']


TOKEN = None


def call(method, path, body=None, retry=True):
    global TOKEN
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{API}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        if e.code == 401 and retry:      # access token 只有 15 分鐘
            TOKEN = login()
            return call(method, path, body, retry=False)
        try:
            return json.load(e)
        except Exception:
            return {'success': False, 'message': f'HTTP {e.code}'}


def items(path):
    d = call('GET', path).get('data')
    return d.get('items', d) if isinstance(d, dict) else d


# ═══════════════════════════════════════════════════════════════════════════
# 資料表
# ═══════════════════════════════════════════════════════════════════════════

SHEET = '② 產品主檔'

# 欄位以表頭文字定位，不寫死欄號 —— 客戶每一版都可能插欄
COL = {
    'sku': '品號★主鍵', 'zh': '產品名稱(中)', 'en': '產品名稱(英)',
    'sub': '子分類(中) *',
    'strength_zh': '支撐強度(中)', 'strength_en': '支撐強度(英)',
    'pressure_zh': '壓力等級 mmHg(中)', 'pressure_en': '壓力等級 mmHg(英)',
    'type_zh': '結構型式(中)', 'type_en': '結構型式(英)',
    'mat_zh': '材質類別(中)', 'mat_en': '材質類別(英)',
    'gender_zh': '性別(中)', 'gender_en': '性別(英)',
    'pack_zh': '左右/入數(中)', 'pack_en': '左右/入數(英)',
    'parts': '適用部位(中) *〔；分隔〕',
    'feat_zh': '產品特色/賣點 (中)', 'feat_en': '產品特色/賣點 (英)',
    'comp_zh': '材質/成分 (中)', 'comp_en': '材質/成分 (英)',
    'use_zh': '使用/穿戴說明 (中)', 'use_en': '使用/穿戴說明 (英)',
    'certs': '適用認證',
    'size_zh': '尺寸標籤(中) *', 'size_en': '尺寸標籤(英)',
    'measure_zh': '量測部位(中) *', 'measure_en': '量測部位(英)',
    'min': '下限值 *', 'max': '上限值 *', 'unit': '單位 *',
    'cond_zh': '適用症狀 (中文)', 'cond_en': '適用症狀 (英文)',
    'note_zh': '商品備註(中)', 'note_en': '商品備註(英)',
    'status': '上架狀態(中)',
}


# 英文是從 PDF 複製過來的，連字 ﬁ／ﬀ 變成控制字元，Excel 存成 `_x001E_` 這種跳脫碼
# （例：`perfectly _x001E_t`、`took o_x001C_`）
LIGATURE = {'_x001E_': 'fi', '_x001C_': 'ff', '_x001F_': 'fl', '_x001D_': 'ffi'}


def clean(v):
    if not isinstance(v, str):
        return v
    for k, x in LIGATURE.items():
        v = v.replace(k, x)
    return v.strip()


def load(path):
    import openpyxl
    warnings.filterwarnings('ignore')       # Data Validation extension 不支援的警告
    ws = openpyxl.load_workbook(path, data_only=True)[SHEET]
    rows = list(ws.iter_rows(values_only=True))
    hdr = [str(h).strip() if h else '' for h in rows[1]]     # 第 1 列是修改說明，第 2 列才是表頭
    idx = {k: hdr.index(v) for k, v in COL.items()}
    out = OrderedDict()
    for r in rows[2:]:
        if not r[idx['sku']]:
            continue
        d = {k: clean(r[i]) for k, i in idx.items()}
        out.setdefault(d['sku'].upper(), []).append(d)
    return out


# ═══════════════════════════════════════════════════════════════════════════
# 欄位轉換
# ═══════════════════════════════════════════════════════════════════════════

SUB = {
    '靜脈曲張照護壓力襪': 'stockings-for-venous-therapy',
    '水腫照護壓力襪':     'stockings-for-edema-therapy',
    '日常舒適壓力襪':     'stockings-for-everyday',
    '抗血栓襪':           'stockings-for-antiembolism',
    '旅行襪':             'travel-stockings',
    '糖尿病足保健襪':     'diabetic-socks',
    '膝部護具': 'knee-support', '背部護具': 'back-support', '踝部護具': 'ankle-support',
    '腕部護具': 'wrist-support', '肘部護具': 'elbow-support', '肩部護具': 'shoulder-support',
    '頸部護具': 'neck-support',
    '矽膠': 'silicone', '凝膠': 'gel', '保濕': 'moisturizing', '高跟鞋墊': 'high-heel-sandals',
}

# 彈性襪壓力 → 舊站那一筆的子分類（見檔頭）
STOCKING_LEGACY_SUB = {
    '18-21': 'stockings-for-everyday',
    '23-32': 'stockings-for-edema-therapy',
    '34-46': 'stockings-for-venous-therapy',
}

COLLECTION = {'輕度': 'care', '壓力一級': 'care',
              '中度': 'protect', '壓力二級': 'protect',
              '高度': 'advance', '壓力三級': 'advance'}

BODY = {'膝': 'knee', '踝': 'ankle', '足': 'foot', '小腿': 'leg', '大腿': 'leg',
        '腿（整體）': 'leg', '腰背': 'back', '手腕': 'wrist', '手肘': 'elbow'}

CERT = {'CE': 'ce', 'ISO 13485': 'iso-13485', 'FDA': 'fda'}

# 資料表沒有 7303，同名的 7305 視為改號
SKU_RENAMED = {'CPO-7305': 'CPO-7303'}

# 英文名對不上、但確定是同一件的舊站產品（保留它的照片與網址）
LEGACY_SLUG = {'CPF-2604': 'gel-hand-therapy-ball'}   # 舊站只有一顆握力球，接圓形那一款

NA = {None, '', '不適用', 'N/A', '不分'}

SPEC_LABELS = {
    'pressure': ('壓力等級', 'Compression'),
    'strength': ('支撐強度', 'Support level'),
    'type':     ('結構型式', 'Type'),
    'mat':      ('材質類別', 'Material type'),
    'comp':     ('材質成分', 'Composition'),
    'gender':   ('適用性別', 'Gender'),
    'pack':     ('包裝', 'Pack'),
    'sizes':    ('尺寸', 'Sizes'),
    'note':     ('備註', 'Note'),
    'use':      ('使用說明', 'How to use'),
}

BULLET = re.compile(r'^[\s•･・·\-–*]+')


def split_list(s):
    return [x.strip() for x in re.split(r'[；;\n]', s or '') if x.strip()]


def bullets(text):
    """
    條列文字 → 一行一條；去掉 •／･ 與首尾空白。
    有條列符號的欄位裡，**沒有**符號開頭的行是上一條被換行截斷的後半句（英文從 PDF 複製過來，
    例：`… cushioning and shock` / `absorption on …`），接回上一條。
    """
    lines = [ln for ln in (text or '').splitlines() if ln.strip()]
    marked = any(BULLET.match(ln) and BULLET.sub('', ln) != ln.lstrip() for ln in lines)
    out = []
    for ln in lines:
        has_mark = bool(re.match(r'^\s*[•･・·]', ln))
        body = BULLET.sub('', ln).strip()
        if marked and not has_mark and out and not re.match(r'^(適用症狀|Recommended for)', body, re.I):
            out[-1] = f'{out[-1]} {body}'
        else:
            out.append(body)
    return out


def conditions(text):
    """`適用症狀：` / `Recommended for:` 開頭那行是標題，不是症狀。句尾句號拿掉（是 chip 不是句子）。"""
    lines = bullets(text)
    if lines and re.match(r'^(適用症狀|Recommended for)\s*[:：]?$', lines[0], re.I):
        lines = lines[1:]
    return [re.sub(r'[。.]$', '', x).strip() for x in lines] or None


def num(v):
    if v is None or v == '':
        return None
    f = float(v)
    return str(int(f)) if f == int(f) else f'{f:g}'


def size_value(r):
    lo, hi = num(r['min']), num(r['max'])
    if lo and hi:
        return lo if lo == hi else f'{lo}–{hi}'
    if hi:
        return f'≤ {hi}'
    if lo:
        return f'≥ {lo}'
    return ''


def size_chart(rows, loc):
    """
    `{measureLabel,sizes,rows:[{label?,values}],footnote?}`。
    一個品號只有一個量測部位時表頭寫在 measureLabel；有好幾個（少數護具）就逐列標名。
    完全沒有數字（One Size、握力球硬度）就不出表，尺寸改列在規格裡。
    """
    if not any(r['min'] is not None or r['max'] is not None for r in rows):
        return None
    sfx = 'zh' if loc == 'zh-TW' else 'en'
    sizes = list(OrderedDict.fromkeys(str(r[f'size_{sfx}'] or r['size_en'] or '') for r in rows))
    measures = list(OrderedDict.fromkeys((r[f'measure_{sfx}'] or '') for r in rows))
    unit = next((r['unit'] for r in rows if r['unit']), None)

    table = []
    for m in measures:
        vals = {str(r[f'size_{sfx}'] or r['size_en'] or ''): size_value(r)
                for r in rows if (r[f'measure_{sfx}'] or '') == m}
        table.append({'label': m if len(measures) > 1 else None,
                      'values': [vals.get(s, '') for s in sizes]})
    chart = {'measureLabel': measures[0] if len(measures) == 1 and measures[0] else None,
             'sizes': sizes, 'rows': table}
    if unit:
        chart['footnote'] = f'單位：{unit}' if loc == 'zh-TW' else f'All measurements in {unit}.'
    return chart


def specs(first, rows, has_chart, loc):
    sfx = 'zh' if loc == 'zh-TW' else 'en'
    i = 0 if loc == 'zh-TW' else 1
    out = []

    def add(key, value):
        if value not in NA:
            out.append({'label': SPEC_LABELS[key][i], 'value': value})

    add('pressure', first[f'pressure_{sfx}'])
    add('strength', first[f'strength_{sfx}'])
    add('type', first[f'type_{sfx}'])
    add('mat', first[f'mat_{sfx}'])
    add('comp', first[f'comp_{sfx}'])
    add('gender', first[f'gender_{sfx}'])
    add('pack', first[f'pack_{sfx}'])
    notes = list(OrderedDict.fromkeys(r[f'note_{sfx}'] for r in rows if r[f'note_{sfx}']))
    if not has_chart and not notes:
        labels = list(OrderedDict.fromkeys(str(r[f'size_{sfx}'] or '') for r in rows if r[f'size_{sfx}']))
        add('sizes', ' / '.join(labels) or None)
    if notes:
        # 握力球：每列都是「顏色／硬度：粉：軟」—— 共同的前綴拿來當標籤，不要重複五次
        # （它的尺寸標籤就是硬度，備註已經涵蓋，所以上面不另列尺寸）
        head = {re.split(r'[:：]', n, 1)[0] for n in notes}
        if len(head) == 1 and all(re.search(r'[:：]', n) for n in notes):
            label = head.pop().strip()
            notes = [re.split(r'[:：]', n, 1)[1].strip() for n in notes]
            out.append({'label': label, 'value': ('、' if loc == 'zh-TW' else ', ').join(notes)})
        else:
            add('note', '；'.join(notes) if loc == 'zh-TW' else '; '.join(notes))
    add('use', first[f'use_{sfx}'])
    return out or None


# ── 英文產品名 Title Case（與 copy-final-2026-10.py 同一套規則，2026-10 英文定稿已套過）──

SMALL = {'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'}


def title_case(name):
    name = re.sub(r'\s+', ' ', name).strip()
    first = True

    def fix(m):
        nonlocal first
        w = m.group(0)
        is_first, first = first, False
        if not re.fullmatch(r"[a-z][a-z'’]*", w) or (not is_first and w in SMALL):
            return w
        return w[:1].upper() + w[1:]

    return re.sub(r"[A-Za-z][A-Za-z'’]*", fix, name)


def slugify(s):
    s = s.lower().replace('™', '').replace('+', '-plus').replace("'", '')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


# ═══════════════════════════════════════════════════════════════════════════
# 主流程
# ═══════════════════════════════════════════════════════════════════════════

def build(sku, rows, tax):
    """一個品號 → 寫入 payload 的各欄（不含 id / rowVersion）。"""
    f = rows[0]
    subs = [SUB[x] for x in split_list(f['sub'])]
    parts = split_list(f['parts'])
    body = sorted({tax['body'][BODY[p]] for p in parts if p in BODY})
    dropped = [p for p in parts if p not in BODY]
    certs = sorted({tax['cert'][CERT[c.strip()]] for c in re.split(r'[、,，]', f['certs'] or '') if c.strip()})
    coll = COLLECTION.get(f['strength_zh'])

    tr = {}
    for loc in ('en', 'zh-TW'):
        sfx = 'zh' if loc == 'zh-TW' else 'en'
        chart = size_chart(rows, loc)
        tr[loc] = {
            'name': title_case(f['en']) if loc == 'en' else f['zh'],
            'features': [{'icon': None, 'title': None, 'body': b} for b in bullets(f[f'feat_{sfx}'])] or None,
            'conditions': conditions(f[f'cond_{sfx}']),
            'specs': specs(f, rows, chart is not None, loc),
            'sizeChart': chart,
        }
    return {'subs': subs, 'bodyPartIds': body, 'droppedParts': dropped,
            'certificationIds': certs, 'collection': coll, 'translations': tr,
            'pressure': (f['pressure_zh'] or '').replace(' mmHg', '')}


def main():
    global TOKEN
    if not ARGS:
        sys.exit(__doc__)
    TOKEN = login()
    data = load(ARGS[0])

    tax = {
        'sub':  {s['slug']: s for s in items('/admin/sub-categories')},
        'coll': {c['slug']: c['id'] for c in items('/admin/collections')},
        'body': {b['slug']: b['id'] for b in items('/admin/body-parts')},
        'cert': {c['slug']: c['id'] for c in items('/admin/certifications')},
    }

    existing, page = [], 1
    while True:
        d = call('GET', f'/admin/products?page={page}&pageSize=100')['data']
        existing += d['items']
        if page >= d['totalPages']:
            break
        page += 1
    by_sku = {p['sku'].upper(): p for p in existing if p.get('sku')}
    by_name = defaultdict(list)
    for p in existing:
        if not p.get('sku'):
            by_name[re.sub(r'\W', '', (p.get('nameEn') or '').lower())].append(p)
    taken = {p['slug'] for p in existing}

    plan, used = [], set()
    for sku, rows in data.items():
        b = build(sku, rows, tax)
        m = (by_sku.get(sku) or by_sku.get(SKU_RENAMED.get(sku, ''))
             or next((p for p in existing if p['slug'] == LEGACY_SLUG.get(sku)), None))
        how = 'sku' if m else None
        if not m:
            cand = [p for p in by_name.get(re.sub(r'\W', '', rows[0]['en'].lower()), []) if p['id'] not in used]
            if sku.startswith('CPS-') and len(cand) > 1:
                want = STOCKING_LEGACY_SUB.get(b['pressure'])
                cand = [p for p in cand if p['subCategorySlug'] == want]
            m = cand[0] if cand else None
            how = 'name' if m else 'new'
        if m:
            used.add(m['id'])
        cur_sub = m['subCategorySlug'] if m else None
        primary = cur_sub if cur_sub in b['subs'] else b['subs'][0]
        b['primary'] = primary
        b['secondary'] = [s for s in b['subs'] if s != primary]
        plan.append((sku, how, m, b))

    leftover = [p for p in existing if p['id'] not in used]

    # ── 預覽 ──────────────────────────────────────────────────────────────
    print(f'資料表 {len(data)} 個品號；正式資料 {len(existing)} 筆產品  ({API})')
    for how, label in (('sku', '以品號對上'), ('name', '以英文名對上（補品號）'), ('new', '新增')):
        group = [x for x in plan if x[1] == how]
        print(f'\n══ {label}：{len(group)}')
        for sku, _, m, b in group:
            tag = []
            if m and m['subCategorySlug'] != b['primary']:
                tag.append(f"子分類 {m['subCategorySlug']} → {b['primary']}（自動轉址）")
            if m and m.get('sku') and m['sku'].upper() != sku:
                tag.append(f"品號 {m['sku']} → {sku}")
            if b['secondary']:
                tag.append('次要 ' + ','.join(b['secondary']))
            if b['droppedParts']:
                tag.append('部位無對應 ' + '、'.join(b['droppedParts']))
            old = f"  ← {m['slug']}" if m else ''
            print(f"  {sku:9} {b['translations']['en']['name']} ／ {b['translations']['zh-TW']['name']}{old}")
            if tag:
                print(f"            {'；'.join(tag)}")
    print(f'\n══ 資料表沒有、退回草稿：{len(leftover)}')
    for p in leftover:
        print(f"  {p['subCategorySlug']:18} {p['nameEn']}  ({p['slug']})")

    if not APPLY:
        print('\n（預覽，未寫入；加 --apply 才會寫）')
        return

    # ── 寫入 ──────────────────────────────────────────────────────────────
    ok = fail = 0
    for sku, how, m, b in plan:
        sub = tax['sub'][b['primary']]
        payload = {
            'sku': sku,
            'categoryId': sub['categoryId'],
            'subCategoryId': sub['id'],
            'secondarySubCategoryIds': [tax['sub'][s]['id'] for s in b['secondary']],
            'bodyPartIds': b['bodyPartIds'],
            'certificationIds': b['certificationIds'],
        }
        if b['collection']:
            payload['collectionId'] = tax['coll'][b['collection']]
        else:
            payload['clearCollection'] = True

        if m:
            cur = call('GET', f"/admin/products/{m['id']}")['data']
            payload['translations'] = {
                loc: {**(cur['translations'].get(loc) or {}), **{k: v for k, v in t.items()}}
                for loc, t in b['translations'].items()
            }
            payload['rowVersion'] = cur['rowVersion']
            r = call('PUT', f"/admin/products/{m['id']}", payload)
            pid, status = m['id'], m['status']
        else:
            base = slugify(b['translations']['en']['name'])
            slug = base if base not in taken else f'{base}-{sku.lower()}'
            taken.add(slug)
            payload['slug'] = slug
            payload['translations'] = b['translations']
            payload.pop('clearCollection', None)
            r = call('POST', '/admin/products', payload)
            pid, status = (r.get('data') or {}).get('id'), 0

        if r.get('success') and status != 1:
            r = call('POST', f'/admin/products/{pid}/publish')
        if r.get('success'):
            ok += 1
        else:
            fail += 1
            print(f"  ✗ {sku}: {r.get('message')} {r.get('errors')}", flush=True)
        if (ok + fail) % 25 == 0:
            print(f'  … {ok + fail}', flush=True)

    for p in leftover:
        if p['status'] == 1:
            r = call('POST', f"/admin/products/{p['id']}/unpublish")
            if not r.get('success'):
                print(f"  ✗ 退回草稿 {p['slug']}: {r.get('message')}")

    print(f'\n完成 {ok}、失敗 {fail}；退回草稿 {len(leftover)}')


if __name__ == '__main__':
    main()
