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
}

public sealed class BlobStorageService : IBlobStorageService
{
    private readonly Lazy<BlobServiceClient> _client;
    private readonly string _mediaContainer;
    private readonly string _originalsContainer;
    private readonly string? _publicBaseUrl;
    private readonly string  _connectionString;

    /// <summary>
    /// 媒體檔名帶內容雜湊，內容變了檔名就變 —— 因此可以放心設 immutable。
    /// 這是本站沒有 CDN 之下唯一的邊緣快取手段（docs/07 §1.1、§7.3）。
    /// </summary>
    private const string ImmutableCache = "public, max-age=31536000, immutable";

    public BlobStorageService(IConfiguration cfg)
    {
        _connectionString   = cfg["BlobStorageConnection"] ?? "UseDevelopmentStorage=true";
        _mediaContainer     = cfg["Storage:MediaContainer"] ?? "media";
        _originalsContainer = cfg["Storage:OriginalsContainer"] ?? "media-originals";
        _publicBaseUrl      = cfg["Storage:PublicBaseUrl"];

        // Lazy：不要在 Program.cs 建立客戶端。Flex Consumption 的 app init 有 30 秒
        // 硬上限，啟動路徑上不做任何可以延後的事（docs/07 §5.1）。
        //
        // 正式環境應改用 ManagedIdentityCredential 明確指定，**不要用
        // DefaultAzureCredential** —— 它會依序探測多種來源，每次失敗探測都有 timeout，
        // 冷啟動時會平白多好幾秒。
        _client = new Lazy<BlobServiceClient>(() => new BlobServiceClient(_connectionString));
    }

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

    public Task<(string, string)> CreateUploadSasAsync(string fileName, TimeSpan validFor)
    {
        var blob = _client.Value.GetBlobContainerClient(_mediaContainer).GetBlobClient(fileName);

        if (!blob.CanGenerateSasUri)
            throw new InvalidOperationException(
                "無法產生 SAS —— 使用 Managed Identity 時需改用 user delegation key。");

        var sas = new BlobSasBuilder
        {
            BlobContainerName = _mediaContainer,
            BlobName          = fileName,
            Resource          = "b",
            ExpiresOn         = DateTimeOffset.UtcNow.Add(validFor),
        };
        sas.SetPermissions(BlobSasPermissions.Create | BlobSasPermissions.Write);

        var uploadUrl = blob.GenerateSasUri(sas).ToString();
        return Task.FromResult((uploadUrl, PublicUrl(_mediaContainer, fileName, blob.Uri.ToString())));
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
