package xyz.antiz.urlShorter.entity;

import jakarta.persistence.*;
import xyz.antiz.urlShorter.util.IstDateTime;

import java.time.LocalDateTime;

@Entity
@Table(name = "url_click_events")
public class UrlClickEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "short_url_id", nullable = false)
    private Long shortUrlId;

    @Column(name = "country_code", nullable = false, length = 8)
    private String countryCode;

    @Column(name = "clicked_at", nullable = false)
    private LocalDateTime clickedAt = IstDateTime.now();

    public UrlClickEvent() {
    }

    public UrlClickEvent(Long shortUrlId, String countryCode) {
        this.shortUrlId = shortUrlId;
        this.countryCode = countryCode;
        this.clickedAt = IstDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getShortUrlId() {
        return shortUrlId;
    }

    public void setShortUrlId(Long shortUrlId) {
        this.shortUrlId = shortUrlId;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public void setCountryCode(String countryCode) {
        this.countryCode = countryCode;
    }

    public LocalDateTime getClickedAt() {
        return clickedAt;
    }

    public void setClickedAt(LocalDateTime clickedAt) {
        this.clickedAt = clickedAt;
    }
}
