"""
把 FAQ 頁的 9 則問答灌進去（en + zh-TW）。

用法：
    EM_API=http://localhost:7071/api python3 tools/migration/faq-content.py <token 檔>

英文逐字取自 `mockup4/FAQ.dc.html` 的 `data`（舊站沒有 FAQ 這一頁，
所以版型稿就是唯一的內容來源）；中文為新譯。

分類（use / sizing / order）本來就在庫裡，腳本只查 id；真的缺了才補建，
標籤同樣取自 mockup4 的 `cats`。

**業務鍵是英文問題** —— `Faq` 沒有 slug（它是折疊面板的一列，不是一個頁面，
見 docs/05 §3.7），而 uuid 每台機器都不一樣，所以先查再對，不寫死 id。
已存在的題目只補缺的語系（`PATCH` 只送缺的那一邊），不覆蓋既有譯文。

答案欄位吃的是 Section profile 的 rich text（p/strong/em/ul/ol/li/a），
前台直接 `dangerouslySetInnerHTML`，所以這裡送 `<p>…</p>` 而不是純文字。
"""
import json, os, sys, urllib.request

API = os.environ.get('EM_API', 'https://func-eunicemed-prod.azurewebsites.net/api')
TOKEN = open(sys.argv[1]).read().strip()


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{API}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        return json.load(e)


# slug → (英文標籤, 中文標籤)
CATEGORIES = [
    ('use',    'Product use',            '產品使用'),
    ('sizing', 'Sizing',                 '尺寸選擇'),
    ('order',  'Ordering & partnership', '訂購與合作'),
]

# (分類 slug, 英文問題, 英文答案, 中文問題, 中文答案)，順序即 mockup4 的排列順序
FAQS = [
    ('use',
     'How long can I wear a support each day?',
     'Most EuniceMed supports are designed for all-day comfort, but wear time depends on '
     'the product and your condition. Follow the guidance in the product manual, and '
     'consult a professional for post-operative use.',
     '護具每天可以配戴多久？',
     'EuniceMed 多數護具皆以全日舒適為前提設計，實際配戴時間仍取決於產品類型與個人狀況。'
     '請依產品說明書的建議配戴；術後使用請先諮詢專業人員。'),
    ('use',
     'How do I clean and care for my product?',
     'Hand wash in cool water (30°C) with mild detergent and air dry away from direct heat. '
     'Avoid tumble drying, ironing and bleach to preserve elasticity.',
     '產品該如何清潔與保養？',
     '請以 30°C 冷水搭配中性洗劑手洗，並在遠離熱源處自然陰乾。'
     '請勿烘乾、熨燙或使用漂白劑，以維持彈性。'),
    ('use',
     'Are the materials skin-friendly?',
     'Our textiles are Oeko-Tex verified and our footcare uses medical-grade silicone, '
     'selected for breathability and low irritation.',
     '材質對皮膚友善嗎？',
     '布料通過 Oeko-Tex 驗證，足部照護產品採用醫療級矽膠，'
     '皆以透氣性與低刺激性為選材標準。'),
    ('sizing',
     'How do I choose the right size?',
     "Measure the circumference at the point indicated in each product's size chart and "
     'match it to the S–XXL range. When between sizes, choose based on your desired '
     'support level.',
     '該如何挑選正確的尺寸？',
     '請依各產品尺寸表標示的位置量測周長，再對照 S–XXL 的級距。'
     '量測結果落在兩個尺寸之間時，依所需的支撐強度決定。'),
    ('sizing',
     "What if I'm between two sizes?",
     'For firmer support choose the smaller size; for lighter, all-day comfort choose the '
     "larger. The fitting guide in each product's Downloads has details.",
     '量測結果介於兩個尺寸之間怎麼辦？',
     '想要較紮實的支撐請選小一號；想要輕盈、可整日配戴的舒適感請選大一號。'
     '詳細說明見各產品「相關下載」中的配戴指南。'),
    ('sizing',
     'Do you offer One Size products?',
     'Some footcare and wrap products are One Size or come in S-M / L-XL ranges. This is '
     "shown in each product's Specifications & Sizes section.",
     '有單一尺寸的產品嗎？',
     '部分足部照護與纏繞式產品為單一尺寸，或提供 S-M／L-XL 兩種級距，'
     '實際規格標示於各產品的「規格與尺寸」區段。'),
    ('order',
     'Do you sell directly to consumers?',
     'EuniceMed is a brand and manufacturer; we sell through distribution and retail '
     'partners. Use Where to Buy to find a stockist, or Contact us for an inquiry.',
     '你們會直接販售給消費者嗎？',
     'EuniceMed 是品牌與製造商，透過經銷與零售夥伴銷售。'
     '請至「銷售據點」查詢鄰近通路，或透過「聯絡我們」提出詢問。'),
    ('order',
     'What is the minimum order quantity?',
     'MOQ varies by product and partnership type. Share your requirements through the '
     'Partnership inquiry form and our team will respond with details.',
     '最低訂購量是多少？',
     '最低訂購量依產品與合作型態而異。請透過「合作夥伴」的詢問表單提供需求，'
     '我們會回覆細節。'),
    ('order',
     'Can you produce custom OEM/ODM products?',
     'Yes. Our in-house team supports design, sampling, certification and scaled '
     'production. Start with the Partnership page.',
     '可以代工生產 OEM／ODM 產品嗎？',
     '可以。我們的內部團隊可支援設計、打樣、認證到量產，'
     '請從「合作夥伴」頁面開始洽談。'),
]


