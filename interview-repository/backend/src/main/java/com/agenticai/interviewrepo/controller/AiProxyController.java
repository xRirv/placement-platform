package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.service.AiServiceClient;
import com.agenticai.interviewrepo.service.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Authenticated proxy to Team B's AI service. The browser never talks to Team B directly.
 * Only whitelisted fields are forwarded.
 */
@RestController
@RequestMapping("/api/ai")
public class AiProxyController {

    private static final int MAX_TEXT_LENGTH = 4000;
    private static final int MAX_SEARCH_LIMIT = 50;

    private final AiServiceClient ai;
    private final CurrentUserService currentUser;

    public AiProxyController(AiServiceClient ai, CurrentUserService currentUser) {
        this.ai = ai;
        this.currentUser = currentUser;
    }

    @PostMapping("/search")
    public Map<String, Object> search(@RequestBody Map<String, Object> body) {
        Map<String, Object> forward = new LinkedHashMap<>();
        forward.put("query", requireText(body, "query"));
        if (body.get("filters") instanceof Map<?, ?> filters) forward.put("filters", filters);
        if (body.get("limit") instanceof Number limit)
            forward.put("limit", Math.min(Math.max(limit.intValue(), 1), MAX_SEARCH_LIMIT));
        return ai.search(forward);
    }

    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestBody Map<String, Object> body) {
        // Namespace sessions per user so one user cannot continue another user's conversation.
        String prefix = currentUser.getCurrentUser().getId() + ":";
        String clientSession = body.get("session_id") instanceof String s && !s.isBlank()
                ? s : UUID.randomUUID().toString();

        Map<String, Object> forward = new LinkedHashMap<>();
        forward.put("message", requireText(body, "message"));
        forward.put("session_id", prefix + clientSession);

        Map<String, Object> response = new LinkedHashMap<>(ai.chat(forward));
        if (response.get("session_id") instanceof String s && s.startsWith(prefix))
            response.put("session_id", s.substring(prefix.length()));
        return response;
    }

    private static String requireText(Map<String, Object> body, String field) {
        if (!(body.get(field) instanceof String value) || value.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
        if (value.length() > MAX_TEXT_LENGTH)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is too long");
        return value.trim();
    }
}
