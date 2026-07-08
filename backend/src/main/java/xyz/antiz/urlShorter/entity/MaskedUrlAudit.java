package xyz.antiz.urlShorter.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "masked_url_audits")
public class MaskedUrlAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long shortUrlId;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 2048)
    private String targetUrl;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false, length = 32)
    private String safeBrowsingCheckResult;

    public MaskedUrlAudit() {
    }

    public MaskedUrlAudit(Long shortUrlId, Long userId, String targetUrl, String safeBrowsingCheckResult) {
        this.shortUrlId = shortUrlId;
        this.userId = userId;
        this.targetUrl = targetUrl;
        this.safeBrowsingCheckResult = safeBrowsingCheckResult;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getShortUrlId() {
        return shortUrlId;
    }

    public void setShortUrlId(Long shortUrlId) {
        this.shortUrlId = shortUrlId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getTargetUrl() {
        return targetUrl;
    }

    public void setTargetUrl(String targetUrl) {
        this.targetUrl = targetUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getSafeBrowsingCheckResult() {
        return safeBrowsingCheckResult;
    }

    public void setSafeBrowsingCheckResult(String safeBrowsingCheckResult) {
        this.safeBrowsingCheckResult = safeBrowsingCheckResult;
    }
}
