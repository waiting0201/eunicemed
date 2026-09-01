/*
  EuniceMed 正式環境基礎設施。

  建立的資源（docs/07-azure-deployment.md §1）：
    1. Storage Account —— 媒體 + Function App 的部署包與 host metadata
    2. Function App（Flex Consumption）—— API
    3. Static Web App（Free）—— Next.js 公開站 + /admin
    4. Log Analytics workspace + Application Insights —— **Flex Consumption 必要**

  ⚠️ 第 4 項原本被方案排除（「不使用 Application Insights」），2026-08-19 實測推翻：
  沒有 `APPLICATIONINSIGHTS_CONNECTION_STRING` 的 Flex Consumption app **起不來** ——
  host 回 500、trigger 同步失敗、而且因為記錄管線就是它，所以連錯誤訊息都拿不到。
  同訂用帳戶的四個正常 Flex app 全都設了這一項。見 docs/13 的踩坑紀錄。

  **Azure SQL 由客戶提供**，此檔不建立也不參照它 —— 連線字串是部署後才填入的
  App Setting（見下方 sqlConnectionString 參數的說明）。

  部署：
    az deployment group create -g EuniceMedUS \
      -f infra/main.bicep -p infra/prod.bicepparam
*/

@description('資源部署的區域。')
param location string = resourceGroup().location

@description('''
SWA 的區域。與其他資源分開成一個參數，因為 SWA 的可用區域比一般資源少 ——
若日後把其他資源搬到 SWA 不支援的區域，這裡不必跟著動。
''')
param staticWebAppLocation string = 'westus2'

@description('資源命名的前綴，用來組出 func-{prefix}-prod 這類名稱。')
param namePrefix string = 'eunicemed'

@description('公開網站的網址，供 API 的 CORS 白名單與前端使用。')
param siteUrl string = 'https://www.eunicemed.com'

@description('''
除了 `siteUrl` 與 SWA 預設網域之外，還要放行的瀏覽器來源。

`eunicemed.4webdemo.com` 是客戶目前看的測試網址 —— Cloudflare 代理到同一個 SWA
（內容與預設網域逐位元組相同）。`/admin` 的 XHR 直接打 Function App，
少了這一條，後台在那個網址上登入不了。

⚠️ **2026-08-31 發現這一條是手動加的。** `siteConfig.cors` 與 `appSettings` 一樣是
整批取代 —— 補進範本之前，任何一次 infra 部署都會把它洗掉，症狀是後台忽然登入失敗。
''')
param extraCorsOrigins array = [ 'https://eunicemed.4webdemo.com' ]

@description('''
後台 JWT 的簽章金鑰（32 bytes 以上）。
輪替此值會讓所有既有的 access / refresh token 立即失效。
以 --parameters 於部署時帶入，不要寫進 bicepparam 進版控。
''')
// 空字串會把正式站既有的金鑰洗掉（ARM 的 appSettings 是整批覆蓋）。
// 擋在這裡，讓「CI 忘了設 secret」變成部署失敗而不是全站登出。
@minLength(32)
@secure()
param jwtSigningKey string

@description('''
客戶提供的 Azure SQL 連線字串（寫入 App Setting `ConnectionStrings__DefaultConnection`）。
若客戶願意在 SQL Server 設定 Entra 管理員，改用
`Authentication=Active Directory Default` 的形式，字串裡就不會有密碼
（docs/07 §6.2）。

客戶尚未提供時，以 `PENDING-CUSTOMER-SQL` 之類的佔位字串帶入 ——
**不要留空**：空字串同樣會覆蓋掉正式站已經填好的連線字串。
''')
@minLength(10)
@secure()
param sqlConnectionString string

