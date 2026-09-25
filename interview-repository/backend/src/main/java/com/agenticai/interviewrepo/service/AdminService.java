package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.AdminProfileRequest;
import com.agenticai.interviewrepo.dto.AdminProfileResponse;
import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.AccessDeniedException;

public class AdminService {
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    AdminService(UserRepository userRepository, CurrentUserService currentUserService) {
        this.userRepository=userRepository;
        this.currentUserService=currentUserService;
    }

    @Transactional
    public AdminProfileResponse getProfile() throws AccessDeniedException{
        User user=currentUserService.getCurrentUser();

        if (user.getRole()!= Role.ADMIN) {
            throw new AccessDeniedException("Administrator access required");
        }

        return toResponse(user);
    }

    @Transactional
    public AdminProfileResponse updateProfile(AdminProfileRequest request) throws AccessDeniedException {
        User user=currentUserService.getCurrentUser();

        if (user.getRole()!= Role.ADMIN) {
            throw new AccessDeniedException("Administrator access required");
        }

        if (request.getName()!=null) {
            user.setName(request.getName());
        }

        return toResponse(userRepository.save(user));
    }

    private AdminProfileResponse toResponse(User user) {

        AdminProfileResponse response =
                new AdminProfileResponse();

        response.setId(user.getId());
        response.setName(user.getName());
        response.setEmail(user.getEmail());
        response.setRole(user.getRole().name());
        response.setActive(user.isActive());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());

        return response;
    }
}
