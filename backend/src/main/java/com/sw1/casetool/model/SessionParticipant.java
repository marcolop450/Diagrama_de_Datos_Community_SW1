package com.sw1.casetool.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "session_participants")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionParticipant {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private CollaborationSession session;

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false)
    private String role;

    @Column(name = "cursor_color")
    private String cursorColor;

    @CreationTimestamp
    @Column(name = "joined_at", updatable = false)
    private Instant joinedAt;
}