def tr(question, answer):
    return {'question': question, 'answer': f'<p>{answer}</p>'}


print('── 對齊三個分類')
cat_ids = {}
existing_cats = call('GET', '/admin/faq-categories').get('data') or []
by_slug = {c['slug']: c for c in existing_cats}

for i, (slug, en_label, zh_label) in enumerate(CATEGORIES):
    row = by_slug.get(slug)
    if row:
        cat_ids[slug] = row['id']
        print(f'  = {slug}：已存在')
        continue

    r = call('POST', '/admin/faq-categories', {
        'slug': slug, 'sortOrder': i, 'status': 1,
        'translations': {'en': {'name': en_label}, 'zh-TW': {'name': zh_label}},
    })
    if not r.get('success'):
        print(f'  ✗ {slug} 建立失敗：{r.get("message")} {r.get("errors")}')
        continue
    cat_ids[slug] = r['data']['id']
    print(f'  ✓ {slug} 已建立')

print('── 灌入 9 則問答')
existing = call('GET', '/admin/faqs').get('data') or []
by_question = {(f.get('translations') or {}).get('en', {}).get('question'): f for f in existing}

for i, (cat, en_q, en_a, zh_q, zh_a) in enumerate(FAQS):
    if cat not in cat_ids:
        print(f'  ✗ {en_q}：分類 {cat} 不在庫裡 —— 略過')
        continue

    row = by_question.get(en_q)
    if row:
        # 只補缺的語系 —— 既有譯文可能已被客戶改過，不覆蓋
        have = row.get('translations') or {}
        missing = {}
        if not (have.get('en') or {}).get('question'):
            missing['en'] = tr(en_q, en_a)
        if not (have.get('zh-TW') or {}).get('question'):
            missing['zh-TW'] = tr(zh_q, zh_a)

        if not missing:
            print(f'  = {en_q}：en / zh-TW 皆已有譯文')
            continue

        r = call('PATCH', f'/admin/faqs/{row["id"]}', {'translations': missing})
        ok = r.get('success')
        print(f'  {"✓" if ok else "✗"} {en_q}：補上 {"、".join(missing)}'
              + ('' if ok else f' {r.get("message")} {r.get("errors")}'))
        continue

    r = call('POST', '/admin/faqs', {
        'faqCategoryId': cat_ids[cat],
        'status': 1,
        'sortOrder': i,
        'translations': {'en': tr(en_q, en_a), 'zh-TW': tr(zh_q, zh_a)},
    })
    ok = r.get('success')
    print(f'  {"✓" if ok else "✗"} {en_q}'
          + ('' if ok else f'：{r.get("message")} {r.get("errors")}'))
