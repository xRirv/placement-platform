package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.AdminModerationRequest;
import com.agenticai.interviewrepo.dto.UserProfileResponse;
import com.agenticai.interviewrepo.model.ModerationLog;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.UserRepository;
import com.agenticai.interviewrepo.service.CurrentUserService;
import com.agenticai.interviewrepo.service.ModerationLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final ModerationLogService moderationLogService;
    private final CurrentUserService currentUserService;

    public AdminController(UserRepository userRepository,
                           ModerationLogService moderationLogService,
                           CurrentUserService currentUserService) {
        this.userRepository = userRepository;
        this.moderationLogService = moderationLogService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        List<UserProfileResponse> users = userRepository.findAll().stream()
                .map(UserProfileResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(users);
    }

    @PostMapping("/users/{userId}/deactivate")
    public ResponseEntity<UserProfileResponse> deactivateUser(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "Administrative deactivation") String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        user.setActive(false);
        User saved = userRepository.save(user);

        // Audit the deactivation using the authenticated admin's identity
        User admin = currentUserService.getCurrentUser();
        moderationLogService.log(admin.getId(), "USER", userId, "DEACTIVATE", reason);

        return ResponseEntity.ok(UserProfileResponse.fromEntity(saved));
    }

    @PostMapping("/moderate")
    public ResponseEntity<ModerationLog> submitModeration(
            @RequestBody AdminModerationRequest request) {
        User admin = currentUserService.getCurrentUser();
        ModerationLog log = moderationLogService.log(
                admin.getId(),
                request.getEntityType(),
                request.getEntityId(),
                request.getAction(),
                request.getReason()
        );
        return ResponseEntity.ok(log);
    }

    @GetMapping("/moderation-logs")
    public ResponseEntity<List<ModerationLog>> getModerationLogs() {
        return ResponseEntity.ok(moderationLogService.getAllLogs());
    }
}
