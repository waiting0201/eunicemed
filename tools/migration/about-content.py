"""
把 mockup4 的 About 頁內容與圖片上傳到正式站（en + zh-TW）。

用法：python3 tools/migration/about-content.py <token 檔>

**只處理留在 CMS 的欄位。** 頁首、三段區段標題與核心價值已於 2026-08-28 移出
（docs/15-cms-scope.md），所以這裡不送 title/lead/cta —— 送了會撞上
additionalProperties:false 而 400。

英文逐字取自 `mockup4/About.dc.html`；中文為新譯，品牌符號
（EuniceMed、AerGo、All-in-One Premium Promise、Lycra、Oeko-Tex Standard 100、
ISO 13485、CE、MIT）維持英文（CLAUDE.md §5.1）。

圖片會先由 `tools/crop-to-preset.py` 裁成 preset 的比例再上傳 —— 管線本身不裁切，
丟未裁的母檔進去只會讓瀏覽器下載一堆用不到的畫素（見下方 SLOTS 的註解）。

⚠️ **04 製造與品質的兩張照片沒有來源**：mockup4 那兩格是佔位框
（`factory exterior 1600×900`、`production line 1200×1200`），
`mockup4/images/` 裡沒有廠區照。這支腳本只上傳文字重點，圖等客戶提供。
"""
import json, os, subprocess, sys, urllib.request

# 預設打正式站；本機驗證時用 EM_API=http://localhost:7071/api 覆寫
API = os.environ.get('EM_API', 'https://func-eunicemed-prod.azurewebsites.net/api')
TOKEN = open(sys.argv[1]).read().strip()
SRC = 'mockup4/images'
OUT = 'mockup4/exports/about'   # 裁好的 preset 版本（gitignore 內，隨時可重生）


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
    """已經傳過就重用 —— 這支腳本要能重跑，不該每跑一次多一張同樣的圖。"""
    filename = os.path.basename(path)
    stem = os.path.splitext(filename)[0]
    hit = call('GET', f'/admin/media?presetKey={preset}&search={stem}')
    # 這支端點回的是純陣列（不分頁）；容錯處理成兩種形狀都能吃
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


# 版位 → 來源、preset、裁切錨點、alt。
#
# **先裁再傳。** 媒體管線是「只縮不放、不裁切」（docs/11 §1、§4），preset 的 height
# 只用來出警告 —— 實際裁切是前台的 object-fit:cover 做的。直接丟設計稿的直式母檔
# 進 page-band，伺服器會原樣存下 2480×3508，瀏覽器為了顯示一條 480px 高的橫幅
# 下載一整張 8.7MP、CSS 丟掉其中 87%。視覺是對的，頻寬不是。
#
# 錨點必須與前台的 object-position 逐字一致，否則裁出來的構圖與設計稿不同：
#   page-band    → PageBand.tsx           object-position: center
#   portrait-4x5 → about/page.tsx         object-position: top center
#   section-bg   → about/page.tsx s02Img  object-position: center 25%
SLOTS = [
    ('brand-pattern-src.jpg', 'page-band',    'center',     '01-hero-band', ''),
    ('about-athlete.jpg',     'portrait-4x5', 'top center', '02-story-portrait',
     'Athlete wearing EuniceMed knee support'),
    ('band-teal.jpg',         'section-bg',   'center 25%', '03-milestones-background', ''),
]


def prepare(source, preset, position, stem):
    """裁成 preset 的比例，輸出到 OUT。已經裁過就沿用。"""
    os.makedirs(OUT, exist_ok=True)
    dst = os.path.join(OUT, f'{stem}__{preset}.jpg')
    subprocess.run(
        [sys.executable, 'tools/crop-to-preset.py',
         os.path.join(SRC, source), dst, preset, position],
        check=True)
    return dst


print('── 裁切並上傳圖片')
ids = {}
for source, preset, position, stem, alt in SLOTS:
    ids[preset] = find_or_upload(prepare(source, preset, position, stem), preset, alt)

band, portrait, milestone_bg = ids['page-band'], ids['portrait-4x5'], ids['section-bg']

