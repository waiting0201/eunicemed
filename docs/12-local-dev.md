# 12 · 本機開發環境

> 上層導覽見 [CLAUDE.md](../CLAUDE.md)。部署與正式環境見 [07-azure-deployment.md](07-azure-deployment.md)。
>
> 本專案**沒有雲端 dev/staging 環境**（見 [07](07-azure-deployment.md) §3），所有開發都在本機進行，因此這份文件是進入專案的第一站。

---


## 後台登入

| | |
|---|---|
| 網址 | http://localhost:5173/admin/（`cd apps/admin && pnpm dev`）|
| 帳號 | 見 `Api/local.settings.json` 的 `Seed__AdminEmail` |
| 密碼 | 見同檔的 `Seed__AdminPassword` |

種子帳號由 `AdminUserSeeder` 在 Function App 啟動時建立，**只在 `User` 表為空時才動作** ——
所以改了 `local.settings.json` 的帳密**不會**影響既有帳號，那要走 `PUT /admin/users/{id}`。

密碼長度下限由 `Auth__MinPasswordLength` 控制，**預設 12**。
本機設成 8 以便用短一點的開發帳密；**正式環境不要設這一項**，讓它保持預設。
四個檢查點（種子、建立使用者、更新使用者、改密碼）讀同一個值，
見 `Api/Common/PasswordPolicy.cs`。

## 1. 需要什麼

| 工具 | 版本 | 用途 |
|------|------|------|
| .NET SDK | **10.0.x** | `global.json` 釘 `10.0.100` + `rollForward: latestFeature` |
| Azure Functions Core Tools | **4.x** | `func start` |
| Docker Desktop | 任意近期版本 | 跑 SQL Server |
| Azurite | 任意 | Blob 模擬器（`npm i -g azurite`） |
| Node.js | 22+ | 前端（`apps/web`）用 |
| Azure CLI | 選用 | 部署與查資源時才需要 |

驗證：

```bash
dotnet --version        # 10.0.x
func --version          # 4.x
docker --version
azurite --version
```

