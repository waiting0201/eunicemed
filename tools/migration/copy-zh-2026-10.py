"""
套用「EuniceMed 官網中文文案｜中英對照」（2026-10）裡**存在 CMS 與 DB 的那一半**。
英文那一半是 `copy-final-2026-10.py`；這支**只動 zh-TW**，英文一個字都不碰。

用法：
    python3 tools/migration/copy-zh-2026-10.py <token 檔>            # 預覽（不寫入）
    python3 tools/migration/copy-zh-2026-10.py <token 檔> --apply    # 真的寫入
    EM_API=http://localhost:7071/api python3 tools/migration/copy-zh-2026-10.py …

版面文案（區段標題、按鈕、hero、SEO title/description）在各頁的 `COPY` 常數，
不在這裡（docs/15）。這支只處理：

| 對象 | 內容 |
|---|---|
| CMS `home.featuredProducts` | 型錄橫幅的眉標與標題 |
| CMS `home.testimonial` | 區段標題、影片標籤（引言本身待客戶提供，不動） |
| CMS `about.story` | 標題與內文（**不含創辦人故事**，英文站也還沒上） |
| CMS `about.milestones` | 五個年份的事件文字 |
| CMS `about.manufacturing` | 三個要點（LYCRA® 待確認，沿用英文站的替代寫法） |
| CMS `partnership.*` | 經銷、OEM/ODM、成為夥伴三段（`formIntro` 的回覆天數待確認，不動） |
| DB `Category` | 三大分類的名稱與說明 |
| DB `Application` | 四個部位的 MapCopy、三個特殊照護的 Lead，兩個特殊照護的名稱 |
| DB `Certification` | 六張認證卡的中文說明 |
| DB `Faq` | 三題 OEM/ODM FAQ 的中文 |
| DB `Article` | 首頁三則最新消息的中文標題 |
| DB `SalesLocation` | 旗艦門市名稱、網路商店備註 |
| CMS `privacy.content`、DB `Article` 內文 | 公司中文名「康得適」→「康譜企業」（見下） |

**不在這裡的**：產品中文名。定稿的規則是「英文型號＋中文品名」，品名以
「產品資料表（客戶回覆）」為準，但文件只列了 11 個例子 —— 只改這 11 個會讓
型錄一半新格式、一半舊格式。拿到資料表再整批做。

**黃底待確認項一律不寫**，與英文站同一套處理：見證引言、創辦人故事、成功高中的贊助關係、
ISO/CE 取得年份、LYCRA®、證號／效期、MOQ 與交期的數字、回覆天數、通路名稱。

**冪等**：每一項都先讀再比，值相同就略過；可以重跑。
寫入一律是「讀整列 → 改目標欄位 → 送回」，因為翻譯物件是整筆取代，
只送一個欄位會把其他欄位清成 null。
"""
import json, os, sys, urllib.error, urllib.parse, urllib.request

API = os.environ.get('EM_API', 'https://func-eunicemed-prod.azurewebsites.net/api')
TOKEN = ''
APPLY = '--apply' in sys.argv
ZH = 'zh-TW'


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


def patch_zh(path, row, fields, label):
    """把 zh-TW 翻譯的 `fields` 換掉後整筆送回；沒有變化就略過。"""
    cur = (row.get('translations') or {}).get(ZH)
    if not cur:
        print(f'  – {label}：沒有中文翻譯，略過')
        return
    new = {**cur, **fields}
    if new == cur:
        print(f'  = {label}：已是定稿')
        return
    body = {'translations': {ZH: new}}
    if row.get('rowVersion'):
        body['rowVersion'] = row['rowVersion']
    write('PATCH', path, body, label)


# ═══════════════════════════════════════════════════════════════════════════
# CMS 區段
# ═══════════════════════════════════════════════════════════════════════════

