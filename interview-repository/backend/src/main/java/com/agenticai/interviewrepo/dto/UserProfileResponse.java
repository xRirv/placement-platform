package com.agenticai.interviewrepo.dto;

import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileResponse {

    private UUID id;
    private String authUserId;
    private String email;
    private String name;
    private Role role;
    private boolean active;
    private LocalDateTime createdAt;

    public static UserProfileResponse fromEntity(User user) {
        if (user == null) {
            return null;
        }
        return UserProfileResponse.builder()
                .id(user.getId())
                .authUserId(user.getAuthUserId())
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole())
                .active(user.isActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
