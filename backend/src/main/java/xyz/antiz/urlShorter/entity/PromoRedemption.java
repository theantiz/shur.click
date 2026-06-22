package xyz.antiz.urlShorter.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Tracks which user has redeemed which promo code.
 * Enforced at the DB level via a unique constraint on (user_id, promo_code_id).
 */
@Entity
@Table(
    name = "promo_redemptions",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_promo_redemption_user_code",
        columnNames = {"user_id", "promo_code_id"}
    )
)
public class PromoRedemption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "promo_code_id", nullable = false)
    private Long promoCodeId;

    @Column(name = "redeemed_at", nullable = false)
    private LocalDateTime redeemedAt = LocalDateTime.now();

    public PromoRedemption() {}

    public PromoRedemption(Long userId, Long promoCodeId) {
        this.userId = userId;
        this.promoCodeId = promoCodeId;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getPromoCodeId() { return promoCodeId; }
    public LocalDateTime getRedeemedAt() { return redeemedAt; }
}
