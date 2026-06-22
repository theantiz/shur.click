package xyz.antiz.urlShorter.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import xyz.antiz.urlShorter.dto.billing.BillingStatusResponse;
import xyz.antiz.urlShorter.dto.billing.RedeemPromoResponse;
import xyz.antiz.urlShorter.entity.PlanTier;
import xyz.antiz.urlShorter.entity.PromoCode;
import xyz.antiz.urlShorter.entity.PromoRedemption;
import xyz.antiz.urlShorter.entity.User;
import xyz.antiz.urlShorter.repo.PromoCodeRepository;
import xyz.antiz.urlShorter.repo.PromoRedemptionRepository;
import xyz.antiz.urlShorter.repo.ShortUrlRepository;
import xyz.antiz.urlShorter.repo.UserRepository;

import java.time.LocalDateTime;

@Service
public class BillingService {

    public static final int FREE_TIER_LINK_LIMIT = 5;
    public static final double PRO_MONTHLY_PRICE_USD = 2.0;

    private final UserRepository users;
    private final ShortUrlRepository urls;
    private final PromoCodeRepository promoCodes;
    private final PromoRedemptionRepository promoRedemptions;

    public BillingService(UserRepository users, ShortUrlRepository urls,
                          PromoCodeRepository promoCodes, PromoRedemptionRepository promoRedemptions) {
        this.users = users;
        this.urls = urls;
        this.promoCodes = promoCodes;
        this.promoRedemptions = promoRedemptions;
    }

    @Transactional(readOnly = true)
    public BillingStatusResponse getStatus(Long userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        long usedLinks = urls.countByUserId(userId);
        boolean proActive = user.isProActive();
        Long remaining = proActive ? null : Math.max(0, FREE_TIER_LINK_LIMIT - usedLinks);

        return new BillingStatusResponse(
                proActive ? PlanTier.PRO.name() : PlanTier.FREE.name(),
                usedLinks,
                FREE_TIER_LINK_LIMIT,
                remaining,
                PRO_MONTHLY_PRICE_USD,
                user.getProExpiresAt(),
                proActive
        );
    }

    @Transactional
    public BillingStatusResponse subscribeProMonthly(Long userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        activateProMonthly(user);
        return getStatus(userId);
    }

    @Transactional(readOnly = true)
    public User getUser(Long userId) {
        return users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    @Transactional
    public void activateProMonthlyByUserId(Long userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        activateProMonthly(user);
    }

    private void activateProMonthly(User user) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime base = user.getProExpiresAt() != null && user.getProExpiresAt().isAfter(now)
                ? user.getProExpiresAt()
                : now;

        user.setPlanTier(PlanTier.PRO);
        user.setProExpiresAt(base.plusDays(30));
        users.save(user);
    }

    @Transactional
    public RedeemPromoResponse redeemPromo(Long userId, String rawCode) {
        String code = rawCode == null ? "" : rawCode.trim();

        PromoCode promo = promoCodes.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid promo code"));

        if (!promo.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This promo code is no longer active");
        }
        if (promo.getExpiresAt() != null && promo.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This promo code has expired");
        }
        if (promo.getMaxUses() >= 0 && promo.getUseCount() >= promo.getMaxUses()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This promo code has reached its usage limit");
        }

        // Prevent the same user from redeeming the same code more than once
        if (promoRedemptions.existsByUserIdAndPromoCodeId(userId, promo.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You have already redeemed this promo code");
        }

        User user = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Grant durationMonths × 30 days of Pro, stacking on top of any existing Pro expiry
        for (int i = 0; i < promo.getDurationMonths(); i++) {
            activateProMonthly(user);
            // Reload so each call stacks correctly
            user = users.findById(userId).orElseThrow();
        }

        promo.setUseCount(promo.getUseCount() + 1);
        promoCodes.save(promo);

        // Record the redemption so this user cannot redeem the same code again
        promoRedemptions.save(new PromoRedemption(userId, promo.getId()));

        return new RedeemPromoResponse(
                "🎉 Promo applied! You now have " + promo.getDurationMonths() + " months of Pro access.",
                user.getProExpiresAt()
        );
    }
}
