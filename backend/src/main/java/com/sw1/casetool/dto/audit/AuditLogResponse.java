package com.sw1.casetool.dto.audit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private UUID id;
    private UUID userId;
    private String userEmail;
    private String userFullName;
    private String userRole;
    private String actionType;
    private String entityName;
    private UUID entityId;
    private String ipAddress;
    private String userAgent;
    private Map<String, Object> details;
    private Instant timestamp;
}
