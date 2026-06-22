package xyz.antiz.urlShorter.dto.billing;

import java.time.LocalDateTime;

public class RedeemPromoResponse {
    public String message;
    public LocalDateTime proExpiresAt;

    public RedeemPromoResponse(String message, LocalDateTime proExpiresAt) {
        this.message = message;
        this.proExpiresAt = proExpiresAt;
    }
}
