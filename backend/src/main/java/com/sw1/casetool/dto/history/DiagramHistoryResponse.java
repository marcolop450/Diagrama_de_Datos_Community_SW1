package com.sw1.casetool.dto.history;

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
public class DiagramHistoryResponse {
    private UUID id;
    private UUID projectId;
    private String projectName;
    private UUID userId;
    private String userFullName;
    private String userEmail;
    private String userRole;
    private String userAvatarUrl;
    private String actionType;
    private String actionLabelSpanish;
    private String entityType;
    private UUID entityId;
    private Map<String, Object> beforeState;
    private Map<String, Object> afterState;
    private Instant createdAt;
}
