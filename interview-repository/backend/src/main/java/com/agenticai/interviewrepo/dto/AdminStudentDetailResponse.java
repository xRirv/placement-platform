package com.agenticai.interviewrepo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStudentDetailResponse {
    private UUID id;
    private UUID userId;
    private String name;
    private String rollNumber;
    private String email;
    private String phone;
    private String college;
    private String degree;
    private Integer graduationYear;
    private String resumeUrl;
    private String linkedinUrl;
    private String githubUrl;
    private String skills;
    private String bio;
    private Boolean isActive;
    private String generatedPassword; // Only populated when creating new user

    // Mentor info
    private UUID mentorId;
    private String mentorName;

    // Activity counts
    private Long interviewExperiencesCount;
    private Long applicationCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
