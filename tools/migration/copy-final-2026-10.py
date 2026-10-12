"""
套用「EuniceMed 官網英文文案｜最終版」（2026-10）裡**存在 CMS 與 DB 的那一半**。

用法：
    python3 tools/migration/copy-final-2026-10.py <token 檔>            # 預覽（不寫入）
    python3 tools/migration/copy-final-2026-10.py <token 檔> --apply    # 真的寫入
    EM_API=http://localhost:7071/api python3 tools/migration/copy-final-2026-10.py …

版面文案（區段標題、按鈕、hero、SEO title/description）在各頁的 `COPY` 常數，
不在這裡（docs/15）。這支只處理：

| 對象 | 內容 |
|---|---|
| CMS `home.featuredProducts` | 型錄橫幅的眉標與標題 |
| CMS `home.testimonial` | 區段標題（引言本身待客戶提供，不動） |
| CMS `about.milestones` | 五個年份的事件文字（ISO/CE 取得年份待確認，不加） |
| CMS `about.manufacturing` | 三個要點（LYCRA® 待確認，先用文案提供的替代寫法） |
| CMS `about.certificates` | 掛上 FDA |
| CMS `partnership.*` | 經銷、OEM/ODM、成為夥伴三段 |
| DB `Category` | 三大分類的名稱與說明 |
| DB `Application` | 四個部位的 MapCopy、三個特殊照護的 Lead |
| DB `Certification` | 新增 FDA（**草稿**）、OEKO-TEX 標章字樣、排序 |
| DB `Faq` | 新分類 `oem` 與三題 OEM/ODM FAQ |
| DB `Product` | 英文產品名統一 Title Case |

**黃底待確認項一律不寫**：見證引言、創辦人故事、證號／效期、MOQ 與交期的數字、
回覆天數、通路名稱。MOQ 與交期兩題以**草稿**建立，數字欄位留著 `[…]` 讓編輯者補，
草稿不會出現在前台。

**FDA 認證建成草稿**：認證一發布就會出現在**每一個**產品頁的標章列
（`TaxonomyReadService.GetCertificationsAsync` 回全站），而 FDA 登錄涵蓋哪些產品線還沒確認。
確認後在後台把它發布，About 的卡片與產品頁會同時出現。

**冪等**：每一項都先讀再比，值相同就略過；可以重跑。
寫入一律是「讀整列 → 改目標欄位 → 送回」，因為翻譯物件是整筆取代
（`ApplyTranslations` 直接指派每個欄位），只送一個欄位會把其他欄位清成 null。

⚠️ **`partnership.becomePartner` 的五個合作類型需要先部署 API**：
`private-label`、`bulk` 是這次才加進 schema enum 的值，schema 是編進 API 的嵌入資源。
API 還沒部署就跑，那一段會 400，其餘照常。
"""
import json, os, re, sys, urllib.request, urllib.error

API = os.environ.get('EM_API', 'https://func-eunicemed-prod.azurewebsites.net/api')
TOKEN = ''   # 在 __main__ 讀；--test 不需要 token
APPLY = '--apply' in sys.argv

DRAFT, PUBLISHED = 0, 1   # Api/Common/Constants.cs 的 ContentStatus


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{API}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        return json.load(e)


def write(method, path, body, label):
    """預覽模式只印出要做什麼；--apply 才送出。"""
    if not APPLY:
        print(f'  ~ {label}（預覽，未寫入）')
        return True
    r = call(method, path, body)
    ok = r.get('success')
    print(f'  {"✓" if ok else "✗"} {label}' + ('' if ok else f'：{r.get("message")} {r.get("errors")}'))
    return ok


# ═══════════════════════════════════════════════════════════════════════════
# CMS 區段
# ═══════════════════════════════════════════════════════════════════════════

