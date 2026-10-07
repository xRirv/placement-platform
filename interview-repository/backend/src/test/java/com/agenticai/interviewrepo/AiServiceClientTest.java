package com.agenticai.interviewrepo;

import com.agenticai.interviewrepo.service.AiServiceClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.sun.net.httpserver.HttpServer;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class AiServiceClientTest {

    // Port 1 is reserved and nothing listens there, so connections are refused immediately.
    private static final String UNREACHABLE = "http://127.0.0.1:1";

    @Test
    void ingestFailsOpenWhenAiServiceIsDown() {
        AiServiceClient client = new AiServiceClient(UNREACHABLE, "key", 1, 1, 1);
        assertDoesNotThrow(() -> client.ingest(Map.of("experience_id", "abc")));
    }

    @Test
    void ingestIsSkippedWhenNotConfigured() {
        AiServiceClient client = new AiServiceClient("", "", 1, 1, 1);
        assertDoesNotThrow(() -> client.ingest(Map.of("experience_id", "abc")));
    }

    @Test
    void searchReturns503WhenAiServiceIsDown() {
        AiServiceClient client = new AiServiceClient(UNREACHABLE, "key", 1, 1, 1);
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> client.search(Map.of("query", "graphs")));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, e.getStatusCode());
    }

    @Test
    void chatReturns503WhenNotConfigured() {
        AiServiceClient client = new AiServiceClient("", "", 1, 1, 1);
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> client.chat(Map.of("message", "hi")));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, e.getStatusCode());
    }

    @Test
    void sendsJsonBodyOverHttp11WithoutUpgrade() throws Exception {
        // Regression: the JDK client's h2c upgrade made uvicorn drop request bodies (Team B returned 422).
        AtomicReference<String> body = new AtomicReference<>();
        AtomicReference<String> upgrade = new AtomicReference<>();
        AtomicReference<String> apiKey = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/v1/search", exchange -> {
            body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            upgrade.set(exchange.getRequestHeaders().getFirst("Upgrade"));
            apiKey.set(exchange.getRequestHeaders().getFirst("X-Internal-Api-Key"));
            byte[] response = "{\"total_found\":0}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
        try {
            AiServiceClient client = new AiServiceClient(
                    "http://127.0.0.1:" + server.getAddress().getPort(), "secret", 2, 2, 5);
            Map<String, Object> result = client.search(Map.of("query", "graphs"));
            assertEquals(0, result.get("total_found"));
            assertTrue(body.get().contains("\"query\":\"graphs\""), "body was: " + body.get());
            assertNull(upgrade.get());
            assertEquals("secret", apiKey.get());
        } finally {
            server.stop(0);
        }
    }
}