> **若 `func start` 卡住約 180 秒後逾時**：Core Tools 內部會建一個 target `net8.0` 的 `WorkerExtensions` 專案，本機若沒有 .NET 8 runtime 就會卡住（[Azure/azure-functions-core-tools#5138](https://github.com/Azure/azure-functions-core-tools/issues/5138)）。
> 用 `dotnet --list-runtimes | grep 'Microsoft.NETCore.App 8'` 確認；沒有就補裝 .NET 8 runtime。
> （2026-08 實測：只有 .NET 9/10 runtime 的機器上 `func 4.8.0` 正常運作，多數情況不會遇到。）

---

## 2. 一次性設定

### 2.1 SQL Server container

Apple Silicon **沒有原生 arm64 的 SQL Server image**，且 Azure SQL Edge 已於 2025-09-30 終止支援。做法是用 x64 image 搭 Rosetta 模擬：

先在 Docker Desktop → Settings → General 開啟 **「Use Rosetta for x86_64/amd64 emulation on Apple Silicon」**（需 Docker Desktop ≥ 4.16；必要時先跑 `softwareupdate --install-rosetta`）。

```bash
docker run -d --name sqlserver --platform linux/amd64 \
  -e ACCEPT_EULA=Y \
  -e MSSQL_SA_PASSWORD='<你的本機密碼>' \
  -e MSSQL_PID=Developer \
  -e MSSQL_COLLATION=SQL_Latin1_General_CP1_CI_AS \
  -p 1433:1433 \
  -v eunicemed-sqldata:/var/opt/mssql \
  --memory 4g \
  mcr.microsoft.com/mssql/server:2022-latest
```

`MSSQL_COLLATION` 要明確指定，讓本機與 Azure SQL 一致。本機目前實測為 `SQL_Latin1_General_CP1_CI_AS`（Azure SQL 的預設值）。

> ⚠️ **待向客戶確認他們 Azure SQL 的 collation**。若是區分大小寫的 `_CS_`，slug 比對在本機與正式站會有不同行為，而這種問題只會在上線後才發現。見 [CLAUDE.md](../CLAUDE.md) §7。

### 2.2 `local.settings.json`

```bash
cp Api/local.settings.example.json Api/local.settings.json
```

然後填入本機 SQL 密碼。**這個檔永不進版控**（`.gitignore` 已擋，含 DB 密碼與 JWT secret）。

### 2.3 寄信（Phase 7 才需要）

```bash
docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
```

Web UI 在 <http://localhost:8025>，可看到 contact 表單送出的通知信。`local.settings.json` 的 `Smtp__Host=localhost` / `Smtp__Port=1025` 已對應此設定。

---

## 3. 每天啟動

```bash
# 1. Docker Desktop 要先開著
docker start sqlserver

# 2. Blob 模擬器（--skipApiVersionCheck 不可省，見下）
azurite --silent --skipApiVersionCheck --location ~/.azurite

# 3. API（會自動套用 pending migration）
cd Api && func start          # http://localhost:7071/api/...
```

```bash
# 4. 前端
cd apps/web && pnpm dev              # http://localhost:3000
```

要驗證**部署到 SWA 上實際跑的那份產物**（而非 dev server）：

```bash
cd apps/web && pnpm build            # 含 250MB gate
pnpm start:standalone
```

**收工**：

```bash
pkill -f "func start"
pkill -f azurite
kill $(lsof -nP -tiTCP:3000 -sTCP:LISTEN) 2>/dev/null
docker stop sqlserver
```

---

## 4. 驗證跑起來了

```bash
curl -s localhost:7071/api/health | python3 -m json.tool
```

各階段的完整驗收請求存在 [`Api/http/`](../Api/http/)，用 VS Code REST Client 開，或照檔內註解改成 curl。

照 Jabez 的慣例（[Jabez/CLAUDE.md](/Users/tim/webapps/Jabez/CLAUDE.md) 開發注意事項第 5 條），**測試必須實際輸入資料跑過完整 CRUD，不得只以目視或靜態檢查代替**。本專案沒有自動化測試專案，`.http` 檔就是回歸測試清單。

---

## 5. 資料庫遷移

Migration 由 **Function App 啟動時自動套用**（`Api/Program.cs`），所以平常改完 entity 只要重啟 `func start` 即可。要手動操作時：

```bash
# 新增 migration（-s 指向 Api 本身，靠 AppDbContextFactory 取連線字串）
dotnet ef migrations add <Name> -p Api/Api.csproj -s Api/Api.csproj -o Data/Migrations

# 手動套用
dotnet ef database update -p Api/Api.csproj -s Api/Api.csproj

# 撤銷最後一支尚未套用的 migration
dotnet ef migrations remove -p Api/Api.csproj -s Api/Api.csproj
```

`AppDbContextFactory` 取連線字串的順序：`Api/local.settings.json` → 環境變數 `ConnectionStrings__DefaultConnection` → 內建的本機 fallback。

**紀律**（因為正式庫是客戶的，且遷移在啟動時自動跑，失敗等於整站起不來）：

- 一個階段一支 migration，**已套用到正式站的 migration 絕不修改**，只能往前修。
- 破壞性變更拆成「擴張 → 遷移 → 收縮」三支 PR。
- 大量資料回填不要寫進 migration，改走 `POST /admin/maintenance/*` 維護端點。
- 索引一律宣告在 `Data/Configurations/` 裡，不要只寫在手改的 migration 中。

---

## 6. 常見問題

| 症狀 | 原因與處理 |
|------|-----------|
| 改了程式碼但行為沒變 | **先確認舊的 server 程序真的死了**。`func start` 與 `node server.js` 都可能因 port 被占用而啟動失敗，而你仍在跟舊程序說話 —— curl 回 200 只證明「有東西在聽」。用 `lsof -nP -tiTCP:3000 -sTCP:LISTEN` 取 PID 並比對是否換了，或檢查 log 有無 `EADDRINUSE`。 |
| `func start` 卡住 180 秒後逾時 | 缺 .NET 8 runtime，見 §1 |
| 啟動時 `SqlException: A network-related...` | SQL container 沒開 → `docker start sqlserver` |
| 啟動時 migration 逾時 | Flex Consumption 的 30 秒 app-init 上限在本機不適用，但正式站會炸。檢查是不是在 migration 裡放了大量資料回填 |
| Blob 上傳失敗，錯誤訊息提到 `The API version ... is not supported by Azurite` | 本機 Azurite 版本比 Azure SDK 送出的 API 版本舊。**啟動時加 `--skipApiVersionCheck`**（或升級 Azurite）。 |
| Blob 上傳失敗（其他） | Azurite 沒開，或 `media` / `media-originals` 容器還沒建立（首次上傳會自動建立） |
| 公開端點很慢 | 查 plan cache 確認 `@locale` 是以 `varchar(10)` 送出，見 §7 |
| 中文變成問號 | 檢查該欄位是 `NVARCHAR` 而非 `VARCHAR`（只有 `Locale`、`PresetKey` 等固定 ASCII 欄位才用 `VARCHAR`） |

---

## 7. 每次改多語系查詢都要做的檢查

這是本專案唯一一個**不會報錯、只會讓全站變慢**的錯誤，值得單獨列出。

DB 的 `Locale` 欄位是 `varchar(10)`（非 Unicode）。若 EF 或 Dapper 送出 `NVARCHAR` 參數，SQL Server 會在**欄位側**加隱含轉換，`UX_*Tr` 唯一索引直接失效，每個公開請求都變成掃描。

**寫法**：

- EF：每個 `Locale` 屬性都要 `.HasColumnType("varchar(10)").IsUnicode(false).HasMaxLength(10)`
- Dapper：`p.Add("@locale", locale, DbType.AnsiString, size: 10)`

**驗證**：

```bash
docker exec sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa \
  -P '<你的本機密碼>' -C -d EuniceMedDb -h -1 -W -Q "SET NOCOUNT ON;
  SELECT TOP 3 SUBSTRING(t.text,1,80) FROM sys.dm_exec_cached_plans p
  CROSS APPLY sys.dm_exec_sql_text(p.plan_handle) t
  WHERE t.text LIKE '%@locale%' AND t.text NOT LIKE '%dm_exec%';"
```

必須看到 `(@locale varchar(10))`。出現 `nvarchar` 就是錯的。

同樣規則適用 `CountryCode VARCHAR(2)`、`Menu VARCHAR(20)`、`Format VARCHAR(10)`、`PresetKey VARCHAR(30)`。

---

## 8. Dapper 讀不到 `DateOnly`

`NewsEvent.StartDate` 這類 `date` 欄位在 EF Core 是原生支援的，Dapper 不是。缺對映時會在**執行期**丟：

```
InvalidOperationException: A parameterless default constructor or one matching signature
(... System.DateTime StartDate, System.DateTime EndDate ...) is required for XxxDto materialization
```

訊息只會列出它期待的簽章，**完全不會提到 DateOnly**，很容易誤判成 DTO 欄位順序寫錯而白花時間。

已在 `Program.cs` 全域註冊 `DateOnlyTypeHandler` / `TimeOnlyTypeHandler`（見 `Api/Services/Dapper/DateOnlyTypeHandler.cs`）。新增 `date` / `time` 欄位時不需再做任何事；但若把讀取搬到新的 host 或測試專案，記得一併註冊。

---

## 正式站的後台帳號

| | |
|---|---|
| 網址 | <https://zealous-sand-0bdf5e01e.7.azurestaticapps.net/admin> |
| 帳號 | `sa@system.local` |
| 密碼 | `Admin@123` |

與本機同一組，方便切換。首次登入會要求變更密碼（`mustChangePassword`）。

> ⚠️ **這組密碼只有 9 碼，而 `/admin` 對全網際網路開放** ——
> SWA Free 沒有 IP 限制可用（[07 §7.1](07-azure-deployment.md)），
> 唯一的補償是登入失敗 5 次鎖 15 分鐘與每分鐘 30 次的 IP 速率限制。
> 正式對外之前應換成長密碼，並把 `Auth__MinPasswordLength` 調回 12。