MILESTONES = {
    '2008': ('Comfort Plus Corporation founded in Taiwan — a vision takes root.',
             '康得適 Comfort Plus Corporation 於台灣成立 —— 願景就此扎根。'),
    '2010': ('EuniceMed brand is born — establishing our identity.',
             'EuniceMed 品牌誕生 —— 確立我們的識別。'),
    '2016': ('Introducing Aergo — our orthopedic braces range expands the brand family.',
             '推出 Aergo —— 矯型護具系列擴大品牌家族。'),
    '2021': ('Manufacturing expansion in Taiwan — scaling with purpose.',
             '台灣廠區擴建 —— 有目標地擴大規模。'),
    '2025': ('Brand transformation — a new chapter begins.',
             '品牌轉型 —— 開啟新篇章。'),
}

# LYCRA® 待確認：文案註明「若不是，改寫為 premium elastic yarn」，確認前先用這一版
POINTS = [
    ('Precision fit',
     'Premium elastic yarn for excellent elasticity, long-term durability and lasting graduated compression.',
     '精準貼合', '高品質彈性紗線，提供優異彈性、長久耐用與持久的漸進式壓力。'),
    ('Safe materials',
     'OEKO-TEX® STANDARD 100 yarns — non-toxic and skin-friendly — and 100% medical-grade silicone.',
     '安全材質', '採用 OEKO-TEX® STANDARD 100 認證紗線 —— 無毒、親膚 —— 以及 100% 醫療級矽膠。'),
    ('Comfort-first',
     'Soft-touch textures that stay comfortable through extended, everyday wear.',
     '舒適優先', '柔軟觸感的織面，長時間日常穿戴依然舒適。'),
]

CERTS = ['iso-13485', 'ce', 'fda', 'oeko-tex-100', 'patented', 'mit']

DISTRIBUTOR = {
    'en': ('Distributor Partnership',
           '<p>Join EuniceMed distributors in 18 countries. We support our distribution partners '
           'with marketing assets, product training and clear communication on MOQ and lead times.</p>'
           '<p>Whether you supply pharmacies, hospitals, clinics or homecare channels, our team helps '
           'you carry EuniceMed with confidence.</p>'),
    'zh-TW': ('經銷合作',
              '<p>加入遍及 18 個國家的 EuniceMed 經銷網絡。我們以行銷素材、產品教育訓練，'
              '以及對最低訂購量與交期的清楚溝通支援經銷夥伴。</p>'
              '<p>無論您供貨給藥局、醫院、診所或居家照護通路，我們的團隊都會協助您安心經銷 EuniceMed。</p>'),
}

OEM = {
    'en': ('OEM / ODM Services',
           '<p>As an orthopedic braces and compression stockings OEM/ODM manufacturer, our in-house '
           'team in Taiwan takes your concept to a market-ready medical support — design, sampling, '
           'certification support and scaled production, including private label. A reliable '
           'Taiwan-made partner for China+1 sourcing.</p>',
           ['Design & sampling', 'Material sourcing', 'Certification support (ISO 13485 · CE · FDA)',
            'Scaled production', 'Private label']),
    'zh-TW': ('OEM / ODM 服務',
              '<p>作為矯型護具與醫療彈性襪的 OEM/ODM 製造商，我們在台灣的內部團隊能將您的構想'
              '化為可上市的醫療護具 —— 從設計、打樣、認證協助到量產，也提供自有品牌代工。'
              '是 China+1 採購策略中可靠的台灣製造夥伴。</p>',
              ['設計與打樣', '材料採購', '認證協助（ISO 13485 · CE · FDA）', '量產', '自有品牌']),
}

BECOME = {
    'en': {
        'title': 'How to Become a Partner',
        'steps': [('Talk', 'Share your market and requirements.'),
                  ('Sample', 'Evaluate products or prototypes.'),
                  ('Agree', 'Confirm terms, MOQ and timeline.'),
                  ('Ship', 'Production, QC and delivery.')],
        'formTitle': 'Partner Inquiry',
        # formIntro 的回覆天數待確認（兩頁要統一），不動
        'partnershipTypes': [('distributor', 'Distributor'), ('oem', 'OEM'), ('odm', 'ODM'),
                             ('private-label', 'Private label'),
                             ('bulk', 'Bulk purchase (hospital & long-term care)')],
    },
    'zh-TW': {
        'title': '如何成為合作夥伴',
        'steps': [('洽談', '分享您的市場與需求。'),
                  ('打樣', '評估產品或樣品。'),
                  ('議定', '確認條件、最低訂購量與時程。'),
                  ('出貨', '生產、品管與交貨。')],
        'formTitle': '合作洽詢',
        'partnershipTypes': [('distributor', '經銷商'), ('oem', 'OEM'), ('odm', 'ODM'),
                             ('private-label', '自有品牌'),
                             ('bulk', '大量採購（醫院與長照機構）')],
    },
}


