package com.agenticai.interviewrepo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminModerationLogResponse {
    private UUID id;
    private UUID adminId;
    private String adminName;
    private String entityType;
    private UUID entityId;
    private String action;
    private String reason;
    private String status;
    private String notes;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}