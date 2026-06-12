package xyz.antiz.urlShorter.dto;

import java.util.List;

public class UrlGeoAnalyticsResponse {
    public String shortCode;
    public long totalClicks;
    public long countryTrackedClicks;
    public List<CountryClicks> topCountries;

    public UrlGeoAnalyticsResponse(
            String shortCode,
            long totalClicks,
            long countryTrackedClicks,
            List<CountryClicks> topCountries
    ) {
        this.shortCode = shortCode;
        this.totalClicks = totalClicks;
        this.countryTrackedClicks = countryTrackedClicks;
        this.topCountries = topCountries;
    }

    public static class CountryClicks {
        public String countryCode;
        public long clicks;

        public CountryClicks(String countryCode, long clicks) {
            this.countryCode = countryCode;
            this.clicks = clicks;
        }
    }
}
