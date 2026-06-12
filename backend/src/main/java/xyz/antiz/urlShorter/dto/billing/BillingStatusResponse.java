package xyz.antiz.urlShorter.dto.billing;

import java.time.LocalDateTime;

public class BillingStatusResponse {
    public String planTier;
    public long usedLinks;
    public int freeTierLimit;
    public Long remainingFreeLinks;
    public Double proMonthlyPriceUsd;
    public LocalDateTime proExpiresAt;
    public boolean proActive;

    public BillingStatusResponse(
            String planTier,
            long usedLinks,
            int freeTierLimit,
            Long remainingFreeLinks,
            Double proMonthlyPriceUsd,
            LocalDateTime proExpiresAt,
            boolean proActive
    ) {
        this.planTier = planTier;
        this.usedLinks = usedLinks;
        this.freeTierLimit = freeTierLimit;
        this.remainingFreeLinks = remainingFreeLinks;
        this.proMonthlyPriceUsd = proMonthlyPriceUsd;
        this.proExpiresAt = proExpiresAt;
        this.proActive = proActive;
    }
}
