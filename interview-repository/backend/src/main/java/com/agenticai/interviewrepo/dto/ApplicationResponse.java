package com.agenticai.interviewrepo.dto;

import com.agenticai.interviewrepo.model.Application;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ApplicationResponse(
        UUID id,
        UUID studentId,
        String studentName,
        UUID companyId,
        String companyName,
        String companyIndustry,
        String role,
        String status,
        LocalDate appliedDate,
        String currentRound,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ApplicationResponse from(Application app) {
        if (app == null) {
            return null;
        }

        UUID studentId = null;
        String studentName = null;
        if (app.getStudent() != null) {
            studentId = app.getStudent().getId();
            studentName = app.getStudent().getName();
        }

        UUID companyId = null;
        String companyName = null;
        String companyIndustry = null;
        if (app.getCompany() != null) {
            companyId = app.getCompany().getId();
            companyName = app.getCompany().getName();
            companyIndustry = app.getCompany().getIndustry();
        }

        return new ApplicationResponse(
                app.getId(),
                studentId,
                studentName,
                companyId,
                companyName,
                companyIndustry,
                app.getRole(),
                app.getStatus(),
                app.getAppliedDate(),
                app.getCurrentRound(),
                app.getNotes(),
                app.getCreatedAt(),
                app.getUpdatedAt()
        );
    }
}
