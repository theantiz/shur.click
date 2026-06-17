package xyz.antiz.urlShorter.service;

import org.springframework.data.domain.PageRequest;
import xyz.antiz.urlShorter.entity.ShortUrl;
import xyz.antiz.urlShorter.entity.User;
import xyz.antiz.urlShorter.entity.UrlClickEvent;
import xyz.antiz.urlShorter.dto.UrlGeoAnalyticsResponse;
import xyz.antiz.urlShorter.repo.ShortUrlRepository;
import xyz.antiz.urlShorter.repo.UserRepository;
import xyz.antiz.urlShorter.repo.UrlClickEventRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.antiz.urlShorter.util.IstDateTime;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;

@Service
public class ShortUrlService {

    private final ShortUrlRepository repo;
    private final UserRepository users;
    private final UrlClickEventRepository clickEvents;
    private final UrlLookupCacheService urlLookupCache;
    private final SecureRandom random = new SecureRandom();
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
            UrlLookupCacheService urlLookupCache
    ) {
        this.repo = repo;
        this.users = users;
        this.clickEvents = clickEvents;
        this.urlLookupCache = urlLookupCache;
    }

    @Transactional
    public ShortUrl createShortUrl(String longUrl, String customAlias, Long userId, String guestToken) {

        String normalized = normalize(longUrl);
        Long ownerId = resolveOwnerId(userId);
        String normalizedGuestToken = userId == null ? normalizeGuestToken(guestToken) : null;
        enforcePlanLimitIfNeeded(userId, ownerId, normalizedGuestToken);

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
            row.setGuestToken(normalizedGuestToken);
            row.setClickCount(0L);
            row.setCreatedAt(IstDateTime.now());

            ShortUrl saved = repo.save(row);
            urlLookupCache.put(saved.getId(), saved.getShortCode(), saved.getLongUrl());
            return saved;
        }

        // else generate random short code and ensure unique
        String code = generateUniqueCode();

        ShortUrl row = new ShortUrl();
        row.setUserId(ownerId);
        row.setLongUrl(normalized);
        row.setShortCode(code);
        row.setGuestToken(normalizedGuestToken);
        row.setClickCount(0L);
        row.setCreatedAt(IstDateTime.now());

        ShortUrl saved = repo.save(row);
        urlLookupCache.put(saved.getId(), saved.getShortCode(), saved.getLongUrl());
        return saved;
    }

    @Transactional
    public Optional<String> resolveAndTrack(String code, String countryCode) {
        Optional<UrlLookupCacheService.LookupValue> cached = urlLookupCache.get(code);
        if (cached.isPresent()) {
            trackClick(cached.get().shortUrlId(), countryCode);
            return Optional.of(cached.get().longUrl());
        }

        Optional<ShortUrl> fromDb = repo.findByShortCode(code);
        fromDb.ifPresent(url -> {
            urlLookupCache.put(url.getId(), url.getShortCode(), url.getLongUrl());
            trackClick(url.getId(), countryCode);
        });
        return fromDb.map(ShortUrl::getLongUrl);
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

    private void trackClick(Long shortUrlId, String countryCode) {
        repo.incrementClickAndSetLastAccessedAt(shortUrlId, IstDateTime.now());
        clickEvents.save(new UrlClickEvent(shortUrlId, normalizeCountryCode(countryCode)));
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
