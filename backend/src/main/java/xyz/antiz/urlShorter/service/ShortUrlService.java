package xyz.antiz.urlShorter.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.antiz.urlShorter.dto.UrlGeoAnalyticsResponse;
import xyz.antiz.urlShorter.entity.CustomDomain;
import xyz.antiz.urlShorter.entity.DomainStatus;
import xyz.antiz.urlShorter.entity.ShortUrl;
import xyz.antiz.urlShorter.entity.UrlClickEvent;
import xyz.antiz.urlShorter.entity.User;
import xyz.antiz.urlShorter.repo.CustomDomainRepository;
import xyz.antiz.urlShorter.repo.ShortUrlRepository;
import xyz.antiz.urlShorter.repo.UrlClickEventRepository;
import xyz.antiz.urlShorter.repo.UserRepository;
import xyz.antiz.urlShorter.repo.MaskedUrlAuditRepository;
import xyz.antiz.urlShorter.entity.MaskedUrlAudit;
import xyz.antiz.urlShorter.exception.MaskingQuotaExceededException;
import xyz.antiz.urlShorter.exception.MaskingRequiresAuthException;
import xyz.antiz.urlShorter.exception.MaskingTargetFlaggedException;
import xyz.antiz.urlShorter.util.IstDateTime;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class ShortUrlService {

    public record ResolvedUrl(String longUrl, boolean masked) {}

    private final ShortUrlRepository repo;
    private final UserRepository users;
    private final UrlClickEventRepository clickEvents;
    private final UrlLookupCacheService urlLookupCache;
    private final CustomDomainRepository customDomains;
    private final MaskedUrlAuditRepository maskedAudits;
    private final SafeBrowsingCheckService safeBrowsing;
    private final String publicBaseUrl;
    private final int maskingFreeLimit;
    private final int maskingProLimit;
    private final SecureRandom random = new SecureRandom();
    private final ExecutorService trackingExecutor = Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors() * 2);
    private static final String CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final int FREE_TIER_LINK_LIMIT = 5;
    private static final int GUEST_LINK_LIMIT = 2;
    private static final String GUEST_EMAIL = "guest@shur.click";

    private static final String GUEST_NAME = "Guest User";
    private static final String GUEST_PASSWORD_HASH = "GUEST_ACCOUNT_DISABLED";

    public ShortUrlService(
            ShortUrlRepository repo,
            UserRepository users,
            UrlClickEventRepository clickEvents,
            UrlLookupCacheService urlLookupCache,
            CustomDomainRepository customDomains,
            MaskedUrlAuditRepository maskedAudits,
            SafeBrowsingCheckService safeBrowsing,
            @Value("${app.public.base-url:https://shur.click}") String publicBaseUrl,
            @Value("${masking.free.lifetime.limit:2}") int maskingFreeLimit,
            @Value("${masking.pro.limit:-1}") int maskingProLimit
    ) {
        this.repo = repo;
        this.users = users;
        this.clickEvents = clickEvents;
        this.urlLookupCache = urlLookupCache;
        this.customDomains = customDomains;
        this.maskedAudits = maskedAudits;
        this.safeBrowsing = safeBrowsing;
        this.publicBaseUrl = publicBaseUrl;
        this.maskingFreeLimit = maskingFreeLimit;
        this.maskingProLimit = maskingProLimit;
    }

    @Transactional
    public ShortUrl createShortUrl(
            String longUrl,
            String customAlias,
            Long userId,
            String guestToken,
            String shortDomainMode,
            Boolean maskedRequest
    ) {

        boolean isMasked = maskedRequest != null && maskedRequest;
        String normalized = normalize(longUrl);
        Long ownerId = resolveOwnerId(userId);
        String normalizedGuestToken = userId == null ? normalizeGuestToken(guestToken) : null;
        String shortBaseUrl = resolveShortBaseUrl(userId, ownerId, shortDomainMode);
        enforcePlanLimitIfNeeded(userId, ownerId, normalizedGuestToken);

        MaskedUrlAudit audit = null;
        if (isMasked) {
            audit = enforceMaskingRulesAndAudit(userId, ownerId, normalized);
        }

        // if alias is provided, use it
        if (customAlias != null && !customAlias.trim().isEmpty()) {

            String alias = customAlias.trim();

            // validate alias
            if (!alias.matches("^[a-zA-Z0-9_-]{3,20}$")) {
                throw new IllegalArgumentException("Alias must be 3-20 chars (a-z, A-Z, 0-9, _ or -)");
            }

            if (repo.existsByShortCode(alias)) {
                throw new IllegalArgumentException("Alias already taken");
            }

            ShortUrl row = new ShortUrl();
            row.setUserId(ownerId);
            row.setLongUrl(normalized);
            row.setShortCode(alias);
            row.setShortBaseUrl(shortBaseUrl);
            row.setGuestToken(normalizedGuestToken);
            row.setClickCount(0L);
            row.setCreatedAt(IstDateTime.now());
            row.setMasked(isMasked);
            if (isMasked) row.setMaskedAt(java.time.Instant.now());

            ShortUrl saved = repo.save(row);
            urlLookupCache.put(saved.getId(), saved.getShortCode(), saved.getLongUrl(), saved.getMasked());
            if (isMasked && audit != null) {
                audit.setShortUrlId(saved.getId());
                maskedAudits.save(audit);
            }
            return saved;
        }

        // else generate random short code and ensure unique
        String code = generateUniqueCode();

        ShortUrl row = new ShortUrl();
        row.setUserId(ownerId);
        row.setLongUrl(normalized);
        row.setShortCode(code);
        row.setShortBaseUrl(shortBaseUrl);
        row.setGuestToken(normalizedGuestToken);
        row.setClickCount(0L);
        row.setCreatedAt(IstDateTime.now());
        row.setMasked(isMasked);
        if (isMasked) row.setMaskedAt(java.time.Instant.now());

        ShortUrl saved = repo.save(row);
        urlLookupCache.put(saved.getId(), saved.getShortCode(), saved.getLongUrl(), saved.getMasked());
        if (isMasked && audit != null) {
            audit.setShortUrlId(saved.getId());
            maskedAudits.save(audit);
        }
        return saved;
    }

    public Optional<ResolvedUrl> resolveAndTrack(String code, String countryCode) {
        Optional<UrlLookupCacheService.LookupValue> cached = urlLookupCache.get(code);
        if (cached.isPresent()) {
            trackClick(cached.get().shortUrlId(), countryCode);
            return Optional.of(new ResolvedUrl(cached.get().longUrl(), cached.get().masked()));
        }

        Optional<ShortUrl> fromDb = repo.findByShortCode(code);
        fromDb.ifPresent(url -> {
            urlLookupCache.put(url.getId(), url.getShortCode(), url.getLongUrl(), url.getMasked());
            trackClick(url.getId(), countryCode);
        });
        return fromDb.map(url -> new ResolvedUrl(url.getLongUrl(), url.getMasked()));
    }

    // owner-aware resolution for custom domains
    public Optional<ResolvedUrl> resolveAndTrackForOwner(String code, Long ownerId, String countryCode) {
        Optional<ShortUrl> fromDb = repo.findByShortCodeAndUserId(code, ownerId);
        fromDb.ifPresent(url -> {
            urlLookupCache.put(url.getId(), url.getShortCode(), url.getLongUrl(), url.getMasked());
            trackClick(url.getId(), countryCode);
        });
        return fromDb.map(url -> new ResolvedUrl(url.getLongUrl(), url.getMasked()));
    }

    public Optional<ShortUrl> getByCode(String code) {
        return repo.findByShortCode(code);
    }

    public Optional<ShortUrl> getByCodeForUser(String code, Long userId) {
        return repo.findByShortCodeAndUserId(code, userId);
    }

    public UrlGeoAnalyticsResponse getGeoAnalyticsForUser(String code, Long userId) {
        User owner = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!owner.isProActive()) {
            throw new IllegalStateException("Country analytics is available for Pro plan only.");
        }

        ShortUrl url = repo.findByShortCodeAndUserId(code, userId)
                .orElseThrow(() -> new IllegalArgumentException("Short URL not found"));

        long countryTrackedClicks = clickEvents.countByShortUrlId(url.getId());
        var topCountries = clickEvents.summarizeCountries(url.getId(), PageRequest.of(0, 10))
                .stream()
                .map(row -> new UrlGeoAnalyticsResponse.CountryClicks(row.getCountryCode(), row.getClicks()))
                .toList();

        return new UrlGeoAnalyticsResponse(
                url.getShortCode(),
                url.getClickCount(),
                countryTrackedClicks,
                topCountries
        );
    }

    public List<ShortUrl> getUserUrls(Long userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public int claimGuestUrls(Long userId, String guestToken) {
        String normalizedGuestToken = normalizeGuestToken(guestToken);
        Long guestOwnerId = resolveOwnerId(null);
        List<ShortUrl> urls = repo.findByGuestTokenAndUserId(normalizedGuestToken, guestOwnerId);

        for (ShortUrl url : urls) {
            url.setUserId(userId);
            url.setGuestToken(null);
        }

        return urls.size();
    }

    @Transactional
    public void deleteUrl(Long urlId, Long userId) {
        repo.findById(urlId).ifPresent(url -> {
            if (url.getUserId().equals(userId)) {
                urlLookupCache.evict(url.getShortCode());
                repo.delete(url);
            }
        });
    }

    @Transactional
    public ShortUrl switchToShurDomain(Long urlId, Long userId) {
        ShortUrl url = repo.findById(urlId)
                .orElseThrow(() -> new IllegalArgumentException("Short URL not found"));

        if (!url.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Short URL not found");
        }

        String shurBaseUrl = normalizeBaseUrl(publicBaseUrl);
        if (repo.existsByShortCodeAndShortBaseUrlAndIdNot(url.getShortCode(), shurBaseUrl, url.getId())) {
            throw new IllegalStateException("Alias URL name already exists on shur.click.");
        }

        url.setShortBaseUrl(shurBaseUrl);
        return repo.save(url);
    }

    @Transactional
    public ShortUrl switchToCustomDomain(Long urlId, Long userId) {
        ShortUrl url = repo.findById(urlId)
                .orElseThrow(() -> new IllegalArgumentException("Short URL not found"));

        if (!url.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Short URL not found");
        }

        User owner = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!owner.isProActive()) {
            throw new IllegalStateException("Custom domains require an active Pro plan.");
        }

        CustomDomain domain = customDomains.findByUserId(userId)
                .stream()
                .filter(d -> d.getStatus() == DomainStatus.VERIFIED)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No verified custom domain found. Add and verify one first."));

        String customBaseUrl = "https://" + domain.getDomain();
        if (repo.existsByShortCodeAndShortBaseUrlAndIdNot(url.getShortCode(), customBaseUrl, url.getId())) {
            throw new IllegalStateException("Alias already exists on your custom domain.");
        }

        url.setShortBaseUrl(customBaseUrl);
        return repo.save(url);
    }

    private void trackClick(Long shortUrlId, String countryCode) {
        trackingExecutor.submit(() -> {
            try {
                repo.incrementClickAndSetLastAccessedAt(shortUrlId, IstDateTime.now());
                clickEvents.save(new UrlClickEvent(shortUrlId, normalizeCountryCode(countryCode)));
            } catch (Exception e) {
                // Log and ignore to prevent blocking
            }
        });
    }

    private String generateUniqueCode() {
        for (int i = 0; i < 20; i++) {
            String code = randomCode(6);
            if (!repo.existsByShortCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Could not generate unique short code");
    }

    private String randomCode(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(CHARS.charAt(random.nextInt(CHARS.length())));
        }
        return sb.toString();
    }

    private String normalize(String url) {
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalArgumentException("longUrl is required");
        }
        String u = url.trim();
        if (!u.startsWith("http://") && !u.startsWith("https://")) {
            u = "https://" + u;
        }
        return u;
    }

    private String resolveShortBaseUrl(Long requestedUserId, Long ownerId, String shortDomainMode) {
        if (!"custom".equalsIgnoreCase(shortDomainMode == null ? "" : shortDomainMode.trim())) {
            return normalizeBaseUrl(publicBaseUrl);
        }

        if (requestedUserId == null) {
            throw new IllegalStateException("Custom domains require an active Pro plan.");
        }

        User owner = users.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!owner.isProActive()) {
            throw new IllegalStateException("Custom domains require an active Pro plan.");
        }

        CustomDomain domain = customDomains.findByUserId(ownerId)
                .stream()
                .filter(d -> d.getStatus() == DomainStatus.VERIFIED)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Verify a custom domain before creating links with it."));

        return "https://" + domain.getDomain();
    }

    private String normalizeBaseUrl(String baseUrl) {
        String base = baseUrl == null || baseUrl.isBlank() ? "https://shur.click" : baseUrl.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base;
    }

    private String normalizeCountryCode(String countryCode) {
        if (countryCode == null) return "UNKNOWN";
        String value = countryCode.trim().toUpperCase();
        if (value.isEmpty()
                || "XX".equals(value)
                || "T1".equals(value)
                || "ZZ".equals(value)
                || "UNKNOWN".equals(value)
                || "NULL".equals(value)) {
            return "UNKNOWN";
        }
        if (value.length() > 2 && value.contains(" ")) {
            value = value.substring(0, 2);
        }
        return value.length() > 8 ? value.substring(0, 8) : value;
    }

    private Long resolveOwnerId(Long userId) {
        if (userId != null) {
            return userId;
        }

        User guest = users.findByEmail(GUEST_EMAIL)
                .orElseGet(() -> users.save(new User(GUEST_NAME, GUEST_EMAIL, GUEST_PASSWORD_HASH)));
        return guest.getId();
    }

    private void enforcePlanLimitIfNeeded(Long requestedUserId, Long ownerId, String guestToken) {
        if (requestedUserId == null) {
            long guestUsed = repo.countByGuestToken(guestToken);
            if (guestUsed >= GUEST_LINK_LIMIT) {
                throw new IllegalStateException(
                        "Guest limit reached (2 links). Please sign in to keep these links and create more."
                );
            }
            return;
        }

        User owner = users.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (owner.isProActive()) {
            return;
        }

        long used = repo.countByUserId(ownerId);
        if (used >= FREE_TIER_LINK_LIMIT) {
            throw new IllegalStateException(
                    "Free plan limit reached (5 links). Upgrade to Pro for $2/month to unlock unlimited link generation."
            );
        }
    }

    private MaskedUrlAudit enforceMaskingRulesAndAudit(Long requestedUserId, Long ownerId, String targetUrl) {
        if (requestedUserId == null) {
            throw new MaskingRequiresAuthException("URL masking requires a free verified account. Please sign up or log in.");
        }

        User owner = users.findById(ownerId)
                .orElseThrow(() -> new MaskingRequiresAuthException("User account not found."));

        if (!owner.isVerified()) {
            throw new MaskingRequiresAuthException("URL masking requires email verification. Please verify your email.");
        }

        if (!owner.isProActive() && maskingFreeLimit >= 0) {
            long maskedCount = maskedAudits.countByUserId(ownerId);
            if (maskedCount >= maskingFreeLimit) {
                throw new MaskingQuotaExceededException("Free tier limit for masked links (" + maskingFreeLimit + ") reached.");
            }
        } else if (owner.isProActive() && maskingProLimit >= 0) {
            long maskedCount = maskedAudits.countByUserId(ownerId);
            if (maskedCount >= maskingProLimit) {
                throw new MaskingQuotaExceededException("Pro tier limit for masked links (" + maskingProLimit + ") reached.");
            }
        }

        SafeBrowsingResult sbResult = safeBrowsing.check(targetUrl);
        MaskedUrlAudit audit = new MaskedUrlAudit(0L, ownerId, targetUrl, sbResult.name());
        MaskedUrlAudit savedAudit = maskedAudits.save(audit); // Temporary ID 0L, will be updated later

        if (sbResult == SafeBrowsingResult.FLAGGED) {
            throw new MaskingTargetFlaggedException("Target URL flagged by Safe Browsing as unsafe. Cannot be masked.");
        }
        
        return savedAudit;
    }

    public int getMaskedLinksRemaining(Long userId) {
        if (userId == null) return 0;
        User owner = users.findById(userId).orElse(null);
        if (owner == null) return 0;
        
        if (owner.isProActive()) {
            return maskingProLimit < 0 ? 999999 : (int) Math.max(0, maskingProLimit - maskedAudits.countByUserId(userId));
        } else {
            return maskingFreeLimit < 0 ? 999999 : (int) Math.max(0, maskingFreeLimit - maskedAudits.countByUserId(userId));
        }
    }

    private String normalizeGuestToken(String guestToken) {
        if (guestToken == null || guestToken.isBlank()) {
            throw new IllegalArgumentException("guestToken is required for guest links");
        }
        String token = guestToken.trim();
        if (!token.matches("^[a-zA-Z0-9_-]{16,80}$")) {
            throw new IllegalArgumentException("Invalid guest token");
        }
        return token;
    }
}
