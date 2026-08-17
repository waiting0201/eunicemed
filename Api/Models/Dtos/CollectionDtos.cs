namespace EuniceMed.Api.Models.Dtos;

public sealed record CollectionDto(
    string  Slug,
    string  Name,
    string? Description,
    byte    Strength,
    int     SortOrder);
