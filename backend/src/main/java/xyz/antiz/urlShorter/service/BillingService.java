package xyz.antiz.urlShorter.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.antiz.urlShorter.dto.billing.BillingStatusResponse;
import xyz.antiz.urlShorter.entity.PlanTier;
import xyz.antiz.urlShorter.entity.User;
import xyz.antiz.urlShorter.repo.ShortUrlRepository;
import xyz.antiz.urlShorter.repo.UserRepository;

import java.time.LocalDateTime;

@Service
public class BillingService {

    public static final int FREE_TIER_LINK_LIMIT = 5;
    public static final double PRO_MONTHLY_PRICE_USD = 2.0;

    private final UserRepository users;
    private final ShortUrlRepository urls;

    public BillingService(UserRepository users, ShortUrlRepository urls) {
        this.users = users;
        this.urls = urls;
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
}
