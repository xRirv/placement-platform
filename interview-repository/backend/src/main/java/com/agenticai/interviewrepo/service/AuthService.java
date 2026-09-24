package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.UserProfileResponse;
import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    public AuthService(UserRepository userRepository, CurrentUserService currentUserService) {
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentProfile() {
        Optional<User> userOptional = currentUserService.getCurrentUserOptional();
        if (userOptional.isPresent()) {
            return UserProfileResponse.fromEntity(userOptional.get());
        }

        // If user record doesn't exist yet in app_users, build transient response from JWT
        Jwt jwt = currentUserService.getCurrentJwt()
                .orElseThrow(() -> new AccessDeniedException("No authenticated principal found"));

        return UserProfileResponse.builder()
                .authUserId(jwt.getSubject())
                .email(jwt.getClaimAsString("email"))
                .name(jwt.getClaimAsString("name"))
                .role(Role.STUDENT)
                .active(true)
                .build();
    }

    @Transactional
    public UserProfileResponse syncProfile(String preferredName) {
        Jwt jwt = currentUserService.getCurrentJwt()
                .orElseThrow(() -> new AccessDeniedException("No authenticated principal found"));

        String authUserId = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            email = authUserId + "@supabase.user";
        }

        final String finalEmail = email;
        User user = userRepository.findByAuthUserId(authUserId)
                .orElseGet(() -> User.builder()
                        .authUserId(authUserId)
                        .email(finalEmail)
                        .name(preferredName != null && !preferredName.isBlank() ? preferredName : jwt.getClaimAsString("name"))
                        .role(Role.STUDENT)
                        .isActive(true)
                        .build());

        if (preferredName != null && !preferredName.isBlank()) {
            user.setName(preferredName);
        }

        User saved = userRepository.save(user);
        return UserProfileResponse.fromEntity(saved);
    }
}
