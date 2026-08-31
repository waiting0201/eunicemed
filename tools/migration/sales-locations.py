"""
把 Where to Buy 頁的 6 個銷售據點灌進去（en + zh-TW）。

用法：
    EM_API=http://localhost:7071/api python3 tools/migration/sales-locations.py <token 檔>

⚠️ **除了三重的自家門市，其餘 5 筆是版型稿的示意資料，不是真的通路。**
舊站沒有這一頁，`mockup4/Where to Buy.dc.html` 是唯一的內容來源，而稿裡的
「Healthcare Pharmacy Group」「MediSupport GmbH」等等是設計稿寫的假名。
客戶的經銷清單一到（CLAUDE.md §7 待確認），直接在後台改掉即可。

**網址一律留空** —— mockup4 那 5 個「Visit website →」的 `href` 全是 `#`，
沒有東西可填。前台對 `websiteUrl` 是 null 就不渲染那一行（`where-to-buy/page.tsx`），
所以卡片會少一條連結，這是對的：寧可少一行，也不要編一個連得出去的假網址。

**版面文案不在這裡** —— 「Taiwan」「International distributors」兩個分組標題、
空狀態與頁尾 CTA 都寫在 `apps/web/app/[locale]/where-to-buy/page.tsx` 的 `COPY`
（docs/15）。這支只送資料列。

**語系與名稱**：台灣的通路給中文名（真實的台灣通路本來就以中文為正式名稱），
國際經銷維持拉丁文字的登記名稱不譯 —— 公司正式名稱屬於品牌符號，
是語言純度規則的例外（docs/08 §5.2）。會譯的是地區標籤與描述。

**業務鍵是「英文名稱 + 國別」** —— `SalesLocation` 沒有 slug，uuid 每台機器不同。
前台的卡片 key 用的也是這一組（`cardKey()`），同名同國即視為同一筆。
已存在的據點只補缺的語系，不覆蓋既有譯文。
"""
import json, os, sys, urllib.request

# 預設打正式站；本機用 EM_API=http://localhost:7071/api 覆寫
API = os.environ.get('EM_API', 'https://func-eunicemed-prod.azurewebsites.net/api')
TOKEN = open(sys.argv[1]).read().strip()

DOMESTIC, INTERNATIONAL = 1, 2   # Models/Entities/Content.cs 的 SalesLocationType


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{API}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        return json.load(e)


# 順序即 mockup4 的排列順序；sortOrder 在各自的 LocationType 內從 0 起算
# （公開端點是 ORDER BY LocationType, SortOrder, Name，見 ContentReadService）。
#
# `phone` 掛在據點本身（非翻譯），`address` / `regionLabel` / `note` 逐語系。
LOCATIONS = [
    # ── 台灣 ────────────────────────────────────────────────────────────────
    {
        'type': DOMESTIC, 'country': 'TW', 'sort': 0,
        'phone': '+886 2 8511 3758',
        'en': {'name': 'Comfort Plus Flagship',
               'address': '11F, No. 123-9, Xingde Rd, Sanchong Dist, New Taipei City'},
        'zh': {'name': '康得適旗艦門市',
               'address': '24158 新北市三重區興德路 123-9 號 11 樓'},
    },
    {
        'type': DOMESTIC, 'country': 'TW', 'sort': 1,
        # 「Selected branches nationwide」進 note 而不是 address ——
        # 它描述的是通路涵蓋範圍，不是一個可以導航過去的地址
        'en': {'name': 'Healthcare Pharmacy Group', 'note': 'Selected branches nationwide'},
        'zh': {'name': '健康連鎖藥局', 'note': '全台指定門市'},
    },
    {
        'type': DOMESTIC, 'country': 'TW', 'sort': 2,
        'en': {'name': 'Online medical store', 'note': 'Ships within Taiwan'},
        'zh': {'name': '網路醫材商城', 'note': '限台灣境內配送'},
    },

    # ── 國際經銷 ────────────────────────────────────────────────────────────
    # regionLabel 目前是自由字串（CLAUDE.md §7 待確認），未填者會被 API 集中到最後一組。
    # countryCode 依各家名稱推定：GmbH → DE、Pte → SG。
    {
        'type': INTERNATIONAL, 'country': 'DE', 'sort': 0,
        'en': {'name': 'MediSupport GmbH', 'region': 'Europe'},
        'zh': {'name': 'MediSupport GmbH', 'region': '歐洲'},
    },
    {
        'type': INTERNATIONAL, 'country': 'JP', 'sort': 1,
        'en': {'name': 'Kenko Distribution Co.', 'region': 'Japan'},
        'zh': {'name': 'Kenko Distribution Co.', 'region': '日本'},
    },
    {
        'type': INTERNATIONAL, 'country': 'SG', 'sort': 2,
        'en': {'name': 'Wellness Partners Pte', 'region': 'Southeast Asia'},
        'zh': {'name': 'Wellness Partners Pte', 'region': '東南亞'},
    },
]


def tr(side):
    """dict → SalesLocationTranslationInput，沒填的欄位不送。"""
    out = {'name': side['name']}
    for src, dst in (('address', 'address'), ('region', 'regionLabel'), ('note', 'note')):
        if side.get(src):
            out[dst] = side[src]
    return out


print('── 灌入 6 個據點')
existing = call('GET', '/admin/sales-locations').get('data') or []
by_key = {((l.get('translations') or {}).get('en', {}).get('name'), l.get('countryCode')): l
          for l in existing}

for loc in LOCATIONS:
    en, zh = loc['en'], loc['zh']
    row = by_key.get((en['name'], loc['country']))

    if row:
        # 只補缺的語系 —— 既有譯文可能已被客戶改過，不覆蓋
        have = row.get('translations') or {}
        missing = {}
        if not (have.get('en') or {}).get('name'):
            missing['en'] = tr(en)
        if not (have.get('zh-TW') or {}).get('name'):
            missing['zh-TW'] = tr(zh)

        if not missing:
            print(f'  = {en["name"]}：en / zh-TW 皆已有譯文')
            continue

        r = call('PATCH', f'/admin/sales-locations/{row["id"]}', {'translations': missing})
        ok = r.get('success')
        print(f'  {"✓" if ok else "✗"} {en["name"]}：補上 {"、".join(missing)}'
              + ('' if ok else f' {r.get("message")} {r.get("errors")}'))
        continue

    r = call('POST', '/admin/sales-locations', {
        'locationType': loc['type'],
        'countryCode': loc['country'],
        'sortOrder': loc['sort'],
        'status': 1,
        **({'phone': loc['phone']} if loc.get('phone') else {}),
        'translations': {'en': tr(en), 'zh-TW': tr(zh)},
    })
    ok = r.get('success')
    print(f'  {"✓" if ok else "✗"} {en["name"]}'
          + ('' if ok else f'：{r.get("message")} {r.get("errors")}'))
