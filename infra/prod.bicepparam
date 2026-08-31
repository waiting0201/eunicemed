using './main.bicep'

param location = 'westus2'
param staticWebAppLocation = 'westus2'
param namePrefix = 'eunicemed'
param siteUrl = 'https://www.eunicemed.com'

// 機密不進版控。部署時以命令列帶入：
//
//   az deployment group create -g EuniceMedUS \
//     -f infra/main.bicep -p infra/prod.bicepparam \
//     -p jwtSigningKey="$(openssl rand -base64 48)" \
//     -p sqlConnectionString="$SQL_CONNECTION_STRING"
//
// CI 走的是同一組值，存在 GitHub Actions Secrets（見 .github/workflows/infra.yml）。
param jwtSigningKey = readEnvironmentVariable('JWT_SIGNING_KEY', '')
param sqlConnectionString = readEnvironmentVariable('SQL_CONNECTION_STRING', '')

// 尚未取得。**留空就是不啟用**：Bicep 不寫這個 App Setting，API 端跳過驗證，
// 表單行為與接上之前相同。拿到之後在 GitHub Secrets 設 `RECAPTCHA_SECRET_KEY` 即可。
param recaptchaSecretKey = readEnvironmentVariable('RECAPTCHA_SECRET_KEY', '')