@description('''
reCAPTCHA v3 的 secret key（寫入 App Setting `Recaptcha__SecretKey`）。

**留空就不寫這一項**，API 端因此跳過驗證、表單照常運作
（`Api/Services/RecaptchaVerifier.cs`）。前端的 site key 是另一回事 ——
它是 build-time 的 GitHub variable `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`（docs/07 §6.4）。

⚠️ **這一項必須留在這裡，不能事後用 `az functionapp config appsettings set` 補。**
ARM 的 `appSettings` 是整批取代：手動加的鍵會在下一次 infra 部署時被這份範本洗掉。
''')
@secure()
param recaptchaSecretKey string = ''

@description('''
表單通知信的 SMTP。走 Brevo 或 Resend 這類 transactional relay
（客戶信箱的 SMTP AUTH 開不了，決議見 CLAUDE.md §7）。

**`smtpHost` 留空就整組不寫**，`EmailSender` 因此只記一行 log、表單照常入庫
（`Api/Services/EmailSender.cs`）—— 與 reCAPTCHA 同一個模式。

`Smtp__EnableSsl` 不另設參數：只有 465 是 implicit TLS，其餘（587／2525）
一律 STARTTLS，所以由 `smtpPort` 推導。兩者不一致的後果是連線階段就掛，
而寄信失敗是不回錯的 —— 沒人會發現。

各家的值（2026-09 現況）：
- Brevo：host `smtp-relay.brevo.com`、port 587、username 是帳號登入信箱、
  password 是後台產的 **SMTP key**（不是登入密碼）
- Resend：host `smtp.resend.com`、port 587、username 固定字串 `resend`、
  password 是 API key

⚠️ 兩家都要求 **From 的網域先在 DNS 完成 SPF/DKIM 驗證**，否則不是被退件就是進垃圾桶。
客戶那兩個網域的 DNS 我們動不了（`eunicemed.com` 在 Google Cloud DNS、
`comfortplus-medical.com` 的 SPF 由 eee.tw 代管），所以**寄件網域用我們自己的**
`mail.4webdemo.com`（Cloudflare，同一個帳號）—— 詳見 docs/07 §6.3。
信是寄給客戶自己的收件匣，From 是誰不影響品牌；要回覆詢問者靠的是 Reply-To
（`EmailSender` 已帶上送件人的信箱）。
''')
param smtpHost string = ''

@description('SMTP 連接埠。465 走 implicit TLS，其餘走 STARTTLS。空字串視同 587。')
param smtpPort string = '587'

@description('SMTP 帳號。Brevo 是登入信箱、Resend 固定為 `resend`。')
param smtpUsername string = ''

@description('SMTP 密碼（Brevo 的 SMTP key／Resend 的 API key）。')
@secure()
param smtpPassword string = ''

@description('''
通知信寄件人。空字串視同預設值。

⚠️ **網域必須是在 relay 完成 SPF/DKIM 驗證的那一個**，不是 `@eunicemed.com`
（客戶的 DNS 我們加不了記錄，docs/07 §6.3）。填錯的症狀是信被退或進垃圾桶，
而寄信失敗只記 log 不回錯 —— 不會有人發現。
''')
param smtpFrom string = 'no-reply@mail.4webdemo.com'

@description('通知信收件人。可用逗號分隔多個位址（`EmailSender` 會拆開）。空字串視同預設值。')
param smtpTo string = 'service@comfortplus-medical.com'

// ⚠️ 這三個要自己補預設值，不能只靠 param 的預設 —— CI 是用
// `readEnvironmentVariable` 帶值，未設定的 GitHub variable 會送進**空字串**而不是
// 「沒帶這個參數」，param 預設值因此不會生效。空的 `Smtp__To` 等於信全部靜靜不寄。
var smtpPortValue = empty(smtpPort) ? '587' : smtpPort
var smtpFromValue = empty(smtpFrom) ? 'no-reply@mail.4webdemo.com' : smtpFrom
var smtpToValue = empty(smtpTo) ? 'service@comfortplus-medical.com' : smtpTo

