package com.sw1.casetool.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Respaldo relacional en PostgreSQL 17 (JSONB) en caso de contingencia o indisponibilidad de MongoDB Atlas.
 */
@Entity
@Table(name = "session_snapshots_fallback")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionSnapshotFallback {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "session_code", nullable = false, length = 50)
    private String sessionCode;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "host_id", nullable = false)
    private UUID hostId;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 30)
    private String status = "SUSPENDED";

    @Column(name = "payload_json", columnDefinition = "TEXT", nullable = false)
    private String payloadJson;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
