package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.AdminModerationLogResponse;
import com.agenticai.interviewrepo.dto.AdminProfileRequest;
import com.agenticai.interviewrepo.dto.AdminProfileResponse;
import com.agenticai.interviewrepo.dto.AdminRoleUpdateRequest;
import com.agenticai.interviewrepo.dto.AdminUserResponse;
import com.agenticai.interviewrepo.dto.AdminUserStatusRequest;
import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.service.AdminService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(
            AdminService adminService
    ) {
        this.adminService = adminService;
    }

    // =========================
    // ADMIN PROFILE
    // =========================

    @GetMapping("/profile")
    public ResponseEntity<AdminProfileResponse> getProfile()
            throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.getProfile()
        );
    }

    @PutMapping("/profile")
    public ResponseEntity<AdminProfileResponse> updateProfile(
            @RequestBody AdminProfileRequest request
    ) throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.updateProfile(request)
        );
    }

    // =========================
    // USER MANAGEMENT
    // =========================

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> getUsers(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) String search
    ) throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.getUsers(
                        role,
                        search
                )
        );
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<AdminUserResponse> getUser(
            @PathVariable UUID id
    ) throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.getUser(id)
        );
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<AdminUserResponse> updateRole(
            @PathVariable UUID id,
            @RequestBody AdminRoleUpdateRequest request
    ) throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.updateRole(
                        id,
                        request
                )
        );
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<AdminUserResponse> updateStatus(
            @PathVariable UUID id,
            @RequestBody AdminUserStatusRequest request
    ) throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.updateStatus(
                        id,
                        request
                )
        );
    }

    @PostMapping("/users/{id}/deactivate")
    public ResponseEntity<AdminUserResponse> deactivateUser(
            @PathVariable UUID id
    ) throws AccessDeniedException {

        AdminUserStatusRequest request =
                new AdminUserStatusRequest();

        request.setActive(false);
        request.setReason(
                "Deactivated by administrator"
        );

        return ResponseEntity.ok(
                adminService.updateStatus(
                        id,
                        request
                )
        );
    }

    // =========================
    // MODERATION LOGS
    // =========================

    @GetMapping("/moderation-logs")
    public ResponseEntity<Page<AdminModerationLogResponse>> getModerationLogs(
            Pageable pageable
    ) throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.getModerationLogs(pageable)
        );
    }
}