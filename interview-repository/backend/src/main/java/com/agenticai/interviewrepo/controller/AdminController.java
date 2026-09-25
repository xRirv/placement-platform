package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.AdminProfileRequest;
import com.agenticai.interviewrepo.dto.AdminProfileResponse;
import com.agenticai.interviewrepo.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.AccessDeniedException;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/profile")
    public ResponseEntity<AdminProfileResponse> getProfile() throws AccessDeniedException{

        return ResponseEntity.ok(
                adminService.getProfile()
        );
    }

    @PutMapping("/profile")
    public ResponseEntity<AdminProfileResponse> updateProfile(
            @RequestBody AdminProfileRequest request
    ) throws AccessDeniedException{

        return ResponseEntity.ok(
                adminService.updateProfile(request)
        );
    }
}