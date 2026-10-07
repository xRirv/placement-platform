package com.agenticai.interviewrepo.dto;

import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Partial update: null fields are left unchanged. */
public class StudyPlanUpdateRequest {
    @Size(max = 100) private String title;
    @Size(max = 5000) private String description;
    private LocalDate targetDate;
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDate getTargetDate() { return targetDate; }
    public void setTargetDate(LocalDate targetDate) { this.targetDate = targetDate; }
}
