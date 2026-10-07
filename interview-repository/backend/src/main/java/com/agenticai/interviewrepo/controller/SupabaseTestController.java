package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.service.SupabaseAdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test-supabase")
public class SupabaseTestController {

    private final SupabaseAdminService supabaseAdminService;

    public SupabaseTestController(SupabaseAdminService supabaseAdminService) {
        this.supabaseAdminService = supabaseAdminService;
    }

    @PostMapping("/supabase-create-user")
    public ResponseEntity<Map<String, Object>> testSupabaseCreateUser(
            @RequestBody Map<String, String> request
    ) {
        Map<String, Object> response = new HashMap<>();

        try {
            String email = request.get("email");
            String password = request.get("password");
            String fullName = request.get("fullName");
            String roleStr = request.getOrDefault("role", "STUDENT");

            Role role = Role.valueOf(roleStr);

            // Call Supabase Admin API to create user
            var supabaseResponse = supabaseAdminService.createUser(email, password, fullName, role);

            if (supabaseResponse.isPresent()) {
                var supabaseUser = supabaseResponse.get();
                response.put("success", true);
                response.put("message", "User created in Supabase Auth successfully!");
                response.put("supabaseUserId", supabaseUser.id());
                response.put("email", supabaseUser.email());
                response.put("role", supabaseUser.role());
                response.put("created_at", supabaseUser.created_at());
                response.put("user_metadata", supabaseUser.user_metadata());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Supabase Admin Service returned empty (check configuration)");
                return ResponseEntity.status(500).body(response);
            }

        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getClass().getSimpleName());
            response.put("message", e.getMessage());

            // Extract more details if it's a web client exception
            if (e.getCause() != null) {
                response.put("cause", e.getCause().getMessage());
            }

            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/supabase-get-user/{userId}")
    public ResponseEntity<Map<String, Object>> testSupabaseGetUser(
            @PathVariable String userId
    ) {
        Map<String, Object> response = new HashMap<>();

        try {
            var supabaseResponse = supabaseAdminService.getUserById(userId);

            if (supabaseResponse.isPresent()) {
                var supabaseUser = supabaseResponse.get();
                response.put("success", true);
                response.put("supabaseUserId", supabaseUser.id());
                response.put("email", supabaseUser.email());
                response.put("role", supabaseUser.role());
                response.put("created_at", supabaseUser.created_at());
                response.put("last_sign_in_at", supabaseUser.last_sign_in_at());
                response.put("is_sso_user", supabaseUser.is_sso_user());
                response.put("user_metadata", supabaseUser.user_metadata());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "User not found in Supabase Auth");
                return ResponseEntity.status(404).body(response);
            }

        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getClass().getSimpleName());
            response.put("message", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/supabase-config")
    public ResponseEntity<Map<String, Object>> testSupabaseConfig() {
        Map<String, Object> response = new HashMap<>();

        // This will show if Supabase is properly configured
        response.put("message", "Check if Supabase Admin Service is configured");
        response.put("note", "Try creating a user to test the integration");

        return ResponseEntity.ok(response);
    }
}
