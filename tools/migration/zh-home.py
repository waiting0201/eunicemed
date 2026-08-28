"""首頁 5 個區段的 zh-TW。譯自已上線的英文版，品牌標語保留英文（品牌符號例外）。"""
import json, sys, urllib.request

API = 'https://func-eunicemed-prod.azurewebsites.net/api'
TOKEN = open(sys.argv[1]).read().strip()

def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{API}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=90))
    except urllib.error.HTTPError as e:
        return json.load(e)

media = {s['sectionKey']: s for s in call('GET', '/admin/pages/home')['data']['sections']}
hero_img = (media['heroSlider']['translations'].get('en') or {}).get('slides', [{}])[0].get('image')
band_bg = (media['bodyPartBand']['translations'].get('en') or {}).get('background')

SECTIONS = {
    'heroSlider': {
        'slides': [{'image': hero_img, 'alt': 'EuniceMed — 支撐，是很個人的事',
                    'link': {'label': '', 'url': '/zh-TW/products'}}],
        'intervalSeconds': 6,
    },
    'featuredProducts': {
        'title': '精選產品',
        'allLink': {'label': '所有產品 →', 'url': '/zh-TW/products'},
        'promo': {'eyebrow': '完整型錄', 'title': '為每一種動作而生的支撐',
                  'link': {'label': '→', 'url': '/zh-TW/products'}},
    },
    'bodyPartBand': {
        'background': band_bg,
        'title': '依部位尋找支撐',
        'lead': '在人體圖上點選會痛或疲勞的部位，或直接瀏覽特殊照護需求的解決方案。',
        'cta': {'label': '瀏覽應用方案 →', 'url': '/zh-TW/applications'},
        'tiles': [
            {'icon': 'back', 'title': '背部與腰部', 'subtitle': '日常勞損與恢復期的腰部支撐',
             'link': {'label': '查看', 'url': '/zh-TW/applications/back'}},
            {'icon': 'knee', 'title': '膝關節', 'subtitle': '高負荷活動與復健期的穩定支撐',
             'link': {'label': '查看', 'url': '/zh-TW/applications/knee'}},
            {'icon': 'ankle-foot', 'title': '踝部與足部', 'subtitle': '保護、對位與矽膠足部照護',
             'link': {'label': '查看', 'url': '/zh-TW/applications/ankle'}},
            {'icon': 'special-care', 'title': '特殊照護', 'subtitle': '糖尿病、長途旅行與術後需求',
             'link': {'label': '查看', 'url': '/zh-TW/applications'}},
        ],
    },
    'whyPartner': {
        'title': '我們所做的每一件事，都以核心價值為本',
        'items': [
            {'title': '高標準，為舒適而生',
             'body': '每一件 EuniceMed 產品都從一個明確的目標開始：帶來真實的舒適與效能，不打折扣。'},
            {'title': '專注於智慧支撐',
             'body': '醫療彈性襪、矯型護具與 100% 醫療級矽膠足部照護，全數自主研發製造。'},
            {'title': '用心製作，有目的地交付',
             'body': '每一件產品都始於一個承諾：以精準製作的支撐，改善人們的生活。'},
            {'title': '全球佈局，在地承諾',
             'body': '與世界各地的醫療專業人員與經銷夥伴建立長期互信的關係。'},
        ],
        'cta': {'label': '成為合作夥伴', 'url': '/zh-TW/partnership'},
    },
    'latestNews': {
        'title': '最新消息',
        'allLink': {'label': '所有消息 →', 'url': '/zh-TW/news'},
    },
}

for key, data in SECTIONS.items():
    r = call('PUT', f'/admin/pages/home/sections/{key}', {'locale': 'zh-TW', 'data': data})
    print(f"  {key:18} {'✓' if r.get('success') else '✗'} {r.get('message','')}"
          + ('' if r.get('success') else f" {r.get('errors')}"))
