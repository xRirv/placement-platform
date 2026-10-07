package com.agenticai.interviewrepo.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Asks the AI service for a preparation plan and stores it as a study plan. */
public class StudyPlanGenerateRequest {
    @NotBlank @Size(max = 150) private String company;
    @Size(max = 100) private String role;
    @Min(1) @Max(180) private Integer daysAvailable = 14;
    @Size(max = 1000) private String message;
    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public Integer getDaysAvailable() { return daysAvailable; }
    public void setDaysAvailable(Integer daysAvailable) { this.daysAvailable = daysAvailable; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