def section_edits(locale):
    """sectionKey → 對該語系既有 data 的修改函式。回傳 None 表示該區段不動。"""
    en = locale == 'en'

    def featured(d):
        promo = dict(d.get('promo') or {})
        promo['eyebrow'] = 'Full catalogue' if en else '完整型錄'
        promo['title'] = ('Browse all braces, compression stockings & footcare' if en
                          else '瀏覽所有護具、醫療彈性襪與足部護理產品')
        return {**d, 'promo': promo}

    def testimonial(d):
        return {**d, 'title': 'Trusted by Distributors in 18 Countries' if en else '18 個國家經銷商的信賴'}

    def milestones(d):
        items = []
        for year, (e, z) in MILESTONES.items():
            items.append({'year': year, 'event': e if en else z})
        return {**d, 'items': items}

    def manufacturing(d):
        return {**d, 'points': [{'title': te if en else tz, 'body': be if en else bz}
                                for te, be, tz, bz in POINTS]}

    def certificates(d):
        return {**d, 'items': [{'certification': c} for c in CERTS]}

    def distributor(d):
        title, body = DISTRIBUTOR[locale]
        return {**d, 'title': title, 'body': body}

    def oem(d):
        title, body, chips = OEM[locale]
        return {**d, 'title': title, 'body': body, 'chips': [{'label': c} for c in chips]}

    def become(d):
        b = BECOME[locale]
        return {**d, 'title': b['title'], 'formTitle': b['formTitle'],
                'steps': [{'title': t, 'body': s} for t, s in b['steps']],
                'partnershipTypes': [{'key': k, 'label': l} for k, l in b['partnershipTypes']]}

    return {
        ('home', 'featuredProducts'): featured,
        ('home', 'testimonial'): testimonial,
        ('about', 'milestones'): milestones,
        ('about', 'manufacturing'): manufacturing,
        ('about', 'certificates'): certificates,
        ('partnership', 'distributor'): distributor,
        ('partnership', 'oemOdm'): oem,
        ('partnership', 'becomePartner'): become,
    }


def run_sections():
    print('\n══ CMS 區段')
    pages = {}
    for locale in ('en', 'zh-TW'):
        for (page_key, section_key), edit in section_edits(locale).items():
            if page_key not in pages:
                r = call('GET', f'/admin/pages/{page_key}')
                pages[page_key] = {s['sectionKey']: s for s in (r.get('data') or {}).get('sections', [])}
            sec = pages[page_key].get(section_key)
            if sec is None:
                print(f'  ✗ {page_key}.{section_key}：區段不存在')
                continue
            current = (sec.get('translations') or {}).get(locale) or {}
            if not current:
                # 沒有該語系內容的區段不從零建（缺圖片等必填欄位），交給編輯者
                print(f'  – {page_key}.{section_key} [{locale}]：該語系尚無內容，略過')
                continue
            new = edit(current)
            if new == current:
                print(f'  = {page_key}.{section_key} [{locale}]：已是定稿')
                continue
            write('PUT', f'/admin/pages/{page_key}/sections/{section_key}',
                  {'locale': locale, 'data': new, 'syncInvariantFields': False},
                  f'{page_key}.{section_key} [{locale}]')


# ═══════════════════════════════════════════════════════════════════════════
# 分類
# ═══════════════════════════════════════════════════════════════════════════

