package com.sw1.casetool.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectAiConfigDto {
    private UUID id;
    private UUID projectId;
    private String provider; // SYSTEM_DEFAULT, OLLAMA_LOCAL, GROQ_CLOUD, GEMINI_API, OPENROUTER
    private String ollamaEndpoint;
    private String selectedModel;
    private String apiKey; // Si viene en PUT/POST se encripta; si va en GET se envía enmascarado
    private String maskedApiKey;
    private Boolean hasCustomApiKey;
    private BigDecimal temperature;
    private Integer maxTokens;
    private Boolean isActive;
    private Instant lastTestedAt;
    private String lastTestStatus;
    private Integer lastTestLatencyMs;

    public Boolean isHasCustomApiKey() {
        return Boolean.TRUE.equals(hasCustomApiKey);
    }
}