# 定稿第 1 段的開頭是創辦人故事（黃底待確認，英文站也沒上），
# 這裡從「讓更多人能舒服……」那句接起，主詞改回品牌。
STORY = {
    'title': '品牌故事與承諾',
    'body': (
        '<p>EuniceMed 康譜想做的，是讓更多人能舒服、有自信地生活，不必將就。'
        '所以我們用心打造台灣製護具、醫療彈性襪與足部照護產品，不只講求功能，'
        '也在保護、舒適與照護上訂下更高的標準。對醫療專業人員來說，All-in-One Premium Promise '
        '代表臨床信賴的產品、舒適優先的設計，以及好溝通、能長期合作的即時服務；'
        '對使用者來說，代表的是安心。</p>'
        '<p>每一件護具、每一道車縫、每一個決定，都是為了支持您活動，而不是限制您。'
        '我們不偷工減料、說到做到，一步一步累積信任。</p>'
    ),
}

MILESTONES = [
    ('2008', '康譜企業在台灣成立，理念從這裡扎根。'),
    ('2010', 'EuniceMed 品牌誕生，確立品牌定位。'),
    ('2016', '推出 Aergo 骨科護具系列，品牌家族再擴大。'),
    ('2021', '在台灣擴充產能，穩健向前。'),
    ('2025', '品牌轉型，開啟新篇章。'),
]

# LYCRA® 待確認：定稿中文寫了 LYCRA®，英文站目前用替代寫法，兩邊先一致
POINTS = [
    ('精準合身', '採用高品質彈性纖維，彈性好、耐穿，漸進式壓力也能長時間維持。'),
    ('安全材質', '使用 OEKO-TEX® STANDARD 100 紗線，無毒親膚；矽膠為 100% 醫療級。'),
    ('舒適優先', '觸感柔軟，長時間、天天穿戴依然舒服。'),
]

DISTRIBUTOR = (
    '經銷代理合作',
    '<p>目前已有 18 國代理商經銷 EuniceMed 康譜，歡迎洽談醫療護具品牌代理合作。'
    '我們提供行銷素材與產品教育訓練，MOQ、交期也會說清楚。</p>'
    '<p>不論您是藥局、醫院、診所或居家照護通路的藥局護具供應商、醫院護具供應商，都能放心經銷。</p>',
)

OEM = (
    'OEM／ODM 服務',
    '<p>我們是骨科護具與壓力襪的 OEM／ODM 製造商，也是台灣壓力襪代工廠與護具代工廠。'
    '台灣團隊從設計、打樣、認證協助到量產，提供護具與壓力襪一站式供應，'
    '也承接貼牌代工與護具批發。想找非中國供應商，台灣製造是穩定可靠的選擇。</p>',
    ['設計與打樣', '材料採購', '認證協助（ISO 13485・CE・FDA）', '量產', '貼牌代工'],
)

BECOME = {
    'title': '如何成為合作夥伴',
    'steps': [('洽談', '告訴我們您的市場與需求。'),
              ('打樣', '評估產品或樣品。'),
              ('簽約', '確認合作條件、MOQ 與時程。'),
              ('出貨', '生產、品管與交貨。')],
    'formTitle': '合作洽詢',
    # formIntro 的回覆天數待確認（兩頁要統一），不動
    'partnershipTypes': [('distributor', '經銷代理'), ('oem', 'OEM'), ('odm', 'ODM'),
                         ('private-label', '貼牌代工'),
                         ('bulk', '機構大量採購（醫院・長照）')],
}


def section_edits():
    """(pageKey, sectionKey) → 對中文 data 的修改函式。"""

    def featured(d):
        promo = {**(d.get('promo') or {}),
                 'eyebrow': '完整產品目錄',
                 'title': '看所有護具、壓力襪與足部照護產品'}
        return {**d, 'promo': promo}

    def testimonial(d):
        return {**d, 'title': '18 國代理商的共同選擇', 'floatingChip': '放眼全球，在地用心。'}

    def story(d):
        return {**d, **STORY}

    def milestones(d):
        return {**d, 'items': [{'year': y, 'event': e} for y, e in MILESTONES]}

    def manufacturing(d):
        return {**d, 'points': [{'title': t, 'body': b} for t, b in POINTS]}

    def distributor(d):
        title, body = DISTRIBUTOR
        return {**d, 'title': title, 'body': body}

    def oem(d):
        title, body, chips = OEM
        return {**d, 'title': title, 'body': body, 'chips': [{'label': c} for c in chips]}

    def become(d):
        b = BECOME
        return {**d, 'title': b['title'], 'formTitle': b['formTitle'],
                'steps': [{'title': t, 'body': s} for t, s in b['steps']],
                'partnershipTypes': [{'key': k, 'label': l} for k, l in b['partnershipTypes']]}

    return {
        ('home', 'featuredProducts'): featured,
        ('home', 'testimonial'): testimonial,
        ('about', 'story'): story,
        ('about', 'milestones'): milestones,
        ('about', 'manufacturing'): manufacturing,
        ('partnership', 'distributor'): distributor,
        ('partnership', 'oemOdm'): oem,
        ('partnership', 'becomePartner'): become,
    }


