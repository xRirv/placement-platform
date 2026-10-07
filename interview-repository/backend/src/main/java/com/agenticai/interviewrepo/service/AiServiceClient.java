package com.agenticai.interviewrepo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;

/**
 * HTTP client for Team B's internal AI service (Placement Intelligence Platform).
 * Ingest fails open: errors are logged and never propagated to the caller.
 * Search/chat surface a 503 so the UI can show that the AI service is unavailable.
 */
@Service
public class AiServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AiServiceClient.class);
    private static final String API_KEY_HEADER = "X-Internal-Api-Key";
    private static final ParameterizedTypeReference<Map<String, Object>> JSON_MAP =
            new ParameterizedTypeReference<>() {};

    private final boolean enabled;
    private final RestClient ingestClient;
    private final RestClient queryClient;

    public AiServiceClient(@Value("${app.ai.service-url:}") String serviceUrl,
                           @Value("${app.ai.api-key:}") String apiKey,
                           @Value("${app.ai.connect-timeout-seconds:2}") int connectTimeoutSeconds,
                           @Value("${app.ai.ingest-timeout-seconds:5}") int ingestTimeoutSeconds,
                           @Value("${app.ai.query-timeout-seconds:60}") int queryTimeoutSeconds) {
        this.enabled = serviceUrl != null && !serviceUrl.isBlank();
        if (!enabled) {
            log.warn("app.ai.service-url is not set; AI ingest/search/chat are disabled");
            this.ingestClient = null;
            this.queryClient = null;
            return;
        }
        this.ingestClient = build(serviceUrl, apiKey, connectTimeoutSeconds, ingestTimeoutSeconds);
        this.queryClient = build(serviceUrl, apiKey, connectTimeoutSeconds, queryTimeoutSeconds);
    }

    private static RestClient build(String baseUrl, String apiKey, int connectSeconds, int readSeconds) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(connectSeconds))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(readSeconds));
        return RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(API_KEY_HEADER, apiKey == null ? "" : apiKey)
                .requestFactory(factory)
                .build();
    }

    /** Queues an approved experience for AI processing. Never throws. */
    public void ingest(Map<String, Object> payload) {
        Object experienceId = payload.get("experience_id");
        if (!enabled) {
            log.warn("Skipping AI ingest for experience_id={}: AI service not configured", experienceId);
            return;
        }
        try {
            ingestClient.post()
                    .uri("/api/v1/internal/ingest")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("AI ingest queued experience_id={}", experienceId);
        } catch (Exception e) {
            log.error("AI ingest failed for experience_id={}: {}", experienceId, e.getMessage());
        }
    }

    public Map<String, Object> search(Map<String, Object> body) {
        return query("/api/v1/search", body);
    }

    public Map<String, Object> chat(Map<String, Object> body) {
        return query("/api/v1/agents/chat", body);
    }

    private Map<String, Object> query(String path, Map<String, Object> body) {
        if (!enabled) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI service is not configured");
        }
        try {
            return queryClient.post()
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JSON_MAP);
        } catch (RestClientResponseException e) {
            log.error("AI service {} returned {}: {}", path, e.getStatusCode(), e.getResponseBodyAsString());
            HttpStatus status = e.getStatusCode().is4xxClientError()
                    ? HttpStatus.BAD_REQUEST : HttpStatus.SERVICE_UNAVAILABLE;
            throw new ResponseStatusException(status, "AI service request failed");
        } catch (RestClientException e) {
            log.error("AI service {} unreachable: {}", path, e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI service is unavailable");
        }
    }
}
