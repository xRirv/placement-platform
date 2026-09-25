package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.MentorProfileRequest;
import com.agenticai.interviewrepo.dto.MentorProfileResponse;
import com.agenticai.interviewrepo.service.MentorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mentor")
public class MentorController {

    private final MentorService mentorService;

    public MentorController(MentorService mentorService) {
        this.mentorService = mentorService;
    }

    @GetMapping("/profile")
    public ResponseEntity<MentorProfileResponse> getProfile() {

        return ResponseEntity.ok(
                mentorService.getMyProfile()
        );
    }

    @PutMapping("/profile")
    public ResponseEntity<MentorProfileResponse> updateProfile(
            @RequestBody MentorProfileRequest request
    ) {

        return ResponseEntity.ok(
                mentorService.updateMyProfile(request)
        );
    }
}