def run_sections():
    print('\n══ CMS 區段')
    pages = {}
    for (page_key, section_key), edit in section_edits().items():
        if page_key not in pages:
            r = call('GET', f'/admin/pages/{page_key}')
            pages[page_key] = {s['sectionKey']: s for s in (r.get('data') or {}).get('sections', [])}
        sec = pages[page_key].get(section_key)
        if sec is None:
            print(f'  ✗ {page_key}.{section_key}：區段不存在')
            continue
        current = (sec.get('translations') or {}).get(ZH) or {}
        if not current:
            # 沒有中文內容的區段不從零建（缺圖片等必填欄位），交給編輯者
            print(f'  – {page_key}.{section_key}：尚無中文內容，略過')
            continue
        new = edit(current)
        if new == current:
            print(f'  = {page_key}.{section_key}：已是定稿')
            continue
        write('PUT', f'/admin/pages/{page_key}/sections/{section_key}',
              {'locale': ZH, 'data': new, 'syncInvariantFields': False},
              f'{page_key}.{section_key}')


# ═══════════════════════════════════════════════════════════════════════════
# 分類
# ═══════════════════════════════════════════════════════════════════════════

# 名稱依產品資料表（定稿待確認第 4 項）：同一個名稱也是產品列表的篩選標籤，
# 所以分類卡標題取篩選那一組，不用卡片上較長的「醫療彈性襪／壓力襪」「足部照護與鞋墊」。
CATEGORIES = {
    'medical-compression-stockings': (
        '醫療彈性襪',
        '康譜壓力襪是醫療級彈性襪，採漸進式壓力襪設計，一到三級（18–46 mmHg），'
        '有小腿、膝上、大腿襪與壓力褲襪，適合久站族與需要靜脈曲張襪的人。'
        '另有糖尿病足保健襪、抗血栓襪，以及旅行襪（飛機壓力襪）。'),
    'orthopedic-support': (
        '骨科護具',
        '護膝、護踝、護腰帶、護腕、護肘、護肩與頸圈，提供關節穩定、支撐與保護；'
        '也有手腕固定護具、腳踝固定護具與網球肘、高爾夫球肘護具。'),
    'footcare-insoles': (
        '足部照護',
        '醫療級矽膠鞋墊與足弓墊，適合足底筋膜炎時的足底支撐；'
        '也有拇指外翻護套與腳趾分隔墊，讓每一步走得更舒服。'),
}


def run_categories():
    print('\n══ 分類')
    for row in call('GET', '/admin/categories').get('data') or []:
        want = CATEGORIES.get(row['slug'])
        if want:
            name, desc = want
            patch_zh(f'/admin/categories/{row["id"]}', row,
                     {'name': name, 'description': desc}, row['slug'])


# ═══════════════════════════════════════════════════════════════════════════
# 應用方案
# ═══════════════════════════════════════════════════════════════════════════

