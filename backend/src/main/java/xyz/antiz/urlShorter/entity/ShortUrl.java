package xyz.antiz.urlShorter.entity;

import jakarta.persistence.*;
import xyz.antiz.urlShorter.util.IstDateTime;

import java.time.LocalDateTime;

@Entity
@Table(name = "short_urls")
public class ShortUrl {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 2048)
    private String longUrl;

    @Column(nullable = false, unique = true, length = 32)
    private String shortCode;

    @Column(nullable = false)
    private Long clickCount = 0L;

    @Column(nullable = false)
    private LocalDateTime createdAt = IstDateTime.now();

    private LocalDateTime lastAccessedAt;

    public ShortUrl() {
    }

    public ShortUrl(
            Long id,
            Long userId,
            String longUrl,
            String shortCode,
            Long clickCount,
            LocalDateTime createdAt,
            LocalDateTime lastAccessedAt) {
        this.id = id;
        this.userId = userId;
        this.longUrl = longUrl;
        this.shortCode = shortCode;
        this.clickCount = clickCount;
        this.createdAt = createdAt;
        this.lastAccessedAt = lastAccessedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getLongUrl() {
        return longUrl;
    }

    public void setLongUrl(String longUrl) {
        this.longUrl = longUrl;
    }

    public String getShortCode() {
        return shortCode;
    }

    public void setShortCode(String shortCode) {
        this.shortCode = shortCode;
    }

    public Long getClickCount() {
        return clickCount;
    }

    public void setClickCount(Long clickCount) {
        this.clickCount = clickCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getLastAccessedAt() {
        return lastAccessedAt;
    }

    public void setLastAccessedAt(LocalDateTime lastAccessedAt) {
        this.lastAccessedAt = lastAccessedAt;
    }
}
