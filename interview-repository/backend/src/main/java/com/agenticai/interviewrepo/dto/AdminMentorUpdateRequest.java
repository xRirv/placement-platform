package com.agenticai.interviewrepo.dto;

import lombok.Data;

@Data
public class AdminMentorUpdateRequest {
    private String name;
    private String facultyId;
    private String bio;
    private String expertise;
    private Boolean isActive;
}