# 部位 → MapCopy；特殊照護 → Lead（＋卡片標題）。
# 部位的名稱（膝部、踝部…）也是子頁的 H1，定稿沒有另給，不動。
APPLICATIONS = {
    'knee': {'mapCopy': '不論是籃球護膝、跑步護膝還是登山護膝，都有對應的運動護膝；'
                        '也有髕骨護膝與十字韌帶護膝需要的穩定支撐，以及適合長輩日常穿戴的款式。'},
    'ankle': {'mapCopy': '運動護踝與扭傷護踝，適合腳踝反覆扭傷、容易不穩的人；'
                         '術後可選氣囊踝關節夾板這類氣動式足踝護具與腳踝固定護具。'},
    'back': {'mapCopy': '護腰帶與工作腰帶，支撐姿勢；工作護腰、運動護腰、搬重物護腰都有合適款式，'
                        '需要更高支撐也有醫療級護腰，閃到腰、下背痛時同樣適用。'},
    'foot': {'mapCopy': '矽膠鞋墊、足弓墊、足底筋膜炎支撐鞋墊，以及拇指外翻護套。'},
    'elderly-care': {'name': '長輩照護',
                     'lead': '老人護膝、護腰帶等長輩護具，以及適合居家與長照機構使用的醫療彈性襪。'},
    'bunion-relief': {'name': '拇指外翻',
                      'lead': '拇指外翻矯正護套、腳趾分隔墊與保護套，讓走路更舒服。'},
    'post-operative-recovery': {'lead': '膝、踝、腕、腰、頸的術後護具，陪您度過復健期。'},
}


def run_applications():
    print('\n══ 應用方案')
    rows = call('GET', '/admin/applications').get('data') or []
    rows = rows.get('items', rows) if isinstance(rows, dict) else rows
    for summary in rows:
        want = APPLICATIONS.get(summary['slug'])
        if want:
            row = call('GET', f'/admin/applications/{summary["id"]}').get('data') or {}
            patch_zh(f'/admin/applications/{summary["id"]}', row, want,
                     f'{summary["slug"]}（{"、".join(want)}）')


# ═══════════════════════════════════════════════════════════════════════════
# 認證：About 認證卡的說明文字（subLabel 是產品頁標章列的短標，不動）
# ═══════════════════════════════════════════════════════════════════════════

CERT_DESCRIPTIONS = {
    'iso-13485': '醫療器材品質管理系統認證。',
    'ce': '符合歐盟健康、安全與環保要求。',
    'fda': '適用品項已完成美國 FDA 登錄。',
    'oeko-tex-100': '紡織品經檢測，不含有害物質。',
    'patented': '產品取得設計專利保護。',
    'mit': '台灣設計，台灣製造。',
}


def run_certifications():
    print('\n══ 認證說明')
    for row in call('GET', '/admin/certifications').get('data') or []:
        desc = CERT_DESCRIPTIONS.get(row['slug'])
        if desc:
            patch_zh(f'/admin/certifications/{row["id"]}', row, {'description': desc}, row['slug'])


# ═══════════════════════════════════════════════════════════════════════════
# OEM/ODM FAQ（以英文問題對題；MOQ 與交期兩題仍是草稿，數字留 […]）
# ═══════════════════════════════════════════════════════════════════════════

OEM_FAQS = {
    'What is your minimum order quantity (MOQ)?': (
        '最小訂購量（MOQ）是多少？',
        '每款 MOQ 為 [MOQ] 件。歡迎提供目標產品、數量與銷售市場，我們會依您的專案報價並確認 MOQ。'),
    'How long do sampling and production take?': (
        '打樣和量產大概要多久？',
        '打樣約 [N] 個工作天，量產約 [N] 天，實際依數量而定。每批出貨都會附上品質與測試文件。'),
    'Can you produce under my brand?': (
        '可以用我的品牌生產嗎？',
        '可以。除了 OEM、ODM，我們也提供貼牌代工：材質、尺寸、壓力分級、顏色、包裝與多語說明書都能客製，'
        '品牌標示可用織標或雷射標示。'),
}


def run_faqs():
    print('\n══ OEM/ODM FAQ')
    for faq in call('GET', '/admin/faqs?category=oem').get('data') or []:
        en_q = ((faq.get('translations') or {}).get('en') or {}).get('question')
        want = OEM_FAQS.get(en_q)
        if not want:
            continue
        q, a = want
        patch_zh(f'/admin/faqs/{faq["id"]}', faq, {'question': q, 'answer': f'<p>{a}</p>'}, en_q)


# ═══════════════════════════════════════════════════════════════════════════
# 最新消息標題
# ═══════════════════════════════════════════════════════════════════════════

