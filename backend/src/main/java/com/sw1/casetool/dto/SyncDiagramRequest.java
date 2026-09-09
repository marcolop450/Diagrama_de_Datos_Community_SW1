package com.sw1.casetool.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncDiagramRequest {
    private List<SyncNodeItem> nodes;
    private List<SyncEdgeItem> edges;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncNodeItem {
        private String id;
        private String name;
        private String stereotype;
        private boolean isAbstract;
        private double positionX;
        private double positionY;
        private double width;
        private double height;
        private List<Map<String, Object>> attributes;
        private List<Map<String, Object>> methods;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncEdgeItem {
        private String id;
        private String source;
        private String target;
        private String type;
        private String sourceCardinality;
        private String targetCardinality;
        private String label;
        private String sourceRole;
        private String targetRole;
        private String sourceHandle;
        private String targetHandle;
        private String routing;
        private String waypoints;
    }
}
