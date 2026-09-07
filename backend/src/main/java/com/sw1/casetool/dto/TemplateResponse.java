package com.sw1.casetool.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemplateResponse {
    private String id;
    private String name;
    private String category;
    private String description;
    private String thumbnailUrl;
    private int nodeCount;
    private int edgeCount;
    private Map<String, Object> initialSchema;
    private Instant createdAt;
}
