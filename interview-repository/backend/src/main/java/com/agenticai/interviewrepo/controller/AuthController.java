package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.UserProfileResponse;
import com.agenticai.interviewrepo.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "interviewrepo-security"));
    }

    @GetMapping("/api/auth/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser() {
        return ResponseEntity.ok(authService.getCurrentProfile());
    }

    @PostMapping("/api/auth/sync")
    public ResponseEntity<UserProfileResponse> syncUserProfile(
            @RequestParam(required = false) String name) {
        return ResponseEntity.ok(authService.syncProfile(name));
    }
}