// Storage 帳戶名稱不可有連字號，且全域唯一
var storageName = 'st${namePrefix}prod'
var functionAppName = 'func-${namePrefix}-prod'
var planName = 'plan-${namePrefix}-prod'
var staticWebAppName = 'stapp-${namePrefix}-prod'

var mediaContainer = 'media'
var originalsContainer = 'media-originals'
var deploymentContainer = 'deployment-package'

// ── Storage ────────────────────────────────────────────────────────────────
// 一個帳戶同時放媒體與部署包（docs/07 §1.1）—— 方案上限是 4 個資源，
// 分兩個帳戶就超了。以容器的存取層級區隔。

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    // media 容器要能匿名讀取（訪客瀏覽器直接抓圖，不經 SWA 以省頻寬），
    // 因此帳戶層級必須允許 public blob access
    allowBlobPublicAccess: true
    // ⚠️ Functions host 的儲存體與部署包都走連線字串（見 Function App 的 appSettings），
    // 所以共用金鑰不能停用。我們自己的程式碼存取媒體仍走 Managed Identity。
    allowSharedKeyAccess: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource media 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: mediaContainer
  properties: { publicAccess: 'Blob' }
}

// 原檔供日後 preset 調整時重新產生變體用，不對外
resource originals 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: originalsContainer
  properties: { publicAccess: 'None' }
}

resource deploymentPackage 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: deploymentContainer
  properties: { publicAccess: 'None' }
}

// ── 監控（Flex Consumption 的必要條件，不是選配）──────────────────────────
// workspace-based 的 App Insights 需要一個 Log Analytics workspace（classic 已退役）。
// 保留 30 天、按量計費；本站流量遠低於每月 5GB 的免費額度。

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${namePrefix}-prod'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${namePrefix}-prod'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logs.id
    // 取樣交給 host.json 決定，這裡不動
  }
}

