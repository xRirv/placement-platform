package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.InterviewExperienceResponse;
import com.agenticai.interviewrepo.dto.MentorProfileRequest;
import com.agenticai.interviewrepo.dto.MentorProfileResponse;
import com.agenticai.interviewrepo.dto.StudentProfileResponse;
import com.agenticai.interviewrepo.service.MentorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

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

    /** Students assigned to the current mentor. */
    @GetMapping("/mentees")
    public List<StudentProfileResponse> getMentees() {
        return mentorService.getMyMentees();
    }

    /** Active students without a mentor. */
    @GetMapping("/available-students")
    public List<StudentProfileResponse> getAvailableStudents() {
        return mentorService.getAvailableStudents();
    }

    @PostMapping("/mentees/{studentId}/assign")
    public StudentProfileResponse assignMentee(@PathVariable UUID studentId) {
        return mentorService.assignMentee(studentId);
    }

    /** A mentee's submitted interview experiences (mentor of that student, or admin). */
    @GetMapping("/mentees/{studentId}/experiences")
    public List<InterviewExperienceResponse> getMenteeExperiences(@PathVariable UUID studentId) {
        return mentorService.getMenteeExperiences(studentId);
    }
}