CATEGORIES = {
    'medical-compression-stockings': {
        'en': ('Medical Compression Stockings',
               'Graduated compression stockings and socks in three compression classes — '
               'support for tired legs, varicose veins and travel.'),
        'zh-TW': ('醫療彈性襪',
                  '三種壓力等級的漸進式壓力襪 —— 舒緩腿部疲勞、靜脈曲張，也適合旅途中穿著。'),
    },
    'orthopedic-support': {
        'en': ('Orthopedic Braces & Supports',
               'Stability and protection — knee braces, ankle braces, back braces, wrist and '
               'elbow braces and neck braces.'),
        'zh-TW': ('矯型護具',
                  '穩定與保護 —— 護膝、護踝、護腰、護腕、護肘與頸部護具。'),
    },
    'footcare-insoles': {
        'en': ('Footcare & Insoles',
               'Medical-grade silicone arch support insoles, plantar fasciitis insoles and bunion '
               '(hallux valgus) supports for comfortable steps.'),
        'zh-TW': ('足部護理與鞋墊',
                  '醫療級矽膠足弓支撐鞋墊、足底筋膜炎鞋墊與拇趾外翻輔具，讓每一步都舒適。'),
    },
}


def run_categories():
    print('\n══ 分類')
    rows = call('GET', '/admin/categories').get('data') or []
    for row in rows:
        want = CATEGORIES.get(row['slug'])
        if not want:
            continue
        trs = row.get('translations') or {}
        patch = {}
        for locale, (name, desc) in want.items():
            cur = trs.get(locale)
            if not cur:
                print(f'  – {row["slug"]} [{locale}]：沒有該語系翻譯，略過')
                continue
            if cur.get('name') == name and cur.get('description') == desc:
                continue
            patch[locale] = {**cur, 'name': name, 'description': desc}
        if not patch:
            print(f'  = {row["slug"]}：已是定稿')
            continue
        body = {'translations': patch}
        if row.get('rowVersion'):
            body['rowVersion'] = row['rowVersion']
        write('PATCH', f'/admin/categories/{row["id"]}', body, f'{row["slug"]}（{"、".join(patch)}）')


# ═══════════════════════════════════════════════════════════════════════════
# 應用方案
# ═══════════════════════════════════════════════════════════════════════════

# 部位 → MapCopy；特殊照護 → Lead
# Back & Waist 的「and hyperextension braces」待確認是否有生產，確認前先拿掉
APPLICATIONS = {
    'knee':  ('mapCopy', 'Knee braces for sports, ligament support and everyday stability.',
              '運動、韌帶支撐與日常穩定用的護膝。'),
    'ankle': ('mapCopy', 'Ankle braces for sprains and repeated instability.',
              '針對扭傷與反覆不穩的護踝。'),
    'back':  ('mapCopy', 'Lumbar support for posture and lifting.',
              '支撐姿勢與搬提的護腰。'),
    'foot':  ('mapCopy', 'Insoles, plantar fasciitis and bunion support.',
              '鞋墊、足底筋膜炎與拇趾外翻支撐。'),
    'elderly-care': ('lead',
                     'Braces for elderly users and compression stockings for home and long-term care facilities.',
                     '適合長者的護具，以及居家與長照機構使用的醫療彈性襪。'),
    'bunion-relief': ('lead', 'Bunion corrector and toe splints for hallux valgus comfort.',
                      '拇趾外翻矯正器與趾間分隔器，舒緩拇趾外翻的不適。'),
    'post-operative-recovery': ('lead',
                                'Post-surgery braces for knee, ankle, shoulder and neck rehabilitation.',
                                '膝、踝、肩、頸術後復健用護具。'),
}


