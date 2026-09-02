package com.sw1.casetool.dto.user;

import lombok.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileDto {

    private UUID userId;
    private String email;
    private String fullName;
    private String username;
    private String avatarUrl;
    private String role;
    private String subscriptionPlan;
    private Instant subscriptionExpiresAt;
    private Map<String, Object> preferences;
    private Instant createdAt;
    private Instant updatedAt;
}
