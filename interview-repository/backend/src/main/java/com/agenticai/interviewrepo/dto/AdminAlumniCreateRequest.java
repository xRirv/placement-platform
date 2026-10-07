package com.agenticai.interviewrepo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class AdminAlumniCreateRequest {
    @NotBlank(message = "Name is required")
    private String name;

    private String rollNumber;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    private String password; // Optional - will be auto-generated if not provided

    private UUID companyId;
    private String position;
    private Integer graduationYear;
    private Integer experienceYears;
    private String linkedinUrl;
    private String advice;
}
