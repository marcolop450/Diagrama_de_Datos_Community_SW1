package com.sw1.casetool.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {
    private UUID id;
    private String name;
    private String description;
    private String version;
    private List<String> tags;
    private Boolean isDeleted;
    private UUID clonedFromId;
    private UUID ownerId;
    private String ownerName;
    private long nodeCount;
    private long relationshipCount;
    private Map<String, Object> metadata;
    private Instant createdAt;
    private Instant updatedAt;
}
