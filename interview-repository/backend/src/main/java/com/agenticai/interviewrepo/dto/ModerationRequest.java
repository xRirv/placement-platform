package com.agenticai.interviewrepo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ModerationRequest {
    @NotBlank @Size(max = 50)
    private String moderationStatus;
    @Size(max = 500)
    private String reason;
    public String getModerationStatus() { return moderationStatus; }
    public void setModerationStatus(String moderationStatus) { this.moderationStatus = moderationStatus; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
