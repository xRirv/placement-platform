package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<String> getCurrentAuthUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return Optional.ofNullable(jwt.getSubject());
        }
        return Optional.empty();
    }

    public Optional<Jwt> getCurrentJwt() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return Optional.of(jwt);
        }
        return Optional.empty();
    }

    public Optional<User> getCurrentUserOptional() {
        return getCurrentAuthUserId().flatMap(userRepository::findByAuthUserId);
    }

    public User getCurrentUser() {
        return getCurrentUserOptional().orElseThrow(() ->
                new AccessDeniedException("Authenticated user account record not found in system"));
    }

    /**
     * Prevents Insecure Direct Object Reference (IDOR).
     * Ensures that the authenticated caller either owns the specified resource or has the ADMIN role.
     */
    public void assertOwnerOrAdmin(UUID targetUserId) {
        User currentUser = getCurrentUser();
        if (currentUser.getRole() == Role.ADMIN) {
            return;
        }
        if (targetUserId == null || !currentUser.getId().equals(targetUserId)) {
            throw new AccessDeniedException("Access denied: You do not have permission to access or modify this resource");
        }
    }
}