def run_applications():
    print('\n══ 應用方案')
    rows = call('GET', '/admin/applications').get('data') or []
    rows = rows.get('items', rows) if isinstance(rows, dict) else rows
    for summary in rows:
        want = APPLICATIONS.get(summary['slug'])
        if not want:
            continue
        field, en, zh = want
        row = call('GET', f'/admin/applications/{summary["id"]}').get('data') or {}
        trs = row.get('translations') or {}
        patch = {}
        for locale, text in (('en', en), ('zh-TW', zh)):
            cur = trs.get(locale)
            if not cur:
                print(f'  – {summary["slug"]} [{locale}]：沒有該語系翻譯，略過')
                continue
            if cur.get(field) != text:
                patch[locale] = {**cur, field: text}
        if not patch:
            print(f'  = {summary["slug"]}：已是定稿')
            continue
        body = {'translations': patch}
        if row.get('rowVersion'):
            body['rowVersion'] = row['rowVersion']
        write('PATCH', f'/admin/applications/{summary["id"]}', body,
              f'{summary["slug"]}.{field}（{"、".join(patch)}）')


# ═══════════════════════════════════════════════════════════════════════════
# 認證
# ═══════════════════════════════════════════════════════════════════════════

FDA = {
    'slug': 'fda', 'mark': 'FDA', 'status': DRAFT,
    'translations': {
        'en': {'subLabel': 'U.S. FDA registered',
               'description': 'Registered with the U.S. FDA for applicable product lines.'},
        'zh-TW': {'subLabel': '美國 FDA 登錄',
                  'description': '適用產品線已於美國 FDA 完成登錄。'},
    },
}

MARKS = {'oeko-tex-100': 'OEKO-TEX® STANDARD 100'}


def run_certifications():
    print('\n══ 認證')
    rows = call('GET', '/admin/certifications').get('data') or []
    by_slug = {r['slug']: r for r in rows}

    if 'fda' not in by_slug:
        write('POST', '/admin/certifications', {**FDA, 'sortOrder': CERTS.index('fda')},
              'fda 新增為草稿（確認登錄範圍後到後台發布）')
    else:
        print('  = fda：已存在')

    for slug, row in by_slug.items():
        patch = {}
        if slug in CERTS and row.get('sortOrder') != CERTS.index(slug):
            patch['sortOrder'] = CERTS.index(slug)
        if slug in MARKS and row.get('mark') != MARKS[slug]:
            patch['mark'] = MARKS[slug]
        if patch:
            write('PATCH', f'/admin/certifications/{row["id"]}', patch, f'{slug}：{patch}')


# ═══════════════════════════════════════════════════════════════════════════
# OEM/ODM FAQ
# ═══════════════════════════════════════════════════════════════════════════

# (狀態, 英文問題, 英文答案, 中文問題, 中文答案)
# MOQ 與交期的數字待客戶提供 → 草稿，數字留 […] 給編輯者補
OEM_FAQS = [
    (DRAFT,
     'What is your minimum order quantity (MOQ)?',
     'Our MOQ is [MOQ] pieces per style. Share your target products, quantities and market, and '
     'we will confirm a quote and MOQ for your project.',
     '最低訂購量（MOQ）是多少？',
     '每款最低訂購量為 [MOQ] 件。請提供目標產品、數量與市場，我們會為您的專案確認報價與最低訂購量。'),
    (DRAFT,
     'How long do sampling and production take?',
     'Sampling takes about [N] working days and mass production about [N] days, depending on '
     'quantity. Every shipment comes with quality and test documents.',
     '打樣與量產需要多久？',
     '打樣約需 [N] 個工作天，量產約需 [N] 天，依數量而定。每批出貨皆附品質與檢測文件。'),
    (PUBLISHED,
     'Can you produce under my brand?',
     'Yes. We offer private label as well as OEM and ODM. We can customize materials, sizes, '
     'compression classes, colors, packaging and multilingual instructions, and apply your branding '
     'with woven labels or laser marking.',
     '可以用我的品牌生產嗎？',
     '可以。我們提供自有品牌以及 OEM 與 ODM 服務，可客製材質、尺寸、壓力等級、顏色、包裝與多語說明書，'
     '並以織標或雷射標記呈現您的品牌。'),
]


