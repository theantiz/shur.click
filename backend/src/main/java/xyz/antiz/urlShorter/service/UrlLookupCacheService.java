package xyz.antiz.urlShorter.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
public class UrlLookupCacheService {
    private static final Logger log = LoggerFactory.getLogger(UrlLookupCacheService.class);
    private static final String LOOKUP_KEY_PREFIX = "shorturl:lookup:";
    private static final String LONG_URL_SUFFIX = ":long";
    private static final String ID_SUFFIX = ":id";

    private final ObjectProvider<StringRedisTemplate> redisTemplateProvider;
    private final boolean redisEnabled;
    private final Duration cacheTtl;

    public UrlLookupCacheService(
            ObjectProvider<StringRedisTemplate> redisTemplateProvider,
            @Value("${app.redis.enabled:false}") boolean redisEnabled,
            @Value("${app.redis.url-cache-ttl-seconds:3600}") long cacheTtlSeconds
    ) {
        this.redisTemplateProvider = redisTemplateProvider;
        this.redisEnabled = redisEnabled;
        this.cacheTtl = Duration.ofSeconds(Math.max(cacheTtlSeconds, 60));
    }

    public Optional<LookupValue> get(String code) {
        if (!redisEnabled) return Optional.empty();
        StringRedisTemplate redis = redisTemplateProvider.getIfAvailable();
        if (redis == null) return Optional.empty();
        try {
            String idRaw = redis.opsForValue().get(idKey(code));
            String longUrl = redis.opsForValue().get(longUrlKey(code));
            if (idRaw == null || longUrl == null || longUrl.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(new LookupValue(Long.parseLong(idRaw), longUrl));
        } catch (Exception ex) {
            log.debug("Redis URL lookup read failed code={} reason={}", code, ex.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    public void put(Long shortUrlId, String code, String longUrl) {
        if (!redisEnabled || shortUrlId == null || code == null || longUrl == null) return;
        StringRedisTemplate redis = redisTemplateProvider.getIfAvailable();
        if (redis == null) return;
        try {
            redis.opsForValue().set(idKey(code), shortUrlId.toString(), cacheTtl);
            redis.opsForValue().set(longUrlKey(code), longUrl, cacheTtl);
        } catch (Exception ex) {
            log.debug("Redis URL lookup write failed code={} reason={}", code, ex.getClass().getSimpleName());
        }
    }

    public void evict(String code) {
        if (!redisEnabled || code == null || code.isBlank()) return;
        StringRedisTemplate redis = redisTemplateProvider.getIfAvailable();
        if (redis == null) return;
        try {
            redis.delete(idKey(code));
            redis.delete(longUrlKey(code));
        } catch (Exception ex) {
            log.debug("Redis URL lookup evict failed code={} reason={}", code, ex.getClass().getSimpleName());
        }
    }

    private String longUrlKey(String code) {
        return LOOKUP_KEY_PREFIX + code + LONG_URL_SUFFIX;
    }

    private String idKey(String code) {
        return LOOKUP_KEY_PREFIX + code + ID_SUFFIX;
    }

    public record LookupValue(Long shortUrlId, String longUrl) {}
}
