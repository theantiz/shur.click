package xyz.antiz.urlShorter.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import xyz.antiz.urlShorter.dto.ClaimGuestUrlsRequest;
import xyz.antiz.urlShorter.dto.CreateShortUrlRequest;
import xyz.antiz.urlShorter.dto.CreateShortUrlResponse;
import xyz.antiz.urlShorter.dto.UrlGeoAnalyticsResponse;
import xyz.antiz.urlShorter.dto.UrlStatsResponse;
import xyz.antiz.urlShorter.entity.ShortUrl;
import xyz.antiz.urlShorter.service.CustomDomainService;
import xyz.antiz.urlShorter.service.ShortUrlService;
import xyz.antiz.urlShorter.util.IstDateTime;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// Public endpoints - no authentication required
@RestController
public class PublicUrlController {

    private final ShortUrlService shortUrlService;
    private final CustomDomainService customDomainService;

    private static final String DEFAULT_DOMAIN = "shur.click";

    public PublicUrlController(ShortUrlService shortUrlService,
                               CustomDomainService customDomainService) {
        this.shortUrlService = shortUrlService;
        this.customDomainService = customDomainService;
    }

    @GetMapping("/{code:^(?!api$)[a-zA-Z0-9_-]{3,20}$}")
    public ResponseEntity<Object> redirect(@PathVariable String code, HttpServletRequest request) {
        String countryCode = resolveCountryCode(request);
        String host = request.getServerName();

        // Default domain: global lookup
        if (isDefaultHost(host)) {
            return shortUrlService.resolveAndTrack(code, countryCode)
                    .map(longUrl -> ResponseEntity.status(HttpStatus.FOUND)
                            .location(URI.create(longUrl))
                            .build())
                    .orElseGet(() -> ResponseEntity.notFound().build());
        }

        // Custom domain: owner-scoped lookup
        Optional<Long> ownerIdOpt = customDomainService.resolveOwnerByDomain(host);
        if (ownerIdOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Long ownerId = ownerIdOpt.get();
        return shortUrlService.resolveAndTrackForOwner(code, ownerId, countryCode)
                .map(longUrl -> ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(longUrl))
                        .build())
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private boolean isDefaultHost(String host) {
        if (host == null || host.isBlank()) {
            return true;
        }
        return DEFAULT_DOMAIN.equalsIgnoreCase(host)
                || ("www." + DEFAULT_DOMAIN).equalsIgnoreCase(host)
                || "localhost".equalsIgnoreCase(host)
                || "127.0.0.1".equals(host);
    }

    private String resolveCountryCode(HttpServletRequest request) {
        String[] headerCandidates = {
                "X-Vercel-IP-Country",
                "X-Vercel-IP-Country-Region",
                "x-vercel-ip-country",
                "CF-IPCountry",
                "CloudFront-Viewer-Country",
                "CloudFront-Viewer-Country-Name",
                "X-Country-Code",
                "X-AppEngine-Country"
        };
        for (String header : headerCandidates) {
            String value = request.getHeader(header);
            if (value != null && !value.isBlank()) {
                String parsed = value.trim();
                int commaIdx = parsed.indexOf(',');
                if (commaIdx > 0) {
                    parsed = parsed.substring(0, commaIdx).trim();
                }
                return parsed;
            }
        }

        String acceptLanguage = request.getHeader("Accept-Language");
        String regionFromLanguage = extractRegionFromAcceptLanguage(acceptLanguage);
        if (regionFromLanguage != null) {
            return regionFromLanguage;
        }

        if (request.getLocale() != null) {
            String localeCountry = request.getLocale().getCountry();
            if (localeCountry != null && !localeCountry.isBlank()) {
                return localeCountry;
            }
        }

        return "ZZ";
    }

    private String extractRegionFromAcceptLanguage(String acceptLanguage) {
        if (acceptLanguage == null || acceptLanguage.isBlank()) {
            return null;
        }
        String first = acceptLanguage.split(",")[0].trim();
        if (first.isEmpty()) return null;

        int semicolonIndex = first.indexOf(';');
        if (semicolonIndex > -1) {
            first = first.substring(0, semicolonIndex).trim();
        }

        String[] parts = first.split("-");
        if (parts.length >= 2) {
            String region = parts[1].trim();
            return region.isEmpty() ? null : region;
        }
        return null;
    }
}

@RestController
@RequestMapping("/api/urls")
class AuthShortUrlController {

