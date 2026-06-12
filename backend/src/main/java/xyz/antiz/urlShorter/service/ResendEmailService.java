package xyz.antiz.urlShorter.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ResendEmailService {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${app.resend.api-key:}")
    private String apiKey;

    @Value("${app.resend.base-url:https://api.resend.com}")
    private String baseUrl;

    @Value("${app.mail.from:}")
    private String from;

    @Value("${app.mail.appName:shur.click}")
    private String appName;

    public ResendEmailService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public String getAppName() {
        return appName;
    }

    public void sendTextEmail(String toEmail, String subject, String text) {
        sendTextEmail(toEmail, subject, text, null);
    }

    public void sendTextEmail(String toEmail, String subject, String text, String replyTo) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new EmailDeliveryException("Resend API key is not configured");
        }
        if (from == null || from.isBlank()) {
            throw new EmailDeliveryException("Mail sender address is not configured");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("from", appName + " <" + from.trim() + ">");
        payload.put("to", List.of(toEmail.trim()));
        payload.put("subject", subject);
        payload.put("text", text);
        if (replyTo != null && !replyTo.isBlank()) {
            payload.put("reply_to", replyTo.trim());
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(normalizeBaseUrl(baseUrl) + "/emails"))
                .header("Authorization", "Bearer " + apiKey.trim())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(writePayload(payload)))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new EmailDeliveryException("Resend request failed with status " + response.statusCode());
            }
        } catch (IOException e) {
            throw new EmailDeliveryException("Failed to call Resend API", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new EmailDeliveryException("Resend API call was interrupted", e);
        }
    }

    private String writePayload(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new EmailDeliveryException("Failed to serialize email payload", e);
        }
    }

    private String normalizeBaseUrl(String url) {
        if (url == null || url.isBlank()) {
            return "https://api.resend.com";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
