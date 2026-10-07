package com.agenticai.interviewrepo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AdminMentorCreateRequest {
    @NotBlank(message = "Name is required")
    private String name;

    private String facultyId;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    private String password; // Optional - will be auto-generated if not provided

    private String bio;
    private String expertise;
}
