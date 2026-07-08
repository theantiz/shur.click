package xyz.antiz.urlShorter.dto;

public class CreateShortUrlResponse {

    private Long id;
    private String shortCode;
    private String shortUrl;
    private String shortBaseUrl;
    private String longUrl;
    private Long clickCount;
    private String createdAt;
    private String lastAccessedAt;
    private Boolean masked;
    private Integer maskedLinksRemaining;

    public CreateShortUrlResponse() {
    }

    public CreateShortUrlResponse(
            Long id,
            String shortCode,
            String shortUrl,
            String shortBaseUrl,
            String longUrl,
            Long clickCount,
            String createdAt,
            String lastAccessedAt,
            Boolean masked,
            Integer maskedLinksRemaining
    ) {
        this.id = id;
        this.shortCode = shortCode;
        this.shortUrl = shortUrl;
        this.shortBaseUrl = shortBaseUrl;
        this.longUrl = longUrl;
        this.clickCount = clickCount;
        this.createdAt = createdAt;
        this.lastAccessedAt = lastAccessedAt;
        this.masked = masked;
        this.maskedLinksRemaining = maskedLinksRemaining;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getShortCode() {
        return shortCode;
    }

    public void setShortCode(String shortCode) {
        this.shortCode = shortCode;
    }

    public String getShortUrl() {
        return shortUrl;
    }

    public void setShortUrl(String shortUrl) {
        this.shortUrl = shortUrl;
    }

    public String getShortBaseUrl() {
        return shortBaseUrl;
    }

    public void setShortBaseUrl(String shortBaseUrl) {
        this.shortBaseUrl = shortBaseUrl;
    }

    public String getLongUrl() {
        return longUrl;
    }

    public void setLongUrl(String longUrl) {
        this.longUrl = longUrl;
    }

    public Long getClickCount() {
        return clickCount;
    }

    public void setClickCount(Long clickCount) {
        this.clickCount = clickCount;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getLastAccessedAt() {
        return lastAccessedAt;
    }

    public void setLastAccessedAt(String lastAccessedAt) {
        this.lastAccessedAt = lastAccessedAt;
    }

    public Boolean getMasked() {
        return masked;
    }

    public void setMasked(Boolean masked) {
        this.masked = masked;
    }

    public Integer getMaskedLinksRemaining() {
        return maskedLinksRemaining;
    }

    public void setMaskedLinksRemaining(Integer maskedLinksRemaining) {
        this.maskedLinksRemaining = maskedLinksRemaining;
    }
}
