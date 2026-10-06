package com.agenticai.interviewrepo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminMentorDetailResponse {
    private UUID id;
    private UUID userId;
    private String name;
    private String facultyId;
    private String email;
    private String bio;
    private String expertise;
    private Boolean isActive;
    private String generatedPassword; // Only populated when creating new user

    // Students under this mentor
    private Long studentsCount;
    private List<MentorStudentInfo> students;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MentorStudentInfo {
        private UUID studentId;
        private String name;
        private String email;
        private String college;
        private String degree;
    }
}