    private final ShortUrlService service;
    private final String publicBaseUrl;

    public AuthShortUrlController(
            ShortUrlService service,
            @Value("${app.public.base-url:}") String publicBaseUrl
    ) {
        this.service = service;
        this.publicBaseUrl = publicBaseUrl;
    }

    @PostMapping
    public ResponseEntity<CreateShortUrlResponse> create(
            @RequestBody CreateShortUrlRequest request,
            @RequestAttribute(value = "userId", required = false) Long userId,
            @RequestHeader(value = "X-Guest-Token", required = false) String guestToken
    ) {
        ShortUrl saved = service.createShortUrl(
                request.getLongUrl(),
                request.getCustomAlias(),
                userId,
                guestToken,
                request.getShortDomainMode()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
    }

    @PostMapping("/claim-guest")
    public ResponseEntity<Map<String, Integer>> claimGuestUrls(
            @Valid @RequestBody ClaimGuestUrlsRequest request,
            @RequestAttribute("userId") Long userId
    ) {
        int claimed = service.claimGuestUrls(userId, request.guestToken);
        return ResponseEntity.ok(Map.of("claimed", claimed));
    }

    @GetMapping
    public ResponseEntity<List<CreateShortUrlResponse>> getUserUrls(@RequestAttribute("userId") Long userId) {
        List<CreateShortUrlResponse> response = service.getUserUrls(userId)
                .stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{code}/stats")
    public ResponseEntity<UrlStatsResponse> stats(
            @PathVariable String code,
            @RequestAttribute("userId") Long userId
    ) {
        ShortUrl url = service.getByCodeForUser(code, userId)
                .orElseThrow(() -> new IllegalArgumentException("Short URL not found"));

        return ResponseEntity.ok(new UrlStatsResponse(
                url.getShortCode(),
                url.getLongUrl(),
                url.getClickCount(),
                IstDateTime.format(url.getCreatedAt()),
                IstDateTime.format(url.getLastAccessedAt())));
    }

    @GetMapping("/{code}/geo-analytics")
    public ResponseEntity<UrlGeoAnalyticsResponse> geoAnalytics(
            @PathVariable String code,
            @RequestAttribute("userId") Long userId
    ) {
        return ResponseEntity.ok(service.getGeoAnalyticsForUser(code, userId));
    }

    @PatchMapping("/{id}/switch-to-shur")
    public ResponseEntity<CreateShortUrlResponse> switchToShurDomain(
            @PathVariable Long id,
            @RequestAttribute("userId") Long userId
    ) {
        ShortUrl updated = service.switchToShurDomain(id, userId);
        return ResponseEntity.ok(toResponse(updated));
    }

    @PatchMapping("/{id}/switch-to-custom")
    public ResponseEntity<CreateShortUrlResponse> switchToCustomDomain(
            @PathVariable Long id,
            @RequestAttribute("userId") Long userId
    ) {
        ShortUrl updated = service.switchToCustomDomain(id, userId);
        return ResponseEntity.ok(toResponse(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @RequestAttribute("userId") Long userId) {
        service.deleteUrl(id, userId);
        return ResponseEntity.noContent().build();
    }

    private CreateShortUrlResponse toResponse(ShortUrl url) {
        return new CreateShortUrlResponse(
                url.getId(),
                url.getShortCode(),
                buildShortUrl(url),
                resolveBaseUrl(url),
                url.getLongUrl(),
                url.getClickCount(),
                IstDateTime.format(url.getCreatedAt()),
                IstDateTime.format(url.getLastAccessedAt()));
    }

    private String buildShortUrl(ShortUrl url) {
        return resolveBaseUrl(url) + "/" + url.getShortCode();
    }

    private String resolveBaseUrl(ShortUrl url) {
        String savedBase = url.getShortBaseUrl();
        if (savedBase != null && !savedBase.isBlank()) {
            return trimTrailingSlash(savedBase);
        }

        String base = publicBaseUrl == null ? "" : publicBaseUrl.trim();
        if (!base.isEmpty()) {
            return trimTrailingSlash(base);
        }

        String currentBase = ServletUriComponentsBuilder
                .fromCurrentContextPath()
                .build()
                .toUriString();
        return trimTrailingSlash(currentBase);
    }

    private String trimTrailingSlash(String base) {
        String normalized = base.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }
}
