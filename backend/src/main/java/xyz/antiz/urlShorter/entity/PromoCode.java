package xyz.antiz.urlShorter.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "promo_codes")
public class PromoCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    /** Number of months of Pro to grant per redemption. */
    @Column(nullable = false)
    private int durationMonths = 2;

    /** Maximum number of redemptions allowed. -1 = unlimited. */
    @Column(nullable = false)
    private int maxUses = -1;

    @Column(nullable = false)
    private int useCount = 0;

    /** When the promo code itself expires (null = never). */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean active = true;

    public PromoCode() {}

    public PromoCode(String code, int durationMonths, int maxUses) {
        this.code = code;
        this.durationMonths = durationMonths;
        this.maxUses = maxUses;
    }

    // --- Getters & Setters ---

    public Long getId() { return id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public int getDurationMonths() { return durationMonths; }
    public void setDurationMonths(int durationMonths) { this.durationMonths = durationMonths; }

    public int getMaxUses() { return maxUses; }
    public void setMaxUses(int maxUses) { this.maxUses = maxUses; }

    public int getUseCount() { return useCount; }
    public void setUseCount(int useCount) { this.useCount = useCount; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
