package xyz.antiz.urlShorter.controller;

import xyz.antiz.urlShorter.dto.CreateShortUrlRequest;
import xyz.antiz.urlShorter.dto.CreateShortUrlResponse;
import xyz.antiz.urlShorter.dto.ClaimGuestUrlsRequest;
import xyz.antiz.urlShorter.dto.UrlGeoAnalyticsResponse;
import xyz.antiz.urlShorter.dto.UrlStatsResponse;
import xyz.antiz.urlShorter.entity.ShortUrl;
import xyz.antiz.urlShorter.service.ShortUrlService;
import xyz.antiz.urlShorter.util.IstDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// Public endpoints - no authentication required
@RestController
public class PublicUrlController {

    private final ShortUrlService service;

    public PublicUrlController(ShortUrlService service) {
        this.service = service;
    }

    // Redirect short URL to long URL
    // Use regex to prevent matching /api, /favicon.ico, etc.
    @GetMapping("/{code:^(?!api$)[a-zA-Z0-9_-]{3,20}$}")
    public ResponseEntity<Object> redirect(@PathVariable String code, HttpServletRequest request) {
        String countryCode = resolveCountryCode(request);

        return service.resolveAndTrack(code, countryCode)
                .map(longUrl -> ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(longUrl))
                        .build())
                .orElseGet(() -> ResponseEntity.notFound().build());
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

// Authenticated endpoints - requires authentication
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
            @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {

        ShortUrl saved = service.createShortUrl(request.getLongUrl(), request.getCustomAlias(), userId, guestToken);

        String shortUrl = buildShortUrl(saved.getShortCode());

        CreateShortUrlResponse body = new CreateShortUrlResponse(
                saved.getId(),
                saved.getShortCode(),
                shortUrl,
                saved.getLongUrl(),
                saved.getClickCount(),
                IstDateTime.format(saved.getCreatedAt()),
                IstDateTime.format(saved.getLastAccessedAt()));

        return ResponseEntity.status(HttpStatus.CREATED).body(body);
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
        List<ShortUrl> urls = service.getUserUrls(userId);

        List<CreateShortUrlResponse> response = urls.stream()
                .map(url -> {
                    String shortUrl = buildShortUrl(url.getShortCode());
                    return new CreateShortUrlResponse(
                            url.getId(),
                            url.getShortCode(),
                            shortUrl,
                            url.getLongUrl(),
                            url.getClickCount(),
                            IstDateTime.format(url.getCreatedAt()),
                            IstDateTime.format(url.getLastAccessedAt()));
                })
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

    private String buildShortUrl(String code) {
        String base = publicBaseUrl == null ? "" : publicBaseUrl.trim();
        if (!base.isEmpty()) {
            if (base.endsWith("/")) {
                base = base.substring(0, base.length() - 1);
            }
            return base + "/" + code;
        }

        return ServletUriComponentsBuilder
                .fromCurrentContextPath()
                .path("/{code}")
                .buildAndExpand(code)
                .toUriString();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, @RequestAttribute("userId") Long userId) {
        service.deleteUrl(id, userId);
        return ResponseEntity.noContent().build();
    }
}
