package com.agenticai.interviewrepo.dto;

import com.agenticai.interviewrepo.model.Company;

import java.time.LocalDateTime;
import java.util.UUID;

public record CompanyResponse(
        UUID id,
        String name,
        String industry,
        String website,
        String description,
        String location,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static CompanyResponse from(Company company) {
        if (company == null) {
            return null;
        }
        return new CompanyResponse(
                company.getId(),
                company.getName(),
                company.getIndustry(),
                company.getWebsite(),
                company.getDescription(),
                company.getLocation(),
                company.getCreatedAt(),
                company.getUpdatedAt()
        );
    }
}
