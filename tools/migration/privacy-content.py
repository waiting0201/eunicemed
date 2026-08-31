"""
把 Privacy & Legal 頁留在 CMS 的兩個區段灌進去（en + zh-TW）。

用法：
    EM_API=http://localhost:7071/api python3 tools/migration/privacy-content.py <token 檔>

⚠️ **這頁的條文是版型稿的示意文案，不是法務審過的內容。**
`mockup4/Privacy.dc.html` 的導言自己就寫著「This is placeholder legal copy for
design purposes.」，這裡逐字照搬（連同那句），中文為新譯 —— 留著那句是刻意的：
萬一在法務給稿之前就上了正式站，頁面會自己承認它是示意稿。
拿到正式條文後直接在後台覆蓋 `privacy.content.body` 即可，不必改這支腳本。

**只處理留在 CMS 的欄位。** eyebrow（`Privacy & Legal`）與 h1（`Privacy policy`）
與版型綁死，寫在 `apps/web/app/[locale]/privacy/page.tsx` 的 `COPY`（docs/15）；
「最後更新：」那個前綴也是，這裡只送日期本身。送多的欄位會撞
additionalProperties:false 而 400。

`body` 吃的是 **Legal profile** 的 rich text —— 比一般區段多了 h2/h3
（Services/HtmlSanitizers.cs），法務條文靠編號小節閱讀。連結只放行
https / mailto / 站內相對路徑，所以信箱用 `mailto:`（mockup4 那個 `<a>` 指向
Contact 頁，但錨點文字就是信箱，照 mailto 解讀）。

頁首 band 與 About 是**同一張圖**（兩頁的 mockup4 都用 `images/brand-pattern.jpg`），
所以這裡不重傳：以裁切後檔案的內容雜湊去比對既有 Media，比中就重用那一筆。
不能像別支腳本那樣用檔名前綴比 —— `01-hero-band-page-band-*` 目前有三種不同的圖，
比中哪一張全看誰先傳。而重傳同一個檔會踩到 CLAUDE.md §7 那個坑：
內容一樣 → blob 名一樣 → 多一列 Media 共用同一個 blob，刪任一列另一列就變破圖。
"""
import hashlib, json, os, subprocess, sys, urllib.request

# 預設打正式站；本機用 EM_API=http://localhost:7071/api 覆寫
API = os.environ.get('EM_API', 'https://func-eunicemed-prod.azurewebsites.net/api')
TOKEN = open(sys.argv[1]).read().strip()
SRC = 'mockup4/images'
OUT = 'mockup4/exports/privacy'   # 裁好的交付版本（隨時可重生）


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
    """已經傳過同樣內容就重用那一筆，否則上傳。

    伺服器存下的檔名是 `{slug 化的檔名}-{內容雜湊前 8 碼}.jpg`
    （`FileNames.ShortHash`＝SHA-256 前 8 碼，見 Services/ImageService.cs），
    所以雜湊在本機就算得出來，比對是精確的而不是猜的。
    """
    short = hashlib.sha256(open(path, 'rb').read()).hexdigest()[:8]
    hit = call('GET', f'/admin/media?presetKey={preset}&search={short}')
    data = hit.get('data')
    rows = data.get('items', []) if isinstance(data, dict) else (data or [])
    # 同一個檔可能已經有多列（CLAUDE.md §7），挑已經被引用的那一列，
    # 免得再多一個沒人用、卻與別人共用 blob 的孤兒
    rows = sorted((m for m in rows if isinstance(m, dict) and short in m.get('fileName', '')),
                  key=lambda m: -(m.get('usageCount') or 0))
    if rows:
        print(f'  = {os.path.basename(path)} 已在庫裡（{rows[0]["fileName"]}），重用 {rows[0]["id"]}')
        return rows[0]['id']

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
        print(f'  ✗ {os.path.basename(path)}: {out[:160]}')
        return None

    if not r.get('success'):
        print(f'  ✗ {os.path.basename(path)}: {r.get("message")} {r.get("errors")}')
        return None

    for w in (r.get('data') or {}).get('warnings') or []:
        print(f'    ⚠ {w}')
    print(f'  ✓ {os.path.basename(path)} → {r["data"]["id"]}')
    return r['data']['id']


print('── 頁首 band')
os.makedirs(OUT, exist_ok=True)
band_file = os.path.join(OUT, '01-hero-band__page-band.jpg')
# 錨點 center 與 PageBand.tsx 的 object-position 一致；先裁再傳（docs/11 §1、§4）
subprocess.run(
    [sys.executable, 'tools/crop-to-preset.py',
     os.path.join(SRC, 'brand-pattern-src.jpg'), band_file, 'page-band', 'center'],
    check=True)
