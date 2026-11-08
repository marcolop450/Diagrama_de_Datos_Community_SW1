package com.sw1.casetool.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "project_ai_configs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectAiConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "project_id", nullable = false, unique = true)
    private UUID projectId;

    @Builder.Default
    @Column(name = "provider", nullable = false, length = 50)
    private String provider = "SYSTEM_DEFAULT"; // SYSTEM_DEFAULT, OLLAMA_LOCAL, GROQ_CLOUD, GEMINI_API, OPENROUTER

    @Column(name = "ollama_endpoint", length = 255)
    private String ollamaEndpoint;

    @Column(name = "selected_model", length = 100)
    private String selectedModel;

    @Column(name = "api_key_encrypted", columnDefinition = "TEXT")
    private String apiKeyEncrypted;

    @Builder.Default
    @Column(name = "temperature", precision = 3, scale = 2)
    private BigDecimal temperature = new BigDecimal("0.20");

    @Builder.Default
    @Column(name = "max_tokens")
    private Integer maxTokens = 2048;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "last_tested_at")
    private Instant lastTestedAt;

    @Column(name = "last_test_status", length = 50)
    private String lastTestStatus; // SUCCESS, FAILED

    @Column(name = "last_test_latency_ms")
    private Integer lastTestLatencyMs;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
