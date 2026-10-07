package com.agenticai.interviewrepo.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AdminAlumniUpdateRequest {
    private String name;
    private String rollNumber;
    private UUID companyId;
    private String position;
    private Integer graduationYear;
    private Integer experienceYears;
    private String linkedinUrl;
    private String advice;
    private Boolean isActive;
}
