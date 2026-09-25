package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.AlumniProfileRequest;
import com.agenticai.interviewrepo.dto.AlumniProfileResponse;
import com.agenticai.interviewrepo.service.AlumniService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/alumni")
public class AlumniController {

    private final AlumniService alumniService;

    public AlumniController(AlumniService alumniService) {
        this.alumniService = alumniService;
    }

    @GetMapping("/profile")
    public ResponseEntity<AlumniProfileResponse> getProfile() {

        return ResponseEntity.ok(
                alumniService.getMyProfile()
        );
    }

    @PutMapping("/profile")
    public ResponseEntity<AlumniProfileResponse> updateProfile(
            @RequestBody AlumniProfileRequest request
    ) {

        return ResponseEntity.ok(
                alumniService.updateMyProfile(request)
        );
    }
}