STORY_EN = (
    '<p>At EuniceMed, we believe life should be lived with comfort and confidence '
    '&mdash; never compromise. That&rsquo;s why we thoughtfully craft medical supports '
    'that go beyond function, setting a new standard in protection, comfort and care. '
    'For healthcare professionals, our All-in-One Premium Promise means clinically '
    'trusted products, comfort-first design and responsive support that&rsquo;s easy to '
    'work with and built to last. For individuals, it means reassurance.</p>'
    '<p>Every brace, every stitch, every choice we make is designed to support movement '
    '&mdash; not limit it. We don&rsquo;t cut corners. We follow through. We build trust.</p>'
)

STORY_ZH = (
    '<p>在 EuniceMed，我們相信生活應該舒適而自在 —— 不需要妥協。因此我們用心打造超越功能的'
    '醫療支撐產品，在防護、舒適與照護上樹立新的標準。對醫療專業人員而言，我們的 '
    'All-in-One Premium Promise 代表臨床信賴的產品、以舒適為先的設計，以及好配合、'
    '耐得住的即時支援。對個人而言，它代表安心。</p>'
    '<p>每一件護具、每一道車縫、每一個決定，都是為了支撐動作，而不是限制它。'
    '我們不走捷徑，我們說到做到，我們建立信任。</p>'
)

MILESTONES = [
    ('2008', 'Company established — a vision takes root.', '公司成立 —— 一個願景就此扎根。'),
    ('2010', 'EuniceMed brand is born — establishing our identity.', 'EuniceMed 品牌誕生 —— 確立自己的身分。'),
    ('2016', 'Introducing AerGo — expanding our brand family.', 'AerGo 問世 —— 品牌家族再添一員。'),
    ('2021', 'Manufacturing expansion — scaling with purpose.', '產能擴充 —— 有目的地擴大規模。'),
    ('2025', 'Brand transformation — a new chapter begins.', '品牌轉型 —— 新的篇章展開。'),
]

POINTS = [
    ('Precision fit',
     'Premium Lycra for excellent elasticity, long-term durability and lasting compression efficacy.',
     '精準貼合', '採用優質 Lycra，彈性優異、耐久，壓力效果持久。'),
    ('Safe materials',
     'Oeko-Tex Standard 100 yarns — non-toxic and skin-friendly — and 100% medical-grade silicone.',
     '安心材質', 'Oeko-Tex Standard 100 認證紗線 —— 無毒、親膚 —— 以及 100% 醫療級矽膠。'),
    ('Comfort-first',
     'Soft-touch textures that stay comfortable through extended, everyday wear.',
     '舒適優先', '柔軟觸感的織面，長時間日常穿戴依然舒適。'),
]

# 標章文字取自 Certification 實體，此處只存引用（docs/09 §3）
CERTS = ['iso-13485', 'ce', 'oeko-tex-100', 'patented', 'mit']


def sections(locale):
    story_body = STORY_EN if locale == 'en' else STORY_ZH
    return {
        'hero': {'band': band} if band else None,
        'story': {
            'title': 'Our story & promise' if locale == 'en' else '我們的故事與承諾',
            'body': story_body,
            **({'portrait': portrait} if portrait else {}),
        },
        'milestones': {
            **({'background': milestone_bg} if milestone_bg else {}),
            'items': [{'year': y, 'event': (en if locale == 'en' else zh)}
                      for y, en, zh in MILESTONES],
        },
        # 兩張廠區照缺來源，只送 points
        'manufacturing': {
            'points': [{'title': (te if locale == 'en' else tz),
                        'body': (be if locale == 'en' else bz)}
                       for te, be, tz, bz in POINTS],
        },
        'certificates': {'items': [{'certification': c} for c in CERTS]},
    }


for locale in ('en', 'zh-TW'):
    print(f'\n── 寫入區段（{locale}）')
    for key, data in sections(locale).items():
        if data is None:
            print(f'  – {key:14} 略過（缺圖）')
            continue
        r = call('PUT', f'/admin/pages/about/sections/{key}',
                 {'locale': locale, 'data': data, 'syncInvariantFields': True})
        ok = r.get('success')
        print(f'  {"✓" if ok else "✗"} {key:14} {r.get("message", "")}'
              + ('' if ok else f' {r.get("errors")}'))
