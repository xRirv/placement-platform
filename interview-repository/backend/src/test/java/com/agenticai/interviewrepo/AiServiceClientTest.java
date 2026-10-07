package com.agenticai.interviewrepo;

import com.agenticai.interviewrepo.service.AiServiceClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

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
}
