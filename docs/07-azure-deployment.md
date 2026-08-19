# 07 · Azure 部署與維運

> 上層導覽見 [CLAUDE.md](../CLAUDE.md)。架構見 [01-architecture.md](01-architecture.md)。

**方案定案（精簡版）**：全站只用 **4 個 Azure 資源**，且只有 **一套 prod 環境**。不使用 Front Door / CDN、Key Vault、Application Insights、Communication Services、Container Registry、Entra ID。

---

## 1. Azure 資源清單

| # | 資源 | SKU/設定 | 用途 |
|---|------|----------|------|
| 1 | **Azure Static Web Apps** | **Free** | Next.js 公開網站（hybrid **純 SSR**，preview）+ `/admin` CMS 後台，同一個 app |
| 2 | **Azure Function App** | **Flex Consumption**（Linux，.NET 10 isolated） | API `/api/v1/*` |
| 3 | **Azure Storage（Blob）** | StorageV2、Hot、LRS | 媒體（圖片/PDF）＋ Function App 部署包與 host metadata |
| 4 | **Azure SQL Database** | **由品牌方／客戶提供** | 資料庫（本專案不建立、不管理此資源） |
| 5 | **Log Analytics workspace** | PerGB2018、保留 30 天 | workspace-based App Insights 的必要載體（classic 已退役） |
| 6 | **Application Insights** | workspace-based | **Flex Consumption 的必要條件**（見下），同時是本方案唯一的可觀測性來源 |

> ⚠️ **5 與 6 原本被排除，2026-08-19 因實測加回。**
> 沒有 `APPLICATIONINSIGHTS_CONNECTION_STRING` 的 Flex Consumption app **起不來**：
> host 對每個請求回 500、trigger 同步失敗，而且因為它就是記錄管線，
> 所以沒有任何錯誤訊息可查。這一點在同訂用帳戶的四個正常 Flex app 上都得到印證。
>
> 除此之外，任何新需求若需要額外 Azure 資源，仍必須先回頭確認。

### 1.1 一個 Storage Account 的容器切分

Flex Consumption **必須**有一個 Storage Account 存放部署包與 host metadata，因此媒體與部署共用同一個帳戶、以容器區隔：

| 容器 | 存取層級 | 內容 |
|------|----------|------|
| `media` | **匿名讀取（Blob）** | 圖片、PDF；瀏覽器直接讀取 |
| `deployment-package` | 私有 | Function App 部署 zip（`AzureWebJobsStorage` / 部署設定指向） |
| `azure-webjobs-*`（自動建立） | 私有 | Functions host 內部使用 |

- 媒體檔名採內容雜湊 → 上傳時一併寫入 `Cache-Control: public, max-age=31536000, immutable`。
- 上傳走 API 代傳（圖片，SkiaSharp 縮圖）或 SAS 直傳（PDF），見 [11-media-specs.md](11-media-specs.md)。

---

## 2. 拓樸

```
                    ┌──────────────────────────────────────┐
  訪客 ───────────► │ Static Web Apps (Free)               │
                    │  www.eunicemed.com                   │
                    │  ├─ Next.js SSR（managed backend）    │
                    │  └─ /admin  React SPA（client-side）  │
                    └───────────┬──────────────┬───────────┘
                                │ SSR fetch    │ 瀏覽器 XHR（CORS）
                                ▼              ▼
                    ┌────────────────────────────────────┐
                    │ Function App (Flex Consumption)    │
                    │  func-eunicemed-prod.azurewebsites │
                    └────────┬──────────────────┬────────┘
                             │ Managed Identity │ Managed Identity
                             ▼                  ▼
                  ┌────────────────┐   ┌──────────────────┐
                  │ Azure SQL      │   │ Storage (Blob)   │
                  │ （客戶提供）    │   │ media / 部署包    │
                  └────────────────┘   └──────────────────┘
                                              │ 匿名讀取
  訪客圖片請求 ───────────────────────────────┘
```

要點：

