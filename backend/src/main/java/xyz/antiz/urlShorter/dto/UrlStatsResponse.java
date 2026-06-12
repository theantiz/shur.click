package xyz.antiz.urlShorter.dto;

public class UrlStatsResponse {

    private String shortCode;
    private String longUrl;
    private Long clickCount;
    private String createdAt;
    private String lastAccessedAt;

    public UrlStatsResponse() {
    }

    public UrlStatsResponse(
            String shortCode,
            String longUrl,
            Long clickCount,
            String createdAt,
            String lastAccessedAt) {
        this.shortCode = shortCode;
        this.longUrl = longUrl;
        this.clickCount = clickCount;
        this.createdAt = createdAt;
        this.lastAccessedAt = lastAccessedAt;
    }

    public String getShortCode() {
        return shortCode;
    }

    public void setShortCode(String shortCode) {
        this.shortCode = shortCode;
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
}
