package com.agenticai.interviewrepo.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AdminStudentUpdateRequest {
    private String name;
    private String rollNumber;
    private String phone;
    private String college;
    private String degree;
    private Integer graduationYear;
    private String resumeUrl;
    private String linkedinUrl;
    private String githubUrl;
    private String skills;
    private String bio;
    private UUID mentorId;
    private Boolean isActive;
}
