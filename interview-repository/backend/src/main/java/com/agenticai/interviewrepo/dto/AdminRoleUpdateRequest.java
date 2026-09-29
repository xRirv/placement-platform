package com.agenticai.interviewrepo.dto;

import com.agenticai.interviewrepo.model.Role;

public class AdminRoleUpdateRequest {

    private Role role;

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}