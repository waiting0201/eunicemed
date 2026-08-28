using EuniceMed.Api.Common;
using EuniceMed.Api.Data;
using EuniceMed.Api.Models.Entities;
using EuniceMed.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EuniceMed.Api.Handlers;

/// <summary>
/// 表單來信：公開的 <c>POST /contact</c> 與後台收件匣。
///
/// <para>
/// 三支前台表單（Contact、產品詢價、Partnership）都走同一個 Server Action，
/// 送同一個形狀過來，由 <c>type</c> 分流 —— 所以這裡只有一個入口。
/// </para>
///
/// <para>
/// **先入庫再寄信，寄信失敗不回錯**（CLAUDE.md §7 已封閉決議）。收件匣是真相來源，
/// 通知信只是提醒。SMTP 未設定時 <see cref="EmailSender"/> 只記 log —— 因此這支端點
/// 不等 SMTP 帳密就能上線，三支表單也就不必繼續壞著。
/// </para>
///
/// <para>
/// ⚠️ 目前的防濫用只有三道：前台的蜜罐欄位、行程內的 IP token bucket
/// （<see cref="ContactRateLimiter"/>，跨實例無效），以及必填檢查。
/// reCAPTCHA 的版本與 site key 尚未拍板（CLAUDE.md §7），還沒接。
/// </para>
/// </summary>
public sealed class ContactHandler(
    AppDbContext        db,
    ContactRateLimiter  rateLimiter,
    EmailSender         email)
{
    // ── 公開 ───────────────────────────────────────────────────────────────

    public async Task<IActionResult> SubmitAsync(HttpRequest req)
    {
        // 分區鍵取自 X-Forwarded-For，不是 body 的 ipAddress —— 後者是送件端自己填的
        if (!rateLimiter.TryAcquire(IpRateLimiter.ClientIp(req)))
            throw AppException.TooManyRequests("送出太頻繁，請稍後再試。");

        var body = await AdminWrite.ReadAsync<SubmitContactRequest>(req);

        var name    = Trim(body.Name);
        var mail    = Trim(body.Email);
        var message = Trim(body.Message);

        if (name is null || mail is null || message is null)
            throw AppException.BadRequest("name、email 與 message 為必填。");
        if (!mail.Contains('@'))
            throw AppException.BadRequest("email 格式不正確。");

        var entity = new ContactSubmission
        {
            Type            = ParseType(body.Type),
            Name            = name,
            Email           = mail,
            Phone           = Trim(body.Phone),
            Company         = Trim(body.Company),
            Country         = Trim(body.Country),
            PartnershipType = Trim(body.PartnershipType),
            ProductSku      = Trim(body.ProductSku),
            Subject         = Trim(body.Subject),
            Message         = message,
            Locale          = body.Locale is null ? null : Locales.Normalize(body.Locale),
            // 記錄用，不可信 —— 見 ContactSubmission.IpAddress
            IpAddress       = Trim(body.IpAddress) ?? IpRateLimiter.ClientIp(req),
        };

        // 產品詢價：以 SKU 反查產品。查不到就只留快照 —— 舊網址、改過型號的產品
        // 都可能對不上，而那不是拒絕這封信的理由
        if (entity.Type == ContactType.Product && entity.ProductSku is { } sku)
            entity.ProductId = await db.Products
                .Where(p => p.Sku == sku).Select(p => (Guid?)p.Id).FirstOrDefaultAsync();

        db.ContactSubmissions.Add(entity);
        await db.SaveChangesAsync();   // ← 入庫成功就是送件成功

        await email.SendAsync(NotificationSubject(entity), NotificationBody(entity));

        return new ObjectResult(ApiResponse.Ok(new { id = entity.Id }, "訊息已送出。")) { StatusCode = 201 };
    }

    // ── 後台收件匣 ─────────────────────────────────────────────────────────

    public async Task<IActionResult> GetListAsync(HttpRequest req)
    {
        var query = db.ContactSubmissions.AsNoTracking();

        if (ProductHandler.Nullable(req.Query["type"]) is { } type)
            query = query.Where(x => x.Type == ParseType(type));
        if (ProductHandler.Nullable(req.Query["status"]) is { } status)
            query = query.Where(x => x.Status == ParseStatus(status));

        var total = await query.CountAsync();
        var (page, pageSize) = ProductHandler.Paging(req);

        var rows = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => ToListDto(x))
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(total / (double)pageSize);
        return new OkObjectResult(ApiResponse.Ok(
            new PagedResult<ContactListItem>(rows, total, page, pageSize, totalPages)));
    }

    public async Task<IActionResult> GetAsync(string id)
    {
        var entity = await db.ContactSubmissions.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == AdminWrite.ParseId(id, "submission"))
            ?? throw AppException.NotFound("Contact submission");

        return new OkObjectResult(ApiResponse.Ok(ToDetailDto(entity)));
    }

    /// <summary>
    /// PATCH /admin/contact-submissions/{id} —— 只改狀態。
    /// 來信的內容是訪客寫的，後台沒有任何理由能改它。
    /// </summary>
    public async Task<IActionResult> UpdateStatusAsync(HttpRequest req, string id)
    {
        var body = await AdminWrite.ReadAsync<UpdateContactStatusRequest>(req);
        var entity = await db.ContactSubmissions
            .FirstOrDefaultAsync(x => x.Id == AdminWrite.ParseId(id, "submission"))
            ?? throw AppException.NotFound("Contact submission");

        entity.Status = ParseStatus(body.Status ?? throw AppException.BadRequest("status 為必填。"));
        await db.SaveChangesAsync();

        return new OkObjectResult(ApiResponse.Ok(ToDetailDto(entity), "狀態已更新。"));
    }

    /// <summary>
    /// GET /admin/contact-submissions/export —— 整批 CSV。
    /// 收件匣唯一能離線處理的出口：轉給業務、對帳、留存都靠它。
    /// </summary>
    public async Task<IActionResult> ExportAsync(HttpRequest req)
    {
        var query = db.ContactSubmissions.AsNoTracking();
        if (ProductHandler.Nullable(req.Query["type"]) is { } type)
            query = query.Where(x => x.Type == ParseType(type));
        if (ProductHandler.Nullable(req.Query["status"]) is { } status)
            query = query.Where(x => x.Status == ParseStatus(status));

        var rows = await query.OrderByDescending(x => x.CreatedAt).ToListAsync();

        var csv = new System.Text.StringBuilder();
        csv.AppendLine("CreatedAt,Type,Status,Name,Email,Phone,Company,Country,PartnershipType,ProductSku,Subject,Message,Locale");
        foreach (var r in rows)
            csv.AppendLine(string.Join(',', new[]
            {
                r.CreatedAt.ToString("o"), TypeName(r.Type), StatusName(r.Status),
                r.Name, r.Email, r.Phone, r.Company, r.Country, r.PartnershipType,
                r.ProductSku, r.Subject, r.Message, r.Locale,
            }.Select(Csv)));

        // BOM：Excel 沒有它會把中文的 UTF-8 讀成亂碼，而這份檔就是要給人用 Excel 開的
        return new ContentResult
        {
            Content     = "﻿" + csv,
            ContentType = "text/csv; charset=utf-8",
            StatusCode  = 200,
        };
    }

    /// <summary>側欄徽章用的未處理筆數。</summary>
    public Task<int> CountPendingAsync() =>
        db.ContactSubmissions.CountAsync(x => x.Status == ContactStatus.Received);

    // ── 對照 ───────────────────────────────────────────────────────────────

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    private static byte ParseType(string? raw) => raw?.ToLowerInvariant() switch
    {
        null or "" or "general" or "0" => ContactType.General,
        "product"     or "1" => ContactType.Product,
        "partnership" or "2" => ContactType.Partnership,
        _ => throw AppException.BadRequest($"未知的 type：{raw}（general / product / partnership）。"),
    };

    private static byte ParseStatus(string raw) => raw.ToLowerInvariant() switch
    {
        "received" or "0" => ContactStatus.Received,
        "handled"  or "1" => ContactStatus.Handled,
        "spam"     or "2" => ContactStatus.Spam,
        _ => throw AppException.BadRequest($"未知的 status：{raw}（received / handled / spam）。"),
    };

    private static string TypeName(byte t) => t switch
    {
        ContactType.Product     => "product",
        ContactType.Partnership => "partnership",
        _                       => "general",
    };

    private static string StatusName(byte s) => s switch
    {
        ContactStatus.Handled => "handled",
        ContactStatus.Spam    => "spam",
        _                     => "received",
    };

    /// <summary>CSV 欄位：一律加引號並把內部引號加倍，訊息裡的逗號與換行才不會撐破欄位。</summary>
    private static string Csv(string? v) => $"\"{(v ?? string.Empty).Replace("\"", "\"\"")}\"";

    private static ContactListItem ToListDto(ContactSubmission x) => new(
        x.Id, TypeName(x.Type), StatusName(x.Status), x.Name, x.Email,
        x.Company, x.Subject, x.ProductSku, x.Locale, x.CreatedAt);

    private static ContactDetail ToDetailDto(ContactSubmission x) => new(
        x.Id, TypeName(x.Type), StatusName(x.Status), x.Name, x.Email, x.Phone,
        x.Company, x.Country, x.PartnershipType, x.ProductId, x.ProductSku,
        x.Subject, x.Message, x.Locale, x.IpAddress, x.CreatedAt);

    private static string NotificationSubject(ContactSubmission x) =>
        $"[EuniceMed] {TypeName(x.Type)} enquiry from {x.Name}";

    private static string NotificationBody(ContactSubmission x) => string.Join('\n', new[]
    {
        $"Type:    {TypeName(x.Type)}",
        $"Name:    {x.Name}",
        $"Email:   {x.Email}",
        x.Phone           is null ? null : $"Phone:   {x.Phone}",
        x.Company         is null ? null : $"Company: {x.Company}",
        x.Country         is null ? null : $"Country: {x.Country}",
        x.PartnershipType is null ? null : $"Partner: {x.PartnershipType}",
        x.ProductSku      is null ? null : $"Product: {x.ProductSku}",
        x.Subject         is null ? null : $"Subject: {x.Subject}",
        $"Locale:  {x.Locale}",
        "",
        x.Message,
    }.Where(l => l is not null));
}

public sealed record SubmitContactRequest(
    string? Type, string? Name, string? Email, string? Phone, string? Company,
    string? Country, string? PartnershipType, string? ProductSku, string? Subject,
    string? Message, string? Locale, string? IpAddress);

public sealed record UpdateContactStatusRequest(string? Status);

public sealed record ContactListItem(
    Guid Id, string Type, string Status, string Name, string Email,
    string? Company, string? Subject, string? ProductSku, string? Locale, DateTime CreatedAt);

public sealed record ContactDetail(
    Guid Id, string Type, string Status, string Name, string Email, string? Phone,
    string? Company, string? Country, string? PartnershipType, Guid? ProductId,
    string? ProductSku, string? Subject, string Message, string? Locale,
    string? IpAddress, DateTime CreatedAt);
