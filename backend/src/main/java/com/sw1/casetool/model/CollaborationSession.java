package com.sw1.casetool.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "collaboration_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollaborationSession {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private DiagramProject project;

    @Column(name = "host_id")
    private UUID hostId;

    @Column(name = "session_code", unique = true, nullable = false)
    private String sessionCode;

    @Column(nullable = false)
    private String status;

    @CreationTimestamp
    @Column(name = "started_at", updatable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;
}