- **前台圖片不經過 SWA**：`<img>` / `next/image` 直接指向 `https://{account}.blob.core.windows.net/media/...`，避免消耗 SWA Free 的 100GB/月頻寬（見 §7.3）。
- **API 不綁自訂網域**：直接用 `*.azurewebsites.net` 預設主機名（Flex Consumption 的受管憑證仍是 preview，不值得冒險）。網域只出現在 SSR 端與 admin 的 XHR，對訪客不可見。
- **Managed Identity**：Function App 以系統指派的 MI 存取 Blob 與 SQL，盡量不存連線字串。

---

## 3. 環境

**只有 prod 一套雲端資源。**

| 用途 | 做法 |
|------|------|
| 本機開發 | `next dev` + `func start`（Azurite 或直連 dev container）；DB 用本機 SQL Server container 或客戶提供的 dev DB |
| PR 預覽 | SWA 內建 **preview environment**（Free 上限 3 個，且**所有環境合計 ≤ 500MB**，見 §7.1）；預覽環境指向同一個 prod Function App |
| 正式 | `main` 分支 → 手動核准 → 部署 prod |

> 沒有雲端 dev/staging 環境。這代表 **DB 遷移沒有預演環境**，且遷移是在 Function App 啟動時自動套用（§5.1）——必須靠「擴張→遷移→收縮」的拆解紀律與事前確認 PITR 還原點把關。

---

## 4. 基礎設施即程式碼（IaC）

- **Bicep**（`infra/`）：`main.bicep` + `prod.bicepparam`，只建立 SWA、Function App（含 Flex Consumption plan）、Storage Account、以及 MI 的角色指派。
- 機密（`jwtSigningKey`、`sqlConnectionString`）是 `@secure()` 參數，由環境變數帶入，**不進 bicepparam**。
- **Azure SQL 由客戶提供**，Bicep 內以 `existing` 參照或純粹以參數帶入連線資訊，**不建立、不刪除**。
- 資源群組 **`EuniceMedUS`**，區域 **West US 2**（`westus2`）。

```bash
az group create -n EuniceMedUS -l westus2

# 先確認 Flex Consumption 在該區域可用（可用區域比一般 App Service 少）
az functionapp list-flexconsumption-locations -o table

az deployment group create -g EuniceMedUS \
  -f infra/main.bicep -p infra/prod.bicepparam \
  -p jwtSigningKey="$(openssl rand -base64 48)" \
  -p sqlConnectionString="$SQL_CONNECTION_STRING"
```
- 命名：`stapp-eunicemed-prod`、`func-eunicemed-prod`、`st eunicemedprod`（Storage 不可有連字號）。

---

## 5. CI/CD（GitHub Actions）

`.github/workflows/`：

| Workflow | 觸發 | 步驟 |
|----------|------|------|
| `web.yml` | `apps/**` 變更 | pnpm install → lint → build admin SPA（產物直接落在 `apps/web/public/admin`）→ `next build`（standalone，`postbuild` 內含 250MB gate）→ `Azure/static-web-apps-deploy`（`skip_app_build: true`）<br>PR 關閉時一併關掉預覽環境 —— 不關會佔著 Free 的 3 個名額與 500MB 合計上限 |
| `api-deploy.yml` | `Api/` 變更 | `dotnet build --warnaserror` → `dotnet publish` → `azure/login@v2`（OIDC）→ `Azure/functions-action@v1` → **健康檢查輪詢 5 分鐘**<br>最後那一步是必要的：migration 在啟動時套用，失敗的話 app 起不來，而 functions-action 本身不會發現 |
| `infra.yml` | `infra/` 變更 | PR：`az deployment group what-if`（唯一能在動到正式資源前看到差異的機會）<br>main：what-if → 人工核准（`environment: prod`）→ `az deployment group create` |

`api-deploy.yml` 整支照抄 Jabez 的版本，只是本案沒有 staging 分支所以不需要 branch → app-name 三元式：

