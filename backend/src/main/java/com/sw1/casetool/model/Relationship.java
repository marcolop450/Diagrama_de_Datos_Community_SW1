package com.sw1.casetool.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "relationships")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Relationship {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private DiagramProject project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_class_id", nullable = false)
    private ClassNode sourceClass;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_class_id", nullable = false)
    private ClassNode targetClass;

    @Column(nullable = false)
    private String type;

    @Column(name = "source_cardinality")
    private String sourceCardinality;

    @Column(name = "target_cardinality")
    private String targetCardinality;

    private String label;

    @Column(name = "source_role")
    private String sourceRole;

    @Column(name = "target_role")
    private String targetRole;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
