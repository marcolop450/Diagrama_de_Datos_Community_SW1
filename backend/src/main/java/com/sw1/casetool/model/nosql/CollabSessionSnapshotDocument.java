package com.sw1.casetool.model.nosql;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Entidad NoSQL BSON para instantáneas integrales de sesiones colaborativas continuas (CU16).
 * Almacenada en MongoDB Atlas (casetool_sessions.collab_session_snapshots) con tolerancia a fallos.
 */
@Document(collection = "collab_session_snapshots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollabSessionSnapshotDocument {

    @Id
    private String id;

    @Indexed
    private String sessionCode;

    @Indexed
    private String projectId;

    private String projectName;

    private String hostId;

    private String hostName;

    @Builder.Default
    private String status = "SUSPENDED";

    @Builder.Default
    private Instant savedAt = Instant.now();

    private Instant originalStartedAt;

    private Long elapsedMinutesBeforeSuspension;

    // Grafo UML Canónico de Alta Fidelidad
    @Builder.Default
    private List<Map<String, Object>> nodes = new ArrayList<>();

    @Builder.Default
    private List<Map<String, Object>> edges = new ArrayList<>();

    // Estado Colaborativo e Inteligencia Artificial
    @Builder.Default
    private List<Map<String, Object>> chatHistory = new ArrayList<>();

    @Builder.Default
    private List<Map<String, Object>> sessionEventLogs = new ArrayList<>();

    @Builder.Default
    private List<Map<String, Object>> activeParticipantsSnapshot = new ArrayList<>();

    // Métricas de Normalización Relacional (CU06)
    @Builder.Default
    private Integer normalizationScore = 100;

    @Builder.Default
    private String normalizationLevel = "3NF";

    @Builder.Default
    private String persistenceSource = "MONGODB_ATLAS";
}