```yaml
permissions:
  id-token: write        # OIDC 取得 federated token 用
  contents: read
# Flex Consumption 不支援 publish profile，必須用 OIDC 聯合身分（免長期密鑰）
```
需要的 GitHub secrets：`AZURE_CLIENT_ID`、`AZURE_TENANT_ID`、`AZURE_SUBSCRIPTION_ID`、
`AZURE_STATIC_WEB_APPS_API_TOKEN`、`JWT_SIGNING_KEY`、`SQL_CONNECTION_STRING`。
需要的 GitHub variables（build-time，非機密）：`API_BASE`、`NEXT_PUBLIC_API_BASE`、
`NEXT_PUBLIC_MEDIA_BASE`、`NEXT_PUBLIC_SITE_URL`。

`api-deploy.yml` 與 `infra.yml` 都掛在 `environment: prod` 上，需在 GitHub repo 設定裡
建立該環境並加上必要的審核者 —— **人工核准是這個方案唯一的部署閘門**（沒有 staging、沒有 slot）。

### 5.1 DB 遷移：**在 Function App 啟動時自動套用**

**CI 完全不碰資料庫。** `Api/Program.cs` 在 `host.Build()` 之後、`host.RunAsync()` 之前執行 `await db.Database.MigrateAsync()`，隨後跑 PageSection 同步器。與 Jabez 一致（該專案已用 119 支 migration 在 Flex Consumption 上驗證可行）。

這個選擇的好處是繞開了「客戶的 SQL 防火牆能不能讓 GitHub runner 進來」這個未知數 —— Function App 本來就在 Azure 內、本來就有連線。

**代價與必要的紀律**：

- Flex Consumption 的 app init 是 **30 秒硬上限、不可調整**，而且**沒有 deployment slot 可退**。migration 逾時 = 正式站整個起不來。
- 破壞性變更一律「擴張 → 遷移 → 收縮」拆三支 PR。
- 大型資料回填不要放進 migration，改走 `POST /admin/maintenance/*` 維護端點。
- 部署前確認客戶 DB 的 PITR 還原點；出事就是還原，沒有第二條路。
- schema 長大後定期實測冷啟動耗時並記錄。

部署順序因此簡化為：**API（啟動時自動遷移）→ 前端**。

### 5.2 沒有 deployment slot

Flex Consumption **不支援 deployment slot**。API 部署即為就地更新（rolling update，零停機仍在 preview）。因此：

- API 變更需向下相容一個版本（前端可能短暫跑舊版）。
- 出問題以「重新部署上一個 commit 的產物」回滾，不是切 slot。

---

## 6. 設定與機密（無 Key Vault）

機密一律放 **App Settings**（Azure 平台已加密儲存）與 **GitHub Actions Secrets**，**不得**進 repo。

### 6.1 Function App 應用程式設定

| 設定 | 值／來源 | 備註 |
|------|----------|------|
| `ConnectionStrings__DefaultConnection` | 客戶提供 | **優先改用 Managed Identity**（`Authentication=Active Directory Default`），則此設定不含密碼 |
| `Jwt__Secret` | 隨機 32+ bytes | 後台 JWT 簽章；輪替時需讓既有 token 失效 |
| `Storage__AccountName` | `steunicemedprod` | 搭配 MI，不存金鑰 |
| `Storage__MediaContainer` | `media` | |
| `Smtp__Host` / `Smtp__Port` / `Smtp__User` / `Smtp__Password` | 品牌方提供 | 聯絡表單通知信（見 §6.3） |
| `Smtp__From` / `Smtp__To` | `service@comfortplus-medical.com` | |
| `Recaptcha__SecretKey` | Google | 表單防機器人 |
| `Cors__AllowedOrigins` | `https://www.eunicemed.com` | 給 `/admin` 的瀏覽器 XHR 用 |

### 6.2 Managed Identity 設定（取代 Key Vault 的關鍵）