band = find_or_upload(band_file, 'page-band', '')

# mockup4 頁首寫的是 "Last updated: 1 January 2026"。
# 這是 x-localeInvariant 的 date 欄位，顯示格式由前端 formatDate 依語系決定。
LAST_UPDATED = '2026-01-01'

# (英文標題, 英文內文, 中文標題, 中文內文)；導言沒有標題，用 None
SECTIONS = [
    (None,
     'Comfort Plus Corporation ("EuniceMed", "we") respects your privacy. This policy '
     'explains what information we collect through this website and how we use it. '
     'This is placeholder legal copy for design purposes.',
     None,
     '康得適股份有限公司（以下稱「EuniceMed」、「我們」）尊重您的隱私。'
     '本政策說明我們透過本網站蒐集哪些資訊，以及如何使用這些資訊。'
     '本文為版型設計用的示意條文。'),

    ('1. Information we collect',
     'When you submit an inquiry, partnership request or contact form, we collect the '
     'information you provide — such as your name, company, email address, country and '
     'message. We may also collect anonymous usage data to improve the website.',
     '一、我們蒐集哪些資訊',
     '當您送出詢問、合作申請或聯絡表單時，我們會蒐集您所提供的資訊 —— '
     '例如姓名、公司、電子郵件地址、國家與訊息內容。'
     '我們也可能蒐集匿名的使用行為資料，用以改善本網站。'),

    ('2. How we use your information',
     'We use your information to respond to inquiries, provide product and partnership '
     'support, and — where you have consented — to send relevant updates. We do not sell '
     'your personal data.',
     '二、我們如何使用您的資訊',
     '我們使用您的資訊回覆詢問、提供產品與合作上的支援，並在取得您同意的前提下，'
     '寄送相關的最新消息。我們不會販售您的個人資料。'),

    ('3. Cookies',
     'This website uses essential cookies for functionality and, subject to your consent, '
     'analytics cookies to understand how the site is used. You can manage cookies through '
     'your browser settings.',
     '三、Cookie',
     '本網站使用維持功能運作所必要的 cookie；在取得您同意的前提下，'
     '另使用分析用 cookie 以了解網站的使用情形。您可以透過瀏覽器設定管理 cookie。'),

    ('4. Data retention & security',
     'We retain personal data only as long as necessary for the purposes described, and '
     'apply appropriate technical and organisational measures to protect it.',
     '四、資料保存與安全',
     '我們僅在前述目的所需的期間內保存個人資料，並採取適當的技術與組織措施加以保護。'),

    ('5. Your rights',
     'You may request access to, correction of, or deletion of your personal data. To '
     'exercise these rights, contact us using the details below.',
     '五、您的權利',
     '您可以請求查閱、更正或刪除您的個人資料。'
     '欲行使上述權利，請利用下方的聯絡方式與我們聯繫。'),

    ('6. Contact',
     'For any privacy questions, email '
     '<a href="mailto:service@comfortplus-medical.com">service@comfortplus-medical.com</a> '
     'or write to 11F, No. 123-9, Xingde Rd, Sanchong Dist, New Taipei City 24158, Taiwan.',
     '六、聯絡我們',
     '如有任何隱私權相關問題，請來信 '
     '<a href="mailto:service@comfortplus-medical.com">service@comfortplus-medical.com</a>，'
     '或郵寄至 24158 新北市三重區興德路 123-9 號 11 樓。'),
]


def body(locale):
    en = locale == 'en'
    html = []
    for en_h, en_p, zh_h, zh_p in SECTIONS:
        heading = en_h if en else zh_h
        if heading:
            html.append(f'<h2>{heading}</h2>')
        html.append(f'<p>{en_p if en else zh_p}</p>')
    return ''.join(html)


for locale in ('en', 'zh-TW'):
    print(f'\n── 寫入區段（{locale}）')
    sections = {
        'hero': {'band': band} if band else None,
        'content': {'lastUpdated': LAST_UPDATED, 'body': body(locale)},
    }
    for key, data in sections.items():
        if data is None:
            print(f'  – {key:8} 略過（缺圖）')
            continue
        r = call('PUT', f'/admin/pages/privacy/sections/{key}',
                 {'locale': locale, 'data': data, 'syncInvariantFields': True})
        ok = r.get('success')
        print(f'  {"✓" if ok else "✗"} {key:8} {r.get("message", "")}'
              + ('' if ok else f' {r.get("errors")}'))
