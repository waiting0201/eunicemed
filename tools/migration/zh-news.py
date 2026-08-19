"""
10 篇最新消息的 zh-TW。

這些是台灣品牌自己發的贊助與展會消息，人名／校名／賽事名一律用中文原名
（Masaho 是日本選手，維持羅馬字），品牌 EuniceMed® 與 Comfort Plus 保留英文。
內文長度不一，最長那篇（LiHu 的成績報告）舊站本身就是逐條名次，這裡照原意譯出摘要段落。
"""
import json, os, sys, urllib.request

API = 'https://func-eunicemed-prod.azurewebsites.net/api'

def login():
    b = json.dumps({'email': os.environ['ADMIN_EMAIL'],
                    'password': os.environ['ADMIN_PASSWORD']}).encode()
    r = urllib.request.Request(f'{API}/auth/login', data=b, method='POST',
                               headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r, timeout=60))['data']['accessToken']

TOKEN = login()

def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{API}{path}', data=data, method=method,
                                 headers={'Authorization': f'Bearer {TOKEN}',
                                          'Content-Type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        if e.code == 401:
            globals()['TOKEN'] = login()
            return call(method, path, body)
        return json.load(e)

ZH = {
 'join-us-at-health-amp-rehab-2025': {
   'title': '誠摯邀請您蒞臨 Health & Rehab 2025',
   'body': '<p>誠摯邀請您參觀我們在 Health &amp; Rehab 2025 的展出。現場將介紹最新的防護技術，也期待與您開啟新的合作機會。</p>'},
 '2026-nagoya-asian-games-phase-1-round-2-archery-training-team-selection-tournament':
  {'title': '2026 名古屋亞運：射箭培訓隊第一階段第二輪選拔賽',
   'body': '<p>我們贊助的選手 Masaho，在極寒天候下與一般選手同場競技，爭取 2026 名古屋亞運的參賽資格。在如此嚴苛的條件下維持 144 支箭的穩定表現是極大的挑戰，也證明了身心障礙運動員同樣能達到頂尖水準。</p>'},
 'taipei-municipal-chenggong-high-school-advances-to-the-hbl-top-12-playoffs':
  {'title': '臺北市立成功高中挺進 HBL 十二強',
   'body': '<p>長期合作的成功高中再次以投入與毅力挺進 HBL 複賽，持續向更高的目標前進。這群學生在課業與運動場上同樣出色，付出的努力換來亮眼成績。EuniceMed 很榮幸能一路陪伴他們。</p>'},
 'lihu-elementary-school-has-once-again-achieved-outstanding-results-this-year':
  {'title': '溪湖國小今年再度繳出亮眼成績',
   'body': '<p>113 學年度全國有氧體操錦標賽成績報告。</p>'
           '<p>首先要感謝辛勤付出的教練團隊，也為所有選手的努力與成績獻上熱烈掌聲。</p>'
           '<p>個人與團體項目皆有斬獲，低年級至高年級各組均展現扎實的訓練成果。EuniceMed 持續為這些年輕選手提供安全的防護與支撐。</p>'},
 'we-hope-to-see-you-at-the-rehacare-exhibition':
  {'title': '期待在 REHACARE 展會與您相見'},
 'the-chenggong-high-school-is-currently-undergoing-an-intensive-summer-training-program':
  {'title': '成功高中正進行暑期密集訓練',
   'body': '<p>成功高中的選手在課業與運動場上同樣傑出。EuniceMed 為這群年輕人提供安全的防護與支撐。</p>'},
 'we-sincerely-invite-you-to-visit-our-booth-at-medical-fair-asia-2024':
  {'title': '誠摯邀請您蒞臨 Medical Fair Asia 2024 攤位'},
 'congratulations-to-masaho-for-achieving-great-results-in-archery':
  {'title': '恭喜 Masaho 於射箭賽事締造佳績',
   'body': '<p>Masaho 是 EuniceMed® 贊助的選手。恭喜他在 2024 年身心障礙者全國射箭錦標賽 Bit Cup 奪得亞軍。他的拚戰精神正呼應 EuniceMed® 的核心理念 —— 始終支持每一位為傷痛所困的人。</p>'},
 'congrats-on-great-goals-in-9th-aerobic-gymnastics-asian-championships':
  {'title': '恭賀第 9 屆亞洲有氧體操錦標賽再傳捷報',
   'body': '<p>在越南河內舉行的第 9 屆亞洲有氧體操錦標賽中，台灣代表隊再傳捷報，共奪下 1 金 1 銀 1 銅。其中就讀臺北市立麗山國中的王霏筑，於女子 12–14 歲組單人項目奪冠。</p>'},
 'suzuki-world-cup-struck-gold':
  {'title': 'Suzuki 世界盃奪金',
   'body': '<p>恭喜！由康得適（Comfort Plus Corporation，品牌 EuniceMed®）贊助的中華隊選手闕梓誠，在 2024 年有氧體操 FIG Suzuki 世界盃第一年齡組奪下金牌。我們由衷為他高興，也期待他未來有更精彩的表現。</p>'},
}

arts = call('GET', '/admin/articles?pageSize=50')['data']['items']
done = skipped = 0
for a in arts:
    zh = ZH.get(a['slug'])
    if not zh:
        skipped += 1
        continue
    d = call('GET', f"/admin/articles/{a['id']}")['data']
    r = call('PUT', f"/admin/articles/{a['id']}", {
        'translations': {'zh-TW': zh},
        'rowVersion': d['rowVersion'],
    })
    print(f"  {'✓' if r.get('success') else '✗'} {zh['title'][:40]}"
          + ('' if r.get('success') else f" {r.get('message')} {r.get('errors')}"))
    done += r.get('success', False)

print(f'\n完成 {done}、沒有譯稿 {skipped}')
