package com.sw1.casetool.dto.collab;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantDto {

    private UUID id;
    private UUID userId;
    private String fullName;
    private String dni;
    private String role; // 'host' | 'editor' | 'viewer'
    private String cursorColor;
    private Instant joinedAt;
}