- Storage：授予 Function App MI 四個角色，**範圍是整個帳戶**（`infra/main.bicep` 已寫好）：
  | 角色 | 為什麼需要 |
  |---|---|
  | Storage Blob Data Owner | 媒體讀寫，以及 Flex Consumption 自己的部署包容器 |
  | Storage Blob **Delegator** | 簽 user delegation SAS（PDF 直傳）。**Data Owner 不含這個動作** —— 少了它，圖片一切正常但 PDF 上傳只在正式站失敗 |
  | Storage Queue / Table Data Contributor | Functions host 的內部狀態 |

  > 原本規劃「限 `media` 容器」，但同一個帳戶還放著部署包與 host metadata
  > （§1.1，方案只允許 4 個資源所以不能分兩個帳戶），容器層級的授權會讓 Function App 起不來。
- SQL：在客戶的 SQL Server 設定 Entra 管理員後執行
  `CREATE USER [func-eunicemed-prod] FROM EXTERNAL PROVIDER;` 並授 `db_datareader` / `db_datawriter` / `EXECUTE`。
  **若客戶只願提供 SQL 帳密**，則退回連線字串放 App Settings，並使用非 `sa` 的最小權限帳號。

### 6.3 寄信：SMTP

無 Azure Communication Services，聯絡表單以 **品牌方既有信箱的 SMTP** 寄送（`MailKit`）。注意：

- SMTP 送信失敗**不得**讓 `POST /contact` 回錯 —— 先寫 `ContactSubmission` 入庫，寄信失敗只記 log，避免訪客重複送出。
- 寄件網域需有 SPF（必要時 DKIM），否則通知信易進垃圾桶。
- 若客戶信箱有每日寄送量限制，需在 API 端加簡易速率限制（見 §7.4）。

### 6.4 SWA / Next.js 環境變數

