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
public class AdminAlumniDetailResponse {
    private UUID id;
    private UUID userId;
    private String name;
    private String rollNumber;
    private String email;
    private UUID companyId;
    private String companyName;
    private String position;
    private Integer graduationYear;
    private Integer experienceYears;
    private String linkedinUrl;
    private String advice;
    private Boolean isActive;
    private String generatedPassword; // Only populated when creating new user

    // Activity counts
    private Long interviewExperiencesCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
