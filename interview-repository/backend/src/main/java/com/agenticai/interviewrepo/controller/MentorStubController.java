package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.UserProfileResponse;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.service.CurrentUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mentor")
public class MentorStubController {

    private final CurrentUserService currentUserService;

    public MentorStubController(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getMentorProfile() {
        User mentor = currentUserService.getCurrentUser();
        return ResponseEntity.ok(UserProfileResponse.fromEntity(mentor));
    }
}
