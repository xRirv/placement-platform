package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.AdminModerationLogResponse;
import com.agenticai.interviewrepo.dto.AdminProfileRequest;
import com.agenticai.interviewrepo.dto.AdminProfileResponse;
import com.agenticai.interviewrepo.dto.AdminRoleUpdateRequest;
import com.agenticai.interviewrepo.dto.AdminUserResponse;
import com.agenticai.interviewrepo.dto.AdminUserStatusRequest;
import com.agenticai.interviewrepo.model.Administrator;
import com.agenticai.interviewrepo.model.ModerationLog;
import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.AdministratorRepository;
import com.agenticai.interviewrepo.repository.ModerationLogRepository;
import com.agenticai.interviewrepo.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final AdministratorRepository administratorRepository;
    private final ModerationLogRepository moderationLogRepository;
    private final CurrentUserService currentUserService;

    public AdminService(
            UserRepository userRepository,
            AdministratorRepository administratorRepository,
            ModerationLogRepository moderationLogRepository,
            CurrentUserService currentUserService
    ) {
        this.userRepository = userRepository;
        this.administratorRepository = administratorRepository;
        this.moderationLogRepository = moderationLogRepository;
        this.currentUserService = currentUserService;
    }

    // =========================
    // ADMIN PROFILE
    // =========================

    @Transactional(readOnly = true)
    public AdminProfileResponse getProfile()
            throws AccessDeniedException {

        User user = currentUserService.getCurrentUser();

        verifyAdmin(user);

        return toProfileResponse(user);
    }

    @Transactional
    public AdminProfileResponse updateProfile(
            AdminProfileRequest request
    ) throws AccessDeniedException {

        User user = currentUserService.getCurrentUser();

        verifyAdmin(user);

        if (request.getName() != null) {
            user.setName(request.getName());
        }

        // Update administrator profile with college
        Administrator admin = administratorRepository.findByLogin(user)
                .orElseThrow(() -> new IllegalStateException("Administrator profile not found"));

        if (request.getCollege() != null) {
            admin.setCollege(request.getCollege());
        }

        administratorRepository.save(admin);

        return toProfileResponse(
                userRepository.save(user)
        );
    }

    // =========================
    // USER MANAGEMENT
    // =========================

    @Transactional(readOnly = true)
    public List<AdminUserResponse> getUsers(
            Role role,
            String search
    ) throws AccessDeniedException {

        verifyAdmin(
                currentUserService.getCurrentUser()
        );

        List<User> users;

        if (role != null && search != null
                && !search.trim().isEmpty()) {

            users =
                    userRepository
                            .findByRoleAndNameContainingIgnoreCase(
                                    role,
                                    search.trim()
                            );

        } else if (role != null) {

            users =
                    userRepository
                            .findByRoleOrderByCreatedAtDesc(role);

        } else {

            users =
                    userRepository
                            .findAll();
        }

        return users.stream()
                .map(this::toUserResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminUserResponse getUser(
            UUID userId
    ) throws AccessDeniedException {

        verifyAdmin(
                currentUserService.getCurrentUser()
        );

        User user = findUser(userId);

        return toUserResponse(user);
    }

    @Transactional
    public AdminUserResponse updateRole(
            UUID userId,
            AdminRoleUpdateRequest request
    ) throws AccessDeniedException {

        User currentAdmin =
                currentUserService.getCurrentUser();

        verifyAdmin(currentAdmin);

        User user = findUser(userId);

        if (request.getRole() == null) {
            throw new IllegalArgumentException(
                    "Role is required"
            );
        }

        // Prevent admin from removing own admin role
        if (currentAdmin.getId().equals(user.getId())
                && request.getRole() != Role.ADMIN) {

            throw new IllegalStateException(
                    "You cannot remove your own admin role"
            );
        }

        user.setRole(request.getRole());

        return toUserResponse(
                userRepository.save(user)
        );
    }

    @Transactional
    public AdminUserResponse updateStatus(
            UUID userId,
            AdminUserStatusRequest request
    ) throws AccessDeniedException {

        User currentAdmin =
                currentUserService.getCurrentUser();

        verifyAdmin(currentAdmin);

        User user = findUser(userId);

        // Prevent admin from disabling own account
        if (currentAdmin.getId().equals(user.getId())
                && !request.isActive()) {

            throw new IllegalStateException(
                    "You cannot deactivate your own account"
            );
        }

        user.setActive(request.isActive());

        return toUserResponse(
                userRepository.save(user)
        );
    }

    // =========================
    // MODERATION LOGS
    // =========================

    @Transactional(readOnly = true)
    public Page<AdminModerationLogResponse> getModerationLogs(
            Pageable pageable
    ) throws AccessDeniedException {

        verifyAdmin(
                currentUserService.getCurrentUser()
        );

        Page<ModerationLog> logs = moderationLogRepository.findAllByOrderByCreatedAtDesc(pageable);

        return logs.map(this::toModerationLogResponse);
    }

    // =========================
    // HELPERS
    // =========================

    private void verifyAdmin(User user) {

        if (user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException(
                    "Administrator access required"
            );
        }
    }

    private User findUser(UUID userId) {

        return userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "User not found"
                        )
                );
    }

    private AdminProfileResponse toProfileResponse(
            User user
    ) {
        Administrator admin = administratorRepository.findByLogin(user)
                .orElseThrow(() -> new IllegalStateException("Administrator profile not found"));

        return AdminProfileResponse.builder()
                .id(admin.getId())
                .loginId(user.getId())
                .name(user.getName() != null && !user.getName().isBlank() ? user.getName() : admin.getName())
                .email(user.getEmail())
                .college(admin.getCollege())
                .role(user.getRole())
                .isActive(user.isActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    private AdminUserResponse toUserResponse(
            User user
    ) {

        AdminUserResponse response =
                new AdminUserResponse();

        response.setId(user.getId());
        response.setName(user.getName());
        response.setEmail(user.getEmail());
        response.setRole(user.getRole());
        response.setActive(user.isActive());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());

        return response;
    }

    private AdminModerationLogResponse toModerationLogResponse(
            ModerationLog log
    ) {

        AdminModerationLogResponse response =
                new AdminModerationLogResponse();

        response.setId(log.getId());
        response.setAdminId(log.getAdminId());
        if (log.getAdmin() != null && log.getAdmin().getLogin() != null) {
            response.setAdminName(log.getAdmin().getLogin().getName());
        }
        response.setEntityType(log.getEntityType());
        response.setEntityId(log.getEntityId());
        response.setAction(log.getAction());
        response.setReason(log.getReason());
        response.setCreatedAt(log.getCreatedAt());

        return response;
    }
}