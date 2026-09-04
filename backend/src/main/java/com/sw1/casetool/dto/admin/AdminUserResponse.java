package com.sw1.casetool.dto.admin;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminUserResponse {
    private UUID id;
    private UUID userId;
    private String fullName;
    private String username;
    private String email;
    private String role;
    private String subscriptionPlan;
    private Instant subscriptionExpiresAt;
    private Boolean isActive;
    private String avatarUrl;
    private Instant createdAt;
    private Instant updatedAt;
}
