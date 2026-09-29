package com.agenticai.interviewrepo.dto;

public class AdminUserStatusRequest {

    private boolean active;
    private String reason;

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}