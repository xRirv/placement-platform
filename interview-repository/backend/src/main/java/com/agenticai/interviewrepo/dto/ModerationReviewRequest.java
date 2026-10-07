package com.agenticai.interviewrepo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ModerationReviewRequest {
    @NotNull(message = "Status is required")
    private String status; // APPROVED or REJECTED

    @NotBlank(message = "Notes are required")
    private String notes;
}
