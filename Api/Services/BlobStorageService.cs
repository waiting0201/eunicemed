using Azure.Identity;
using Azure.Storage;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.Extensions.Configuration;

namespace EuniceMed.Api.Services;

public interface IBlobStorageService
{
    /// <summary>上傳到公開的 media 容器，回傳可直接對外的絕對網址。</summary>
    Task<string> UploadMediaAsync(string fileName, byte[] content, string contentType, CancellationToken ct = default);

    /// <summary>上傳原檔到私有的 media-originals 容器（供 reprocess 用）。</summary>
    Task<string> UploadOriginalAsync(string fileName, byte[] content, string contentType, CancellationToken ct = default);

    Task DeleteAsync(string blobUrl, CancellationToken ct = default);

    /// <summary>PDF 直傳用的寫入 SAS，避免大檔佔用 Function。</summary>
    Task<(string UploadUrl, string BlobUrl)> CreateUploadSasAsync(string fileName, TimeSpan validFor);

    Task EnsureContainersAsync(CancellationToken ct = default);

    /// <summary>
    /// 直傳完成後用來確認 blob 真的在，並取回它**實際**的大小與型別。
    /// 大小不採信前端回報的數字 —— 那是還沒上傳完就可以送出的值。
    /// </summary>
    Task<(bool Exists, long SizeBytes, string ContentType)> GetMediaBlobInfoAsync(
        string fileName, CancellationToken ct = default);
}

public sealed class BlobStorageService : IBlobStorageService
{
    private readonly Lazy<BlobServiceClient> _client;
    private readonly string  _mediaContainer;
    private readonly string  _originalsContainer;
    private readonly string? _publicBaseUrl;
    private readonly string? _connectionString;
    private readonly string? _accountName;

    /// <summary>
    /// 媒體檔名帶內容雜湊，內容變了檔名就變 —— 因此可以放心設 immutable。
    /// 這是本站沒有 CDN 之下唯一的邊緣快取手段（docs/07 §1.1、§7.3）。
    /// </summary>
    private const string ImmutableCache = "public, max-age=31536000, immutable";

    public BlobStorageService(IConfiguration cfg)
    {
        _connectionString   = cfg["BlobStorageConnection"];
        _accountName        = cfg["Storage:AccountName"];
        _mediaContainer     = cfg["Storage:MediaContainer"] ?? "media";
        _originalsContainer = cfg["Storage:OriginalsContainer"] ?? "media-originals";
        _publicBaseUrl      = cfg["Storage:PublicBaseUrl"];

        // 兩個都沒設就是設定漏了。**不要默默退回 Azurite** ——
        // 那會讓正式站啟動成功、上傳成功、然後圖片指向一個不存在的 127.0.0.1。
        if (string.IsNullOrWhiteSpace(_connectionString) && string.IsNullOrWhiteSpace(_accountName))
            throw new InvalidOperationException(
                "缺少儲存體設定：需要 BlobStorageConnection（連線字串）或 Storage__AccountName（Managed Identity）。");

        // Lazy：不要在 Program.cs 建立客戶端。Flex Consumption 的 app init 有 30 秒
        // 硬上限，啟動路徑上不做任何可以延後的事（docs/07 §5.1）。
        //
        // 正式環境應改用 ManagedIdentityCredential 明確指定，**不要用
        // DefaultAzureCredential** —— 它會依序探測多種來源，每次失敗探測都有 timeout，
        // 冷啟動時會平白多好幾秒。
        _client = new Lazy<BlobServiceClient>(CreateClient);
    }

