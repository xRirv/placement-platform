package com.agenticai.interviewrepo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class AdminStudentCreateRequest {
    @NotBlank(message = "Name is required")
    private String name;

    private String rollNumber;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    private String password; // Optional - will be auto-generated if not provided

    private String phone;
    private String college;
    private String degree;
    private Integer graduationYear;
    private String resumeUrl;
    private String linkedinUrl;
    private String githubUrl;
    private String skills;
    private String bio;
    private UUID mentorId; // Optional mentor assignment
}