// ── Function App（Flex Consumption）────────────────────────────────────────

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  kind: 'functionapp'
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  properties: {
    reserved: true
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storage.properties.primaryEndpoints.blob}${deploymentContainer}'
          authentication: {
            type: 'StorageAccountConnectionString'
            storageAccountConnectionStringName: 'DEPLOYMENT_STORAGE_CONNECTION_STRING'
          }
        }
      }
      runtime: {
        name: 'dotnet-isolated'
        // ⚠️ **是 '10.0' 不是 '10'。**
        // `az functionapp list-flexconsumption-runtimes` 回的是 `10`，照著填的話
        // host 完全不回應（連 /admin/host/status 都 500，且無任何日誌）。
        // `az functionapp create` 自己填的、以及同訂用帳戶所有正常運作的 app，都是 '10.0'。
        version: '10.0'
      }
      scaleAndConcurrency: {
        // 2048MB 是媒體管線定案時一併決定的：512MB 會在 SkiaSharp
        // 解碼大圖時 OOM（docs/07 §10、CLAUDE.md §7 已封閉項）
        instanceMemoryMB: 2048
        // 每個實例各有一個 SQL 連線池 —— 上限要對得起客戶 DB 的連線數上限
        // （那個數字還沒拿到，先保守設 10，見 CLAUDE.md §7）
        maximumInstanceCount: 10
      }
    }
    siteConfig: {
      // 平台層 CORS：/admin 的瀏覽器 XHR 會直接打 Function App。
      // SSR 是伺服器對伺服器，不受此限制。
      // 自訂網域還沒接上（STATUS §六之二），所以一定要同時放行 SWA 的預設網域 ——
      // 只列 siteUrl 的話，後台在 *.azurestaticapps.net 上的每個 XHR 都會被 CORS 擋掉
      cors: {
        allowedOrigins: concat(
          [ siteUrl, 'https://${staticWebApp.properties.defaultHostname}' ],
          extraCorsOrigins
        )
        // ⚠️ 正式站上是 true（2026-08-31 以 `az functionapp cors show` 對照發現）。
        // 範本原本寫 false，改成 true 只是**如實反映線上**，不是新的決定 ——
        // 後台走 Bearer token、fetch 沒有帶 credentials，其實用不到這一項。
        // 要關掉的話請當成一次獨立的變更，確認沒有東西依賴 cookie 之後再做。
        supportCredentials: true
      }
      appSettings: concat([
        // Flex Consumption 的 host 儲存體以 MI 存取，不放連線字串
        {
          // Functions host 自己的儲存體。**用連線字串而非 Managed Identity** ——
          // 同訂用帳戶四個正常運作的 Flex app 全都是連線字串形式。
          // 媒體存取（我們自己的程式）仍走 MI，見下方 Storage__AccountName。
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'DEPLOYMENT_STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'BlobStorageConnection__accountName'
          value: storage.name
        }
        {
          name: 'BlobStorageConnection__credential'
          value: 'managedidentity'
        }
        {
          name: 'Storage__AccountName'
          value: storage.name
        }
        {
          name: 'Storage__MediaContainer'
          value: mediaContainer
        }
        {
          name: 'Storage__OriginalsContainer'
          value: originalsContainer
        }
        {
          name: 'Storage__PublicBaseUrl'
          value: '${storage.properties.primaryEndpoints.blob}${mediaContainer}'
        }
        {
          // ⚠️ 鍵名是 `Jwt__Secret`。程式讀 `Jwt:Secret`（JwtService.cs），
          // docs/07 原本寫成 Jwt__SigningKey —— 不一致的話 host 起得來但每個請求都 500。
          name: 'Jwt__Secret'
          value: jwtSigningKey
        }
        {
          // ⚠️ 鍵名是 `ConnectionStrings__DefaultConnection`，不是 `Sql__ConnectionString`。
          // Program.cs 讀的是 `ConnectionStrings:DefaultConnection`（與 local.settings.json 一致），
          // 而 docs/07 §6.1 原本寫成 Sql__ConnectionString —— 兩邊不一致的後果是
          // 「部署成功、app Running、但每個請求都不回應」，因為建構 host 時就丟例外了。
          name: 'ConnectionStrings__DefaultConnection'
          value: sqlConnectionString
        }
        {
          name: 'Cors__AllowedOrigins'
          value: siteUrl
        }
        {
          // ⚠️ 預設是 12。降到 8 是**應要求**放寬的，代價是後台密碼可以很短 ——
          // `/admin` 對全網際網路開放（SWA Free 沒有 IP 限制），
          // 唯一的補償是登入失敗 5 次鎖 15 分鐘與 IP 速率限制（docs/07 §7.4）。
          name: 'Auth__MinPasswordLength'
          value: '8'
        }
        {
          // ⚠️ **不要拿掉。** 少了它 Flex Consumption 的 host 起不來（見檔頭說明）。
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: insights.properties.ConnectionString
        }
      ],
      // 空值就整項不寫（見 recaptchaSecretKey 的說明）
      empty(recaptchaSecretKey) ? [] : [
        {
          name: 'Recaptcha__SecretKey'
          value: recaptchaSecretKey
        }
      ],
      // 同上：host 空著就整組不寫。刻意不放空字串佔位 ——
      // 空的 Smtp__Host 會讓寄信在執行期才失敗，缺少設定則在啟動時就講清楚。
      empty(smtpHost) ? [] : [
        {
          name: 'Smtp__Host'
          value: smtpHost
        }
        {
          name: 'Smtp__Port'
          value: smtpPortValue
        }
        {
          name: 'Smtp__Username'
          value: smtpUsername
        }
        {
          name: 'Smtp__Password'
          value: smtpPassword
        }
        {
          name: 'Smtp__From'
          value: smtpFromValue
        }
        {
          name: 'Smtp__To'
          value: smtpToValue
        }
        {
          // 由連接埠推導，不另開參數（見 smtpHost 的說明）
          name: 'Smtp__EnableSsl'
          value: smtpPortValue == '465' ? 'true' : 'false'
        }
      ])
    }
  }
}