    /// <summary>
    /// 有連線字串就用連線字串（本機 Azurite、或客戶只給金鑰時），
    /// 否則以 Managed Identity 連 <c>Storage__AccountName</c> 指向的帳戶。
    /// </summary>
    private BlobServiceClient CreateClient() =>
        string.IsNullOrWhiteSpace(_connectionString)
            ? new BlobServiceClient(
                new Uri($"https://{_accountName}.blob.core.windows.net"),
                new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned))
            : new BlobServiceClient(_connectionString);

    public async Task EnsureContainersAsync(CancellationToken ct = default)
    {
        // media 為匿名讀取（訪客瀏覽器直接抓圖）；originals 為私有
        await _client.Value.GetBlobContainerClient(_mediaContainer)
            .CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: ct);

        await _client.Value.GetBlobContainerClient(_originalsContainer)
            .CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: ct);
    }

    public Task<string> UploadMediaAsync(string fileName, byte[] content, string contentType, CancellationToken ct = default)
        => UploadAsync(_mediaContainer, fileName, content, contentType, ImmutableCache, ct);

    public Task<string> UploadOriginalAsync(string fileName, byte[] content, string contentType, CancellationToken ct = default)
        => UploadAsync(_originalsContainer, fileName, content, contentType, cacheControl: null, ct);

    private async Task<string> UploadAsync(
        string container, string fileName, byte[] content, string contentType, string? cacheControl, CancellationToken ct)
    {
        var blob = _client.Value.GetBlobContainerClient(container).GetBlobClient(fileName);

        await blob.UploadAsync(new BinaryData(content), new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders
            {
                ContentType  = contentType,
                CacheControl = cacheControl,
            },
        }, ct);

        return PublicUrl(container, fileName, blob.Uri.ToString());
    }

    public async Task DeleteAsync(string blobUrl, CancellationToken ct = default)
    {
        var name = Path.GetFileName(new Uri(blobUrl).AbsolutePath);
        await _client.Value.GetBlobContainerClient(_mediaContainer)
            .GetBlobClient(name).DeleteIfExistsAsync(cancellationToken: ct);
    }

    public async Task<(bool Exists, long SizeBytes, string ContentType)> GetMediaBlobInfoAsync(
        string fileName, CancellationToken ct = default)
    {
        var blob = _client.Value.GetBlobContainerClient(_mediaContainer).GetBlobClient(fileName);

        if (!await blob.ExistsAsync(ct)) return (false, 0, string.Empty);

        var props = await blob.GetPropertiesAsync(cancellationToken: ct);
        return (true, props.Value.ContentLength, props.Value.ContentType ?? string.Empty);
    }

    public async Task<(string, string)> CreateUploadSasAsync(string fileName, TimeSpan validFor)
    {
        var blob = _client.Value.GetBlobContainerClient(_mediaContainer).GetBlobClient(fileName);

        var expiresOn = DateTimeOffset.UtcNow.Add(validFor);
        var sas = new BlobSasBuilder
        {
            BlobContainerName = _mediaContainer,
            BlobName          = fileName,
            Resource          = "b",
            ExpiresOn         = expiresOn,
        };
        sas.SetPermissions(BlobSasPermissions.Create | BlobSasPermissions.Write);

        // 用連線字串時客戶端手上有帳戶金鑰，可以直接簽。
        var uploadUrl = blob.CanGenerateSasUri
            ? blob.GenerateSasUri(sas).ToString()
            // Managed Identity 沒有金鑰可簽，改跟服務要 user delegation key。
            // 這需要 **Storage Blob Delegator** 角色 —— Blob Data Owner 不含這個動作，
            // 少了它 PDF 直傳會在正式站失敗而本機正常（infra/main.bicep 已一併指派）。
            : await CreateUserDelegationSasAsync(blob, sas, expiresOn);

        return (uploadUrl, PublicUrl(_mediaContainer, fileName, blob.Uri.ToString()));
    }

    private async Task<string> CreateUserDelegationSasAsync(
        BlobClient blob, BlobSasBuilder sas, DateTimeOffset expiresOn)
    {
        // 起始時間往前挪一點，避免與 Azure 之間的時鐘差讓 SAS 尚未生效
        var key = await _client.Value.GetUserDelegationKeyAsync(
            DateTimeOffset.UtcNow.AddMinutes(-5), expiresOn);

        var query = sas.ToSasQueryParameters(key.Value, _accountName).ToString();
        return $"{blob.Uri}?{query}";
    }

    /// <summary>
    /// 對外網址。本機用 Azurite 的位址，正式環境用 Storage 帳戶的公開網域。
    /// 設定 <c>Storage__PublicBaseUrl</c> 可覆寫（例如日後真的加了 CDN）。
    /// </summary>
    private string PublicUrl(string container, string fileName, string fallback) =>
        _publicBaseUrl is not null && container == _mediaContainer
            ? $"{_publicBaseUrl.TrimEnd('/')}/{fileName}"
            : fallback;
}
