package com.sw1.casetool.dto.architect;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollaboratorResponse {
    private UUID id;
    private UUID userId;
    private String fullName;
    private String username;
    private String email;
    private String role;
    private Boolean isActive;
    private UUID architectId;
    private String architectName;
    private Instant createdAt;
    private Instant updatedAt;
}
