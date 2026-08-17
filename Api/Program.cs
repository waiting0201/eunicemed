using EuniceMed.Api.Data;
using EuniceMed.Api.Data.Interceptors;
using EuniceMed.Api.Data.Seed;
using EuniceMed.Api.Handlers;
using EuniceMed.Api.Middleware;
using EuniceMed.Api.Routing;
using EuniceMed.Api.Services;
using EuniceMed.Api.Services.Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Data;
using System.Text.Json;

var host = new HostBuilder()
    // ─── ASP.NET Core Integration (ConfigureFunctionsWebApplication) ─────────
    .ConfigureFunctionsWebApplication(worker =>
    {
        // Worker-level middleware：包住整個 Function 執行，捕捉所有例外
        worker.UseMiddleware<ExceptionMiddleware>();
    })
    // ─── DI Services ──────────────────────────────────────────────────────────
    .ConfigureServices((ctx, services) =>
    {
        var cfg = ctx.Configuration;

        // 本專案不接 Application Insights（docs/07-azure-deployment.md §8）。
        // 所有診斷靠 ILogger → Function App log stream，錯誤一律帶 traceId
        // （見 Middleware/ExceptionMiddleware.cs）。

        // ── 全域 JSON 序列化：camelCase ───────────────────────────────────
        // 兩個都要設。JsonOptions 管 IActionResult 的輸出（OkObjectResult 等），
        // ConfigureHttpJsonOptions 管 req.ReadFromJsonAsync 的輸入。少設一個就會不對稱。
        services.Configure<JsonOptions>(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy        = JsonNamingPolicy.CamelCase;
            options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        });
        services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.PropertyNamingPolicy        = JsonNamingPolicy.CamelCase;
            options.SerializerOptions.PropertyNameCaseInsensitive = true;
        });

        var connStr = cfg["ConnectionStrings:DefaultConnection"]
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");

        // 目前操作者。由 AppRouter 在驗證後設定，AuditLogInterceptor 讀取。
        // 刻意不用 IHttpContextAccessor —— 它在 Functions worker 不會被填充。
        services.AddScoped<CurrentUser>();
        services.AddHttpContextAccessor();

        // ── EF Core + SQL Server（寫入路徑）────────────────────────────────
        // Max Pool Size 需與客戶 Azure SQL 的連線上限、Function App 的
        // maximumInstanceCount 一起算 —— Flex Consumption 每個實例各有一個 pool。
        services.AddScoped<AuditLogInterceptor>();
        services.AddDbContext<AppDbContext>((sp, opt) =>
            opt.UseSqlServer(connStr, sql =>
               {
                   sql.EnableRetryOnFailure(3);
                   sql.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
               })
               .AddInterceptors(sp.GetRequiredService<AuditLogInterceptor>()));

        // ── Dapper IDbConnection（讀取路徑，與 EF 共用同一 connection string）──
        services.AddScoped<IDbConnection>(_ => new SqlConnection(connStr));

        // ── 無狀態服務（Singleton）─────────────────────────────────────────
        services.AddSingleton<IJwtService, JwtService>();
        services.AddSingleton<ImageService>();
        services.AddSingleton<IBlobStorageService, BlobStorageService>();
        // PageSchemaRegistry 是 Singleton：建構只讀資源名稱清單（字串操作），
        // 各個 schema 到用到才 parse。
        services.AddSingleton<PageSchemaRegistry>();
        services.AddSingleton<LoginRateLimiter>();
        services.AddSingleton<ContactRateLimiter>();

        // ── Dapper 讀取服務 ────────────────────────────────────────────────
        services.AddScoped<ICollectionReadService, CollectionReadService>();
        services.AddScoped<IProductReadService, ProductReadService>();
        services.AddScoped<ITaxonomyReadService, TaxonomyReadService>();

        // ── Handlers ──────────────────────────────────────────────────────
        services.AddScoped<HealthHandler>();
        services.AddScoped<AuthHandler>();
        services.AddScoped<UserHandler>();
        services.AddScoped<CollectionHandler>();
        services.AddScoped<ProductHandler>();
        services.AddScoped<TaxonomyHandler>();
        services.AddScoped<MediaHandler>();
        services.AddScoped<PageHandler>();
        services.AddScoped<MediaUsageWriter>();

        // ── Router ────────────────────────────────────────────────────────
        services.AddScoped<AppRouter>();
    })
    .Build();

// ─── 啟動時套用 migration ────────────────────────────────────────────────────
// 首次執行：建立 EuniceMedDb 資料庫 + Schema + Seed Data
// 後續執行：套用 pending migrations（若有）
//
// ⚠️ Flex Consumption 的 app init 有 30 秒硬上限且不可調整。migration 一旦超時，
// 整個 Function App 起不來，而且沒有 deployment slot 可以退。schema 變大之後
// 要定期用冷啟動實測這段耗時。
using (var scope = host.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    // Seed 失敗只記錄、不重拋 —— 種子資料出問題不該讓整個 Function App 起不來
    // （照 Jabez importer 的做法）
    try
    {
        var cfg = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        await AdminUserSeeder.RunAsync(db, cfg);

        // 區段列由 PageSchemas/ 目錄決定，每次啟動同步一次（docs/05 §5）。
        var registry = scope.ServiceProvider.GetRequiredService<PageSchemaRegistry>();
        var sync = await PageSectionSynchronizer.RunAsync(db, registry);
        if (sync.Added.Length + sync.Disabled.Length + sync.Reenabled.Length > 0)
            Console.WriteLine($"[PageSections] 新增 {sync.Added.Length}、停用 {sync.Disabled.Length}、重啟用 {sync.Reenabled.Length}。");
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"[AdminUserSeeder] skipped due to error: {ex.Message}");
    }
}

await host.RunAsync();
