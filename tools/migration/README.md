# 舊站內容遷移腳本

一次性的搬運工具，把 <https://www.eunicemed.com>（Squarespace）的內容搬進本站。
**不是常態流程** —— 內容之後由後台維護。

| 腳本 | 內容 | 來源 |
|---|---|---|
| `home-sections.py` | 首頁 5 個區段的英文文案 | 舊站首頁逐字 + [docs/10](../../docs/10-legacy-content.md) §1 的 Company Profile |
| `legacy-news.py` | 10 篇最新消息 | 舊站 `/news-2/{slug}?format=json` |
| `mockup4-home.py` | 首頁 hero banner + 04 Trusted worldwide 的**假資料**（**只灌本機**）| `mockup4/Home.dc.html` |
| `mockup4-categories.py` | 三大分類的卡片圖（掛既有產品照，**只灌本機**）| `mockup4/Products.dc.html` |
| `about-content.py` | About 頁留在 CMS 的欄位與三張圖（en + zh-TW）| `mockup4/About.dc.html` + 新譯 |
| `partnership-content.py` | Partnership 頁留在 CMS 的四個區段與三張圖（en + zh-TW）| `mockup4/Partnership.dc.html` + 新譯 |
| `faq-content.py` | FAQ 頁的 3 個分類與 9 則問答（en + zh-TW）| `mockup4/FAQ.dc.html` + 新譯 |
| `privacy-content.py` | Privacy & Legal 頁的頁首 band 與條文（en + zh-TW）| `mockup4/Privacy.dc.html` + 新譯，**示意條文、非法務定稿** |
| `resources-downloads.py` | Resources 頁「Most requested documents」引用的三份文件（en + zh-TW）| 舊站 `/downloadpage01` + 新譯 |
| 產品 149 筆 | — | 用既有的 `POST /admin/products/import`，見下 |

## 用法

```bash
# 1. 取得正式站的 token
curl -s -X POST https://func-eunicemed-prod.azurewebsites.net/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@eunicemed.com","password":"…"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])" > /tmp/token

# 2. 首頁文案（直接打正式 API）
python3 tools/migration/home-sections.py /tmp/token

# 3. 新聞（需先抓好 /tmp/legacy-news.json，抓法見腳本註解）
python3 tools/migration/legacy-news.py /tmp/token https://func-eunicemed-prod.azurewebsites.net/api
```

灌本機時改打本機的 API（token 也要換成本機那組）：

```bash
curl -s -X POST http://localhost:7071/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"sa@system.local","password":"Admin@123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])" > /tmp/token-local

EM_API=http://localhost:7071/api python3 tools/migration/partnership-content.py /tmp/token-local
```

## 產品匯入的特別做法

`POST /admin/products/import` 讀的是**伺服器檔案系統**上的 `reference/legacy/products.json`，
而那個目錄不進版控、也不會部署。所以做法是**讓本機的 API 連正式資料庫**再呼叫該端點：

```bash
# 備份後把 Api/local.settings.json 的 ConnectionStrings:DefaultConnection 換成正式站的值
#（環境變數會被 local.settings.json 蓋掉，只能改檔案）
func start --port 7072
curl -X POST http://localhost:7072/api/admin/products/import -H "Authorization: Bearer $(cat /tmp/token)"
# 完成後**務必還原** local.settings.json
```

匯入器以 SKU 為業務鍵，可重複執行。匯入的產品一律是草稿，要另外發布。

## 已知缺口

- **圖片**：舊站首頁沒有 8:3 的 banner 素材，產品照也還沒搬 —— 目前正式站 0 筆媒體。
- **zh-TW**：舊站本身只有英文，所以中文站仍是空的。
- **Insights／Downloads**：舊站的 `/healthy-life`（8 篇）與 `/downloadpage01`（3 筆）尚未搬。
