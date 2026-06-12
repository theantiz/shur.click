package xyz.antiz.urlShorter.rate;



import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory per-IP rate limiting filter.
 *
 * Notes:
 * - In-memory limits are best-effort and reset on app restart.
 * - Intended for protecting auth + OTP endpoints.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Value("${app.ratelimit.enabled:true}")
    private boolean enabled;

    // Default: 60 requests per 60 seconds per IP for sensitive endpoints
    @Value("${app.ratelimit.window-seconds:60}")
    private long windowSeconds;

    @Value("${app.ratelimit.max-requests:60}")
    private long maxRequests;

    @Value("${app.ratelimit.exempt-prefixes:/api/auth/open,/health,/api/health}")
    private String exemptPrefixes;

    // Comma-separated list of exact paths (relative to context) that will be limited.
    // If empty, we limit all paths.
    @Value("${app.ratelimit.limited-paths:/api/auth/register,/api/auth/login,/api/auth/register-init,/api/auth/register-verify,/api/auth/forgot-password,/api/auth/forgot-password-verify,/api/auth/reset-password,/api/urls}")
    private String limitedPaths;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        if (!shouldLimit(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = resolveClientIp(request);
        String key = ip + "|" + path;

        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(Instant.now(), maxRequests, windowSeconds));

        // Refill bucket if window elapsed
        bucket.refillIfNeeded(Instant.now(), windowSeconds, maxRequests);

        if (!bucket.tryConsume()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            // JSON shape consistent with GlobalExceptionHandler
            response.getWriter().write("{" +
                    "\"timestamp\":\"" + Instant.now() + "\"," +
                    "\"status\":" + HttpStatus.TOO_MANY_REQUESTS.value() + "," +
                    "\"error\":\"Too many requests. Please try again later.\"," +
                    "\"path\":\"" + escapeJson(path) + "\"" +
                    "}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean shouldLimit(String path) {
        // Exempt by prefix
        for (String prefix : splitCsv(exemptPrefixes)) {
            if (!prefix.isBlank() && path.startsWith(prefix.trim())) {
                return false;
            }
        }

        Set<String> limited = Set.copyOf(java.util.Arrays.stream(splitCsv(limitedPaths)).map(String::trim).filter(s -> !s.isBlank()).toList());
        if (limited.isEmpty()) {
            return true; // limit everything
        }

        // Exact match only (keeps it predictable for API paths)
        return limited.contains(path);
    }

    private String resolveClientIp(HttpServletRequest request) {
        // If behind a proxy, X-Forwarded-For may exist. Prefer first IP.
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String first = xff.split(",", 2)[0].trim();
            if (!first.isEmpty()) return first;
        }
        String xri = request.getHeader("X-Real-IP");
        if (xri != null && !xri.isBlank()) return xri.trim();
        return request.getRemoteAddr();
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String[] splitCsv(String csv) {
        if (csv == null || csv.isBlank()) return new String[0];
        return csv.split(",");
    }

    private static final class Bucket {
        private volatile Instant windowStart;
        private volatile long remaining;
        private volatile long max;

        Bucket(Instant windowStart, long maxRequests, long windowSeconds) {
            this.windowStart = windowStart;
            this.remaining = maxRequests;
            this.max = maxRequests;
        }

        void refillIfNeeded(Instant now, long windowSeconds, long maxRequests) {
            long elapsed = Duration.between(windowStart, now).toMillis();
            if (elapsed >= Duration.ofSeconds(windowSeconds).toMillis()) {
                this.windowStart = now;
                this.remaining = maxRequests;
                this.max = maxRequests;
            }
        }

        boolean tryConsume() {
            // Not perfectly atomic across threads but good enough for in-memory protection.
            long current = remaining;
            if (current <= 0) return false;
            remaining = current - 1;
            return true;
        }
    }
}

