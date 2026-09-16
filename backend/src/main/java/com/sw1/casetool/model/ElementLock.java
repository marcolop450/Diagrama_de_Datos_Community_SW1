package com.sw1.casetool.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "element_locks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ElementLock {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private CollaborationSession session;

    @Column(name = "element_id", nullable = false)
    private UUID elementId;

    @Column(name = "locked_by", nullable = false)
    private UUID lockedBy;

    @Column(name = "locked_by_name")
    private String lockedByName;

    @CreationTimestamp
    @Column(name = "locked_at", updatable = false)
    private Instant lockedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}
