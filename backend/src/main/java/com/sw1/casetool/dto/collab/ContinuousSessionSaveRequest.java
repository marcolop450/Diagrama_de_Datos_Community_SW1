package com.sw1.casetool.dto.collab;

import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContinuousSessionSaveRequest {

    private String sessionCode;
    private UUID projectId;
    private String projectName;

    @Builder.Default
    private List<Map<String, Object>> nodes = new ArrayList<>();

    @Builder.Default
    private List<Map<String, Object>> edges = new ArrayList<>();

    @Builder.Default
    private List<Map<String, Object>> chatHistory = new ArrayList<>();

    @Builder.Default
    private List<Map<String, Object>> sessionEventLogs = new ArrayList<>();

    @Builder.Default
    private Integer normalizationScore = 100;

    @Builder.Default
    private String normalizationLevel = "3NF";
}