// ── 角色指派 ───────────────────────────────────────────────────────────────
// ⚠️ **Function App 砍掉重建之前，要先手動刪掉這四筆角色指派。**
//
// 指派的名稱是 `guid(storage.id, functionApp.id, role)`。app 重建後名稱（因而 id）
// 不變，但 MI 的 principalId 會換一組 —— ARM 會把它看成「要改既有指派的 principal」
// 而拒絕：`RoleAssignmentUpdateNotPermitted`，整個 deployment 失敗。
//
// principalId 是執行期才知道的值，不能放進名稱（Bicep BCP120），所以只能靠流程：
//
//   ST=$(az storage account show -n steunicemedprod -g EuniceMedUS --query id -o tsv)
//   az role assignment list --scope "$ST" --query "[?principalType=='ServicePrincipal'].id" -o tsv \
//     | xargs -n1 az role assignment delete --ids
// 文件 §6.2 原本寫「限 media 容器」，但同一個帳戶還放著 Flex Consumption 的
// 部署包與 host metadata，容器層級的授權會讓 Function App 起不來。
// 因此範圍是帳戶，權限取最小可用的三個角色。

var blobDataOwner = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
)
var queueDataContributor = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '974c5e8b-45b9-4653-ba55-5f855dd0fb88'
)
var tableDataContributor = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'
)
// PDF 直傳要簽 user delegation SAS。這個動作**不包含在 Blob Data Owner 裡** ——
// 少了它，圖片一切正常而 PDF 上傳在正式站失敗（本機用連線字串所以測不出來）。
var blobDelegator = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'db58b8e5-c6ad-4a2a-8342-4190687cbf4a'
)

resource blobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storage
  name: guid(storage.id, functionApp.id, blobDataOwner)
  properties: {
    roleDefinitionId: blobDataOwner
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource delegatorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storage
  name: guid(storage.id, functionApp.id, blobDelegator)
  properties: {
    roleDefinitionId: blobDelegator
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource queueRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storage
  name: guid(storage.id, functionApp.id, queueDataContributor)
  properties: {
    roleDefinitionId: queueDataContributor
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource tableRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storage
  name: guid(storage.id, functionApp.id, tableDataContributor)
  properties: {
    roleDefinitionId: tableDataContributor
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// ── Static Web App（Free）──────────────────────────────────────────────────
// 不在此綁 GitHub repo：部署走 Actions + deployment token（docs/07 §5）。
// 綁了 repo 反而會讓 Azure 自己產生一支 workflow，與我們手寫的那支打架。

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: staticWebAppLocation
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    // Free 方案有 3 個預覽環境，但全部環境合計 500MB —— 實質只夠 prod + 1
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

// request-time 的環境變數。build-time 的那一份在 web.yml 裡，
// 兩邊都要設（docs/07 §6.4）。
resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    // ⚠️ 沒有 `/v1`。host.json 的 routePrefix 是 `api`，AppRouter 直接比對
    // `["collections"]` 這種形狀 —— 實際端點是 `/api/collections`。
    // docs 舊版寫 `/api/v1` 是錯的（URL 沒有版本段），照抄會讓前台每一頁都 500。
    API_BASE: 'https://${functionApp.properties.defaultHostName}/api'
    NEXT_PUBLIC_API_BASE: 'https://${functionApp.properties.defaultHostName}/api'
    NEXT_PUBLIC_MEDIA_BASE: '${storage.properties.primaryEndpoints.blob}${mediaContainer}'
    NEXT_PUBLIC_SITE_URL: siteUrl
  }
}

output functionAppName string = functionApp.name
output functionAppHost string = functionApp.properties.defaultHostName
output storageAccountName string = storage.name
output mediaBaseUrl string = '${storage.properties.primaryEndpoints.blob}${mediaContainer}'
output staticWebAppName string = staticWebApp.name
output staticWebAppHost string = staticWebApp.properties.defaultHostname
output appInsightsName string = insights.name
