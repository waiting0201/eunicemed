using EuniceMed.Api.Common;
using Microsoft.AspNetCore.Mvc;

namespace EuniceMed.Api.Handlers;

public sealed class HealthHandler
{
    public IActionResult Get() =>
        new OkObjectResult(ApiResponse.Ok(new
        {
            status    = "healthy",
            version   = "1.0.0",
            timestamp = DateTimeOffset.UtcNow,
            runtime   = ".NET 10 / Azure Functions v4 Isolated",
        }, "Service is healthy."));
}
