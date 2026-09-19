package com.agenticai.interviewrepo.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "app_users")
public class User {
    @Id
    private UUID id;
    @Column(name = "auth_user_id")
    private String auth_user_id;
    @Column(unique = true, nullable = false)
    private String email;
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private LocalDateTime createdAt;
}