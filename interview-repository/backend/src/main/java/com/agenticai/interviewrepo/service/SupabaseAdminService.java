package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.model.Role;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class SupabaseAdminService {

    private final RestClient restClient;
    private final String adminUrl;

    public SupabaseAdminService(
            @org.springframework.beans.factory.annotation.Value("${app.supabase.admin-url}") String adminUrl,
            @org.springframework.beans.factory.annotation.Value("${app.supabase.service-role-key}") String serviceRoleKey
    ) {
        this.adminUrl = adminUrl;
        this.restClient = RestClient.builder()
                .baseUrl(adminUrl + "/auth/v1/admin")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("apikey", serviceRoleKey)
                .build();
    }

    public record CreateUserRequest(
            String email,
            String password,
            Map<String, Object> user_metadata,
            boolean email_confirm,
            String role
    ) {}

    public record CreateUserResponse(
            String id,
            String email,
            String role,
            String created_at,
            Map<String, Object> user_metadata,
            String confirmation_sent_at
    ) {}

    public record AdminUserResponse(
            String id,
            String email,
            String role,
            String created_at,
            Map<String, Object> user_metadata,
            String last_sign_in_at,
            boolean is_sso_user,
            String phone
    ) {}

    public Optional<CreateUserResponse> createUser(String email, String password, String fullName, Role role) {
        if (adminUrl == null || adminUrl.contains("<your-project-ref>") || serviceRoleKeyIsMissing()) {
            return Optional.empty();
        }

        CreateUserRequest request = new CreateUserRequest(
                email,
                password,
                Map.of("full_name", fullName, "name", fullName),
                true,
                role.name()
        );

        try {
            return Optional.ofNullable(restClient.post()
                    .uri("/users")
                    .body(request)
                    .retrieve()
                    .body(CreateUserResponse.class));
        } catch (Exception e) {
            throw new RuntimeException("Failed to create user in Supabase Auth: " + e.getMessage(), e);
        }
    }

    public Optional<AdminUserResponse> getUserById(String userId) {
        if (adminUrl == null || adminUrl.contains("<your-project-ref>") || serviceRoleKeyIsMissing()) {
            return Optional.empty();
        }

        try {
            return Optional.ofNullable(restClient.get()
                    .uri("/users/" + userId)
                    .retrieve()
                    .body(AdminUserResponse.class));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public boolean deleteUser(String userId) {
        if (adminUrl == null || adminUrl.contains("<your-project-ref>") || serviceRoleKeyIsMissing()) {
            return false;
        }

        try {
            restClient.delete()
                    .uri("/users/" + userId)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Optional<AdminUserResponse> updateUser(String userId, Map<String, Object> updates) {
        if (adminUrl == null || adminUrl.contains("<your-project-ref>") || serviceRoleKeyIsMissing()) {
            return Optional.empty();
        }

        try {
            return Optional.ofNullable(restClient.put()
                    .uri("/users/" + userId)
                    .body(updates)
                    .retrieve()
                    .body(AdminUserResponse.class));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private boolean serviceRoleKeyIsMissing() {
        return restClient == null;
    }
}