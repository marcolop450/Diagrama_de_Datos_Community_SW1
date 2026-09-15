package com.sw1.casetool.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Entidad de persistencia para el registro inmutable de consultas y ejecuciones
 * del motor de Inteligencia Artificial (CU16 Dictado de Voz y CU17 Visión de Pizarras).
 */
@Entity
@Table(name = "ai_prompt_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AiPromptLog {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "modality", nullable = false, length = 50)
    private String modality;

    @Column(name = "raw_prompt", nullable = false, columnDefinition = "text")
    private String rawPrompt;

    @Column(name = "interpreted_intent", length = 100)
    private String interpretedIntent;

    @Column(name = "model_version", length = 100)
    private String modelVersion;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Column(name = "latency_ms")
    private Integer latencyMs;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_json", columnDefinition = "jsonb")
    private Map<String, Object> responseJson;

    @Column(name = "applied_successfully")
    private Boolean appliedSuccessfully;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }
}
