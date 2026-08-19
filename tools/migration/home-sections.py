"""
把舊站 www.eunicemed.com 的首頁文案填進正式站。

原則：**只填舊站或 docs/10 真的存在的品牌文案**。
版型上的欄位（區段標題、按鈕文字）用 mockup4 的標籤，那是版型不是內容；
舊站沒有對應內容的區段（testimonial）就不填 —— 語言純度會讓它整段不顯示，
那比放一段我們編出來的客戶推薦好。
"""
import json, sys, urllib.request

BASE = 'https://func-eunicemed-prod.azurewebsites.net/api'
TOKEN = open(sys.argv[1]).read().strip()

def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{BASE}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=60))
    except urllib.error.HTTPError as e:
        return json.load(e)

# ── 內容 ────────────────────────────────────────────────────────────
# 來源標註：[舊站] = www.eunicemed.com 首頁逐字；[PDF] = docs/10 §1 的 Company Profile
SECTIONS = {
    'heroIntro': {
        'eyebrow': 'Not Just a Motion',                      # [舊站] 品牌標語
        'title': 'Support Feels Personal.',                   # [PDF] 主標語
        # [舊站] 首頁品牌宣言逐字
        'lead': ('At EuniceMed, we believe the true spirit of motion is about more than '
                 'just movement — it’s about enhancing your quality of life.'),
    },
    'featuredProducts': {
        'title': 'Hero products',
        'allLink': {'label': 'All products →', 'url': '/en/products'},
        'promo': {
            'eyebrow': 'Full catalogue',
            'title': 'Supports for every motion',
            'link': {'label': '→', 'url': '/en/products'},
        },
    },
    'bodyPartBand': {
        'title': 'Find support by body part',
        # [舊站] 產品線說明改寫為導覽用的一句，語意不變
        'lead': ('Tap where it hurts or tires on the interactive body map, or browse '
                 'solutions for special care needs.'),
        'cta': {'label': 'Explore applications →', 'url': '/en/applications'},
        'tiles': [
            {'icon': 'back', 'title': 'Back & Waist',
             'subtitle': 'Lumbar support for daily strain and recovery',
             'link': {'label': 'View', 'url': '/en/applications/back'}},
            {'icon': 'knee', 'title': 'Knee',
             'subtitle': 'Stability for high-load activity and rehabilitation',
             'link': {'label': 'View', 'url': '/en/applications/knee'}},
            {'icon': 'ankle-foot', 'title': 'Ankle & Foot',
             'subtitle': 'Protection, alignment and silicone footcare',
             'link': {'label': 'View', 'url': '/en/applications/ankle'}},
            {'icon': 'special-care', 'title': 'Special care',
             'subtitle': 'Diabetic, travel and post-operative needs',
             'link': {'label': 'View', 'url': '/en/applications'}},
        ],
    },
    'whyPartner': {
        # [PDF] 核心價值
        'title': 'Everything we do is underpinned by our core values',
        'items': [
            {'title': 'Premium Standards. Engineered For Comfort.',   # [PDF] verbatim
             'body': ('Every EuniceMed product begins with a clear goal: deliver real comfort '
                      'and performance — without compromise.')},
            {'title': 'Specialists In Smart Support.',                 # [PDF] verbatim
             'body': ('Medical compression stockings, orthopedic supports and 100% medical-grade '
                      'silicone footcare, engineered in-house.')},
            {'title': 'Crafted With Care. Delivered With Purpose.',    # [PDF] verbatim
             'body': ('Every product begins with a promise: precision-crafted support that '
                      'improves lives.')},
            {'title': 'Global Reach. Local Commitment.',               # [PDF] verbatim
             'body': ('Building trusted relationships with healthcare professionals and '
                      'distributors around the world.')},
        ],
        'cta': {'label': 'Become a partner', 'url': '/en/partnership'},
    },
    'latestNews': {
        'title': 'Latest news',
        'allLink': {'label': 'All news →', 'url': '/en/news'},
    },
}

for key, data in SECTIONS.items():
    r = call('PUT', f'/admin/pages/home/sections/{key}',
             {'locale': 'en', 'data': data})
    ok = r.get('success')
    print(f"  {key:18} {'✓' if ok else '✗'} {r.get('message','')}"
          + ('' if ok else f" {r.get('errors')}"))