| 變數 | 值 |
|------|-----|
| `API_BASE`（server-only） | `https://func-eunicemed-prod.azurewebsites.net/api/v1` |
| `NEXT_PUBLIC_API_BASE` | 同上（`/admin` SPA 用） |
| `NEXT_PUBLIC_MEDIA_BASE` | `https://steunicemedprod.blob.core.windows.net/media` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.eunicemed.com` |

> SWA 的環境變數需**同時**設在 GitHub Actions build step（build-time）與 SWA 資源的 Environment variables（request-time）。

---

## 7. 網域、HTTPS 與 Free 方案的硬限制

### 7.1 SWA Free 配額（實測自官方 quota 表）

| 項目 | Free 上限 | 對本專案的影響 |
|------|-----------|----------------|
| 頻寬 | **100 GB/月**（**不能加購**，超出即中斷） | 圖片必須走 Blob 直連，否則極易超標 |
| 單一環境大小 | **250 MB** | `output: 'standalone'` 為**必須**；CI 需 gate 檢查 |
| 全部環境合計 | **500 MB** | 實質上只夠 prod + 1 個預覽環境 |
| 檔案數 | 15,000 | 產品圖若誤放進 repo 會爆 |
| 自訂網域 | **2 個** | 剛好 `www.eunicemed.com` + apex `eunicemed.com`（301 轉 www） |
| 預覽環境 | 3 個 | 受 500MB 合計限制 |
| IP 限制 | **不支援** | `/admin` 無法用平台層 IP 白名單，只能靠 JWT（見 §7.4） |
| 私人端點 | 不支援 | — |
| SLA | **無** | 需向客戶說明：Free 方案不帶 SLA |

### 7.2 hybrid Next.js 的已知限制與踩雷點

- **不可使用 SWA linked API**（hybrid 不支援）；API 為獨立 Function App，以 HTTP 呼叫。
- **`public/.swa/health.html` 必須自備**：SWA 只在它自己執行 build 時注入該頁，
  而本案用 `skip_app_build`。缺這一頁的症狀是部署最後回
  `Web app warm up timed out`，且不會提到健康檢查。
- **`outputFileTracingRoot` 必須釘在 `apps/web`**：否則 pnpm workspace 會把 standalone
  產物放到 `.next/standalone/apps/web/`，SWA 找不到 `server.js`，同樣以 warm up timeout 收場。
- **不使用 ISR**（image caching 不支援）。
- `staticwebapp.config.json` 的 **navigation fallback 不支援**；所有 rewrite/redirect 一律寫在 `next.config.js`。
- **健康檢查路徑 `/.swa/health.html` 必須放行**。本站有 locale 前綴 middleware（`/` → `/en`），**務必**在 middleware matcher 與 redirects/rewrites 排除 `.swa` 開頭路徑，否則部署驗證會失敗：
  ```js
  export const config = { matcher: ['/((?!.swa).*)'] }
  ```
- SWA CLI 的本機模擬／部署對 hybrid 不支援 → 本機開發直接用 `next dev`。
- hybrid 仍為 **preview** 功能，正式上線前需驗證產物大小、冷啟動與相容性。

### 7.3 沒有 CDN 的後果與對策

| 問題 | 對策 |
|------|------|
| 媒體無邊緣快取 | Blob 匿名讀取 + 長 `Cache-Control`（檔名帶雜湊），由瀏覽器／中間快取吸收 |
| `next/image` 優化會把圖片流量拉回 SWA | 使用 **custom loader** 或 `unoptimized`，直接指向上傳時已依 preset 產生的尺寸變體（見 [11-media-specs.md](11-media-specs.md)），讓圖片位元組由 Blob 出，不計入 SWA 100GB |
| SSR 無邊緣快取吸收尖峰 | 於 SSR 回應與 API 回應加 `Cache-Control: public, s-maxage=...`（給瀏覽器／代理），並確保 DB 查詢有索引；必要時在 API 內加記憶體快取 |
| 無 WAF | 見 §7.4 |

### 7.4 沒有 WAF／IP 限制的補償

- `POST /contact`：reCAPTCHA + honeypot + **API 內自製 token bucket 速率限制**（以 IP + 時間窗）。
- `/admin`：JWT 短效 + refresh 輪替；登入端點加登入失敗次數鎖定；後台路由在前端與 API 兩端都驗角色。
- 安全標頭（CSP、HSTS、X-Content-Type-Options、Referrer-Policy）由 **Next.js `headers()`** 輸出，而非 Front Door。
- CORS：Function App 只允許 `https://www.eunicemed.com`。

### 7.5 網域與憑證

- `www.eunicemed.com` → SWA 自訂網域（CNAME）+ **SWA 免費受管憑證**。
- `eunicemed.com`（apex）→ SWA 自訂網域（Azure DNS ALIAS 或 TXT 驗證），於 `next.config.js` 301 轉 `www`。
- API 用 `func-eunicemed-prod.azurewebsites.net` 預設憑證，**不綁自訂網域**。

---

## 8. 監控（無 Application Insights）

明確取捨：**沒有分散式追蹤、沒有例外堆疊長期保留、沒有可用性測試**。可用的是：

| 來源 | 用途 |
|------|------|
| Function App **Log stream / Diagnose and solve problems** | 即時查錯（不留存） |
| **Azure Monitor 平台指標**（免額外資源） | Function 執行數、失敗數、HTTP 5xx、回應時間；可設定 metric alert 寄信 |
| SWA 內建 Metrics | 請求數、頻寬（**務必**盯著 100GB/月） |
| Azure SQL 內建監控 | 由客戶端提供／查看 |
| API 自寫結構化 log + `traceId` | 統一 ProblemDetails 帶 `traceId`，出事時對照 Log stream |

**建議設定的告警**：Function 失敗數 > 0（5 分鐘）、HTTP 5xx 率、SWA 月頻寬達 80GB。

> 若日後排查困難，加一個 Application Insights 是成本極低（低流量近乎免費）的補救；目前依決策不建。

---

## 9. 備援與災難復原

