package com.sw1.casetool.dto.auth;

import lombok.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String token;
    private String tokenType;
    private UUID userId;
    private String email;
    private String fullName;
    private String username;
    private String role;
    private String subscriptionPlan;
    private Instant subscriptionExpiresAt;
    private String avatarUrl;
    private Map<String, Object> preferences;
}
