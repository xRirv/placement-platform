package com.agenticai.interviewrepo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public class ApplicationRequest {

    @NotNull(message = "Company ID is required")
    private UUID companyId;

    @NotBlank(message = "Role is required")
    @Size(max = 100, message = "Role must not exceed 100 characters")
    private String role;

    @Size(max = 50, message = "Status must not exceed 50 characters")
    private String status;

    private LocalDate appliedDate;

    @Size(max = 100, message = "Current round must not exceed 100 characters")
    private String currentRound;

    private String notes;

    public ApplicationRequest() {
    }

    public ApplicationRequest(UUID companyId, String role, String status, LocalDate appliedDate, String currentRound, String notes) {
        this.companyId = companyId;
        this.role = role;
        this.status = status;
        this.appliedDate = appliedDate;
        this.currentRound = currentRound;
        this.notes = notes;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public void setCompanyId(UUID companyId) {
        this.companyId = companyId;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDate getAppliedDate() {
        return appliedDate;
    }

    public void setAppliedDate(LocalDate appliedDate) {
        this.appliedDate = appliedDate;
    }

    public String getCurrentRound() {
        return currentRound;
    }

    public void setCurrentRound(String currentRound) {
        this.currentRound = currentRound;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
