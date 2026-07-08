package xyz.antiz.urlShorter.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class SafeBrowsingCheckService {
    private static final Logger log = LoggerFactory.getLogger(SafeBrowsingCheckService.class);
    private static final String API_URL = "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=";

    private final boolean enabled;
    private final String apiKey;
    private final RestClient restClient;

    public SafeBrowsingCheckService(
            @Value("${masking.safebrowsing.enabled:true}") boolean enabled,
            @Value("${masking.safebrowsing.api.key:}") String apiKey,
            RestClient.Builder restClientBuilder
    ) {
        this.enabled = enabled;
        this.apiKey = apiKey;
        this.restClient = restClientBuilder.build();
    }

    public SafeBrowsingResult check(String targetUrl) {
        if (!enabled) {
            return SafeBrowsingResult.SKIPPED;
        }
        if (apiKey == null || apiKey.isBlank()) {
            log.error("SafeBrowsing API key is missing but safebrowsing is enabled. Failing open (ERROR).");
            return SafeBrowsingResult.ERROR;
        }

        try {
            Map<String, Object> requestBody = Map.of(
                "client", Map.of(
                    "clientId", "shurclick",
                    "clientVersion", "1.0.0"
                ),
                "threatInfo", Map.of(
                    "threatTypes", List.of("MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"),
                    "platformTypes", List.of("ANY_PLATFORM"),
                    "threatEntryTypes", List.of("URL"),
                    "threatEntries", List.of(Map.of("url", targetUrl))
                )
            );

            Map response = restClient.post()
                    .uri(API_URL + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("matches")) {
                List matches = (List) response.get("matches");
                if (matches != null && !matches.isEmpty()) {
                    log.warn("SafeBrowsing flagged URL: {}", targetUrl);
                    return SafeBrowsingResult.FLAGGED;
                }
            }

            return SafeBrowsingResult.CLEAN;
        } catch (Exception e) {
            log.error("SafeBrowsing API call failed for url={}: {}", targetUrl, e.getMessage());
            // "on API error, log as ERROR and allow through"
            return SafeBrowsingResult.ERROR;
        }
    }
}