def run_faqs():
    print('\n══ OEM/ODM FAQ')
    cats = call('GET', '/admin/faq-categories').get('data') or []
    cat = next((c for c in cats if c['slug'] == 'oem'), None)
    if cat is None:
        if not APPLY:
            print('  ~ 分類 oem 新增（預覽，未寫入）；題目待分類建立後才能預覽')
            return
        r = call('POST', '/admin/faq-categories', {
            'slug': 'oem', 'sortOrder': len(cats), 'status': PUBLISHED,
            'translations': {'en': {'name': 'OEM / ODM'}, 'zh-TW': {'name': 'OEM / ODM'}},
        })
        if not r.get('success'):
            print(f'  ✗ 分類 oem 建立失敗：{r.get("message")} {r.get("errors")}')
            return
        cat = r['data']
        print('  ✓ 分類 oem 已建立')
    else:
        print('  = 分類 oem：已存在')

    existing = call('GET', '/admin/faqs?category=oem').get('data') or []
    have = {(f.get('translations') or {}).get('en', {}).get('question') for f in existing}
    for i, (status, en_q, en_a, zh_q, zh_a) in enumerate(OEM_FAQS):
        if en_q in have:
            print(f'  = {en_q}：已存在')
            continue
        write('POST', '/admin/faqs', {
            'faqCategoryId': cat['id'], 'status': status, 'sortOrder': i,
            'translations': {'en': {'question': en_q, 'answer': f'<p>{en_a}</p>'},
                             'zh-TW': {'question': zh_q, 'answer': f'<p>{zh_a}</p>'}},
        }, f'{en_q}（{"草稿" if status == DRAFT else "發布"}）')


# ═══════════════════════════════════════════════════════════════════════════
# 產品名稱 Title Case
# ═══════════════════════════════════════════════════════════════════════════

# 美式標題大小寫的虛詞：不在句首時維持小寫（文案範例：Aergo Toe Splint for Hallux Valgus）
SMALL = {'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'}


def title_case(name):
    """只動「全小寫」的字：已含大寫或數字的（型號、TL、Auxi+、AerGo）原樣保留。"""
    words = name.split(' ')
    out = []
    for i, w in enumerate(words):
        if w and re.fullmatch(r"[a-z][a-z'’-]*", w) and not (i > 0 and w in SMALL):
            w = '-'.join(p[:1].upper() + p[1:] for p in w.split('-'))
        out.append(w)
    return ' '.join(out)


def run_products():
    print('\n══ 產品名稱（en）Title Case')
    page, changed = 1, 0
    while True:
        r = call('GET', f'/admin/products?page={page}&pageSize=100').get('data') or {}
        items = r.get('items') or []
        for p in items:
            name = p.get('nameEn')
            if not name or title_case(name) == name:
                continue
            new = title_case(name)
            changed += 1
            row = call('GET', f'/admin/products/{p["id"]}').get('data') or {}
            cur = (row.get('translations') or {}).get('en')
            if not cur:
                continue
            body = {'translations': {'en': {**cur, 'name': new}}}
            if row.get('rowVersion'):
                body['rowVersion'] = row['rowVersion']
            write('PATCH', f'/admin/products/{p["id"]}', body, f'{name}  →  {new}')
        if len(items) < 100:
            break
        page += 1
    if changed == 0:
        print('  = 全部已是 Title Case')


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        for a, b in [('Achilles protection pad', 'Achilles Protection Pad'),
                     ('Cervical collar', 'Cervical Collar'),
                     ('Aergo toe splint for hallux valgus', 'Aergo Toe Splint for Hallux Valgus'),
                     ('Ankle Support Auxi+', 'Ankle Support Auxi+'),
                     ('Aergo Knee Support TL', 'Aergo Knee Support TL'),
                     ('anti-embolism stockings', 'Anti-Embolism Stockings')]:
            assert title_case(a) == b, (a, title_case(a))
        print('title_case OK')
        sys.exit(0)

    TOKEN = open(sys.argv[1]).read().strip()
    print(f'API：{API}　模式：{"寫入" if APPLY else "預覽（加 --apply 才寫入）"}')
    run_sections()
    run_categories()
    run_applications()
    run_certifications()
    run_faqs()
    run_products()