| 項目 | 策略 |
|------|------|
| SQL 備份 | **由客戶負責**（自動備份 + PITR）。需向客戶確認保留天數與還原程序，並在 DB 遷移前確認還原點 |
| Blob | 啟用 **soft delete（7–30 天）+ blob versioning**；LRS（無異地備援） |
| 程式碼／設定 | Git + Bicep 可重建 SWA / Function App / Storage |
| 機密 | 無 Key Vault → App Settings 內容需另行離線保管一份（密碼管理器） |
| RPO/RTO | 受限於客戶 SQL 的備份設定；Blob 為 LRS，區域級災難無異地副本 —— 此風險需向客戶明示 |

---

## 10. 成本

| 資源 | 預估 |
|------|------|
| SWA Free | **$0**（100GB/月內） |
| Function App Flex Consumption | 執行時間 + 執行次數計費，有每月免費額度；always-ready 設 **0**（接受冷啟動）→ 低流量下接近 $0。**實例記憶體需 2048MB**（見下） |
| Storage（Blob） | 容量 + 交易 + 對外流量，數十 GB 級距約每月數美元 |
| Azure SQL | 客戶自負 |

控管重點：

- always-ready 保持 0；若冷啟動不可接受，改設 1–2 個會產生**固定**月費，需另行核可。
- **實例記憶體必須設 2048MB，不能用 512MB** —— 媒體上傳要解碼最大 8000px 的來源圖並編出
  最多 5 個尺寸（見 [11-media-specs.md](11-media-specs.md) §2a），512MB 會 OOM。
  Flex Consumption 按「記憶體 × 執行時間」計費，所以這會讓每次執行的單價變成 4 倍；
  但因為只有上傳端點吃記憶體、而上傳是低頻動作，實際月費影響有限。
- 盯 SWA 頻寬：Free 超額無法加購，會直接停止服務。
- Blob 對外流量是唯一會隨流量線性成長的項目，長 `Cache-Control` 是主要控制手段。
- 於訂閱層設 Cost Management 預算告警。

---

## 11. 上線檢查清單

- [ ] Bicep 可重建 SWA / Function App / Storage（SQL 為 existing 參照）
- [ ] `next build` 產物 `standalone` 且 **≤ 250MB**，CI 有 gate
- [ ] middleware / redirects 已排除 `.swa` 路徑，部署驗證通過
- [ ] Managed Identity 已可存取 Blob 與 SQL；App Settings 無多餘明碼
- [ ] `www` + apex 自訂網域綁定、HTTPS 正常、apex 301 轉 www
- [ ] 安全標頭由 Next.js `headers()` 輸出並通過檢測
- [ ] Function App CORS 僅允許正式網域
- [ ] 圖片走 Blob 直連，未經 SWA 圖片優化端點
- [ ] SMTP 寄信實測成功，且寄信失敗不影響表單入庫
- [ ] `POST /contact` 速率限制與 reCAPTCHA 生效
- [ ] Azure Monitor 告警（Function 失敗、5xx、SWA 頻寬）已設定並測過通知
- [ ] Blob soft delete + versioning 已開啟
- [ ] 已與客戶確認 SQL 備份保留期與還原程序
- [ ] 預覽環境 noindex；正式環境 `robots.txt` / `sitemap.xml` 正確

---

## 12. 此方案的已知取捨（需與客戶確認知悉）

1. **SWA Free 無 SLA**，且頻寬超過 100GB/月會直接中斷而非降速或計費。
2. **Next.js hybrid on SWA 仍是 preview 功能**，微軟可能變更行為。
3. **無 WAF**，防護仰賴應用層（reCAPTCHA、速率限制、JWT）。
4. **無 App Insights**，線上問題只能靠即時 log stream 與平台指標排查。
5. **無雲端 staging**，且 DB 遷移在 Function App 啟動時自動對 prod 套用。migration 失敗等於正式站起不來，且無 slot 可退。
6. **Blob LRS 且無異地備援**，區域級事故會遺失媒體檔（原始素材需另存一份）。
7. **Flex Consumption 無 slot**，回滾靠重新部署。
