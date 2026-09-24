package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.UserProfileResponse;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.service.CurrentUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/student")
public class StudentStubController {

    private final CurrentUserService currentUserService;

    public StudentStubController(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getStudentProfile() {
        User student = currentUserService.getCurrentUser();
        return ResponseEntity.ok(UserProfileResponse.fromEntity(student));
    }

    @GetMapping("/{studentId}/private")
    public ResponseEntity<UserProfileResponse> getPrivateStudentData(@PathVariable UUID studentId) {
        // Enforce IDOR protection: only the resource owner or an ADMIN may access
        currentUserService.assertOwnerOrAdmin(studentId);
        User student = currentUserService.getCurrentUser();
        return ResponseEntity.ok(UserProfileResponse.fromEntity(student));
    }
}