# 成功高中那則：定稿中文寫了「EuniceMed 康譜贊助的」，但贊助關係是黃底待確認，
# 英文站的標題也沒有提，先拿掉。
NEWS_TITLES = {
    'join-us-at-health-amp-rehab-2025': '歡迎蒞臨 Health & Rehab 2025',
    '2026-nagoya-asian-games-phase-1-round-2-archery-training-team-selection-tournament':
        '2026 名古屋亞運：射箭培訓隊第一階段第二次選拔賽',
    'taipei-municipal-chenggong-high-school-advances-to-the-hbl-top-12-playoffs':
        '臺北市立成功高中籃球隊，晉級 HBL 十二強',
}


def run_news():
    print('\n══ 最新消息標題')
    for slug, title in NEWS_TITLES.items():
        r = call('GET', f'/admin/articles?type=news&search={urllib.parse.quote(slug)}&pageSize=20').get('data') or {}
        hit = next((a for a in r.get('items') or [] if a.get('slug') == slug), None)
        if hit is None:
            print(f'  ✗ {slug}：找不到')
            continue
        row = call('GET', f'/admin/articles/{hit["id"]}').get('data') or {}
        patch_zh(f'/admin/articles/{hit["id"]}', row, {'title': title}, slug)


# ═══════════════════════════════════════════════════════════════════════════
# 銷售據點（藥局、網店名稱待客戶提供，不動）
# ═══════════════════════════════════════════════════════════════════════════

# 以英文名稱對列。電話掛在據點本身、兩語系共用，不動。
LOCATIONS = {
    'Comfort Plus Flagship': {'name': '康譜旗艦門市'},   # 正式名稱待確認（定稿待確認第 6 項）
    'Online medical store': {'note': '全台配送'},
}


def run_locations():
    print('\n══ 銷售據點')
    for row in call('GET', '/admin/sales-locations').get('data') or []:
        en_name = ((row.get('translations') or {}).get('en') or {}).get('name')
        want = LOCATIONS.get(en_name)
        if want:
            patch_zh(f'/admin/sales-locations/{row["id"]}', row, want, en_name)


# ═══════════════════════════════════════════════════════════════════════════
# 公司中文名：康得適 → 康譜企業（以客戶中文定稿為準）
# ═══════════════════════════════════════════════════════════════════════════

# 長的放前面，免得「康得適股份有限公司」先被短的那條換成「康譜企業股份有限公司」
RENAMES = [('康得適股份有限公司', '康譜企業有限公司'),
           ('康得適旗艦門市', '康譜旗艦門市'),
           ('康得適', '康譜企業')]


def renamed(text):
    for old, new in RENAMES:
        text = text.replace(old, new)
    return text


def run_rename():
    print('\n══ 公司中文名')
    # 隱私權聲明內文（其餘區段已由上面逐項改寫）
    r = call('GET', '/admin/pages/privacy')
    for sec in (r.get('data') or {}).get('sections', []):
        cur = (sec.get('translations') or {}).get(ZH) or {}
        if '康得適' not in json.dumps(cur, ensure_ascii=False):
            continue
        new = json.loads(renamed(json.dumps(cur, ensure_ascii=False)))
        write('PUT', f'/admin/pages/privacy/sections/{sec["sectionKey"]}',
              {'locale': ZH, 'data': new, 'syncInvariantFields': False},
              f'privacy.{sec["sectionKey"]}')

    # 文章內文（News 與 Insights 都掃）
    page, hits = 1, 0
    while True:
        r = call('GET', f'/admin/articles?page={page}&pageSize=100').get('data') or {}
        items = r.get('items') or []
        for a in items:
            row = call('GET', f'/admin/articles/{a["id"]}').get('data') or {}
            cur = (row.get('translations') or {}).get(ZH) or {}
            fields = {k: renamed(v) for k, v in cur.items() if isinstance(v, str) and '康得適' in v}
            if fields:
                hits += 1
                patch_zh(f'/admin/articles/{a["id"]}', row, fields, f'文章 {a.get("slug")}（{"、".join(fields)}）')
        if len(items) < 100:
            break
        page += 1
    if hits == 0:
        print('  = 文章內文沒有「康得適」')


if __name__ == '__main__':
    TOKEN = open(sys.argv[1]).read().strip()
    print(f'API：{API}　模式：{"寫入" if APPLY else "預覽（加 --apply 才寫入）"}')
    run_sections()
    run_categories()
    run_applications()
    run_certifications()
    run_faqs()
    run_news()
    run_locations()
    run_rename()
