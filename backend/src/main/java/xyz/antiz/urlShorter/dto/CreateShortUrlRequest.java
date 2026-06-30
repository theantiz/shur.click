package xyz.antiz.urlShorter.dto;

public class CreateShortUrlRequest {

    private String longUrl;
    private String customAlias; // optional
    private String shortDomainMode; // optional: shur or custom

    public CreateShortUrlRequest() {
    }

    public CreateShortUrlRequest(String longUrl, String customAlias) {
        this.longUrl = longUrl;
        this.customAlias = customAlias;
    }

    public String getLongUrl() {
        return longUrl;
    }

    public void setLongUrl(String longUrl) {
        this.longUrl = longUrl;
    }

    public String getCustomAlias() {
        return customAlias;
    }

    public void setCustomAlias(String customAlias) {
        this.customAlias = customAlias;
    }

    public String getShortDomainMode() {
        return shortDomainMode;
    }

    public void setShortDomainMode(String shortDomainMode) {
        this.shortDomainMode = shortDomainMode;
    }
}
