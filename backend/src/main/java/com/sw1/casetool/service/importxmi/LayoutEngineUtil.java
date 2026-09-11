package com.sw1.casetool.service.importxmi;

import java.util.*;

/**
 * Intelligent Layout Engine for positioning imported UML classes
 * in an organic, non-overlapping hierarchical structure (Topological Layering).
 */
public final class LayoutEngineUtil {

    private static final double START_X = 80.0;
    private static final double START_Y = 80.0;
    private static final double HORIZONTAL_SPACING = 360.0;
    private static final double VERTICAL_SPACING = 240.0;
    private static final int GRID_COLUMNS = 3;

    private LayoutEngineUtil() {}

    public static class NodePosition {
        public double x;
        public double y;

        public NodePosition(double x, double y) {
            this.x = x;
            this.y = y;
        }
    }

    public static class EdgeDefinition {
        public String sourceId;
        public String targetId;

        public EdgeDefinition(String sourceId, String targetId) {
            this.sourceId = sourceId;
            this.targetId = targetId;
        }
    }

    /**
     * Computes (x, y) coordinates for all class IDs based on their relational topology.
     */
    public static Map<String, NodePosition> computeLayout(
            List<String> classIds,
            List<EdgeDefinition> edges,
            Map<String, NodePosition> existingPositions
    ) {
        Map<String, NodePosition> result = new LinkedHashMap<>();
        if (classIds == null || classIds.isEmpty()) {
            return result;
        }

        // If existing positions are present and non-zero, preserve them
        boolean hasValidExistingPositions = existingPositions != null && !existingPositions.isEmpty() &&
                existingPositions.values().stream().anyMatch(p -> p != null && (Math.abs(p.x) > 0.1 || Math.abs(p.y) > 0.1));

        if (hasValidExistingPositions) {
            for (String id : classIds) {
                if (existingPositions.containsKey(id) && existingPositions.get(id) != null) {
                    result.put(id, existingPositions.get(id));
                }
            }
            // If all classes had positions, return immediately
            if (result.size() == classIds.size()) {
                return result;
            }
        }

        // Build adjacency list for hierarchical layering
        Map<String, List<String>> outgoing = new HashMap<>();
        Map<String, Integer> inDegree = new HashMap<>();

        for (String id : classIds) {
            outgoing.put(id, new ArrayList<>());
            inDegree.put(id, 0);
        }

        if (edges != null) {
            for (EdgeDefinition edge : edges) {
                if (edge.sourceId != null && edge.targetId != null &&
                        !edge.sourceId.equals(edge.targetId) &&
                        outgoing.containsKey(edge.sourceId) &&
                        inDegree.containsKey(edge.targetId)) {
                    outgoing.get(edge.sourceId).add(edge.targetId);
                    inDegree.put(edge.targetId, inDegree.get(edge.targetId) + 1);
                }
            }
        }

        // Topological / Layer Assignment
        Map<String, Integer> layers = new HashMap<>();
        Queue<String> queue = new LinkedList<>();

        for (String id : classIds) {
            if (inDegree.get(id) == 0) {
                layers.put(id, 0);
                queue.add(id);
            }
        }

        // Handle cycles or graph without zero in-degree nodes: seed first element
        if (queue.isEmpty()) {
            String first = classIds.get(0);
            layers.put(first, 0);
            queue.add(first);
        }

        while (!queue.isEmpty()) {
            String curr = queue.poll();
            int currLayer = layers.getOrDefault(curr, 0);

            for (String next : outgoing.getOrDefault(curr, Collections.emptyList())) {
                int nextLayer = currLayer + 1;
                if (!layers.containsKey(next) || layers.get(next) < nextLayer) {
                    layers.put(next, nextLayer);
                    queue.add(next);
                }
            }
        }

        // Assign any unvisited nodes to layer 0
        for (String id : classIds) {
            if (!layers.containsKey(id)) {
                layers.put(id, 0);
            }
        }

        // Group by layer
        Map<Integer, List<String>> layerNodes = new TreeMap<>();
        for (String id : classIds) {
            int l = layers.getOrDefault(id, 0);
            layerNodes.computeIfAbsent(l, k -> new ArrayList<>()).add(id);
        }

        // Check if all nodes are in layer 0 and no edges exist: use smart grid
        if (layerNodes.size() <= 1 && (edges == null || edges.isEmpty())) {
            int idx = 0;
            for (String id : classIds) {
                int col = idx % GRID_COLUMNS;
                int row = idx / GRID_COLUMNS;
                double x = START_X + col * HORIZONTAL_SPACING;
                double y = START_Y + row * VERTICAL_SPACING;
                result.put(id, new NodePosition(x, y));
                idx++;
            }
            return result;
        }

        // Layered layout: assign (x, y) with horizontal distribution per layer
        for (Map.Entry<Integer, List<String>> entry : layerNodes.entrySet()) {
            int layerIndex = entry.getKey();
            List<String> nodesInLayer = entry.getValue();

            for (int i = 0; i < nodesInLayer.size(); i++) {
                String id = nodesInLayer.get(i);
                double x = START_X + i * HORIZONTAL_SPACING;
                double y = START_Y + layerIndex * VERTICAL_SPACING;
                result.put(id, new NodePosition(x, y));
            }
        }

        return result;
    }
}
