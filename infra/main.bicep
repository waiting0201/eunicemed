/*
  EuniceMed 正式環境基礎設施。

  只建立三個資源（docs/07-azure-deployment.md §1）：
    1. Storage Account —— 媒體 + Function App 的部署包與 host metadata
    2. Function App（Flex Consumption）—— API
    3. Static Web App（Free）—— Next.js 公開站 + /admin

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
    allowSharedKeyAccess: false
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
            // 沒有 Key Vault，也不用共用金鑰 —— 部署包以 MI 存取
            type: 'SystemAssignedIdentity'
          }
        }
      }
      runtime: {
        name: 'dotnet-isolated'
        // ⚠️ 是 '10' 不是 '10.0'。Flex Consumption 收得下 '10.0'（ARM 不驗），
        // 但 worker 起不來 —— 症狀是 host 活著、每一條路由都回 404。
        // 可用值以 `az functionapp list-flexconsumption-runtimes -l <region>` 為準。
        version: '10'
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
      cors: {
        allowedOrigins: [ siteUrl ]
        supportCredentials: false
      }
      appSettings: [
        // Flex Consumption 的 host 儲存體以 MI 存取，不放連線字串
        {
          name: 'AzureWebJobsStorage__accountName'
          value: storage.name
        }
        {
          name: 'AzureWebJobsStorage__credential'
          value: 'managedidentity'
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
          name: 'Jwt__SigningKey'
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
        // SMTP 與 reCAPTCHA 的值尚未取得（CLAUDE.md §7）。
        // 刻意不在這裡放空字串佔位 —— 空的 Smtp__Host 會讓寄信在執行期才失敗，
        // 而缺少設定會在啟動時就講清楚。拿到之後用 az functionapp config appsettings set 補。
      ]
    }
  }
}

// ── 角色指派 ───────────────────────────────────────────────────────────────
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
    API_BASE: 'https://${functionApp.properties.defaultHostName}/api/v1'
    NEXT_PUBLIC_API_BASE: 'https://${functionApp.properties.defaultHostName}/api/v1'
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
