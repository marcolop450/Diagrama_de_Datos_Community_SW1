package com.sw1.casetool.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectAiTestRequest {
    private String provider;
    private String ollamaEndpoint;
    private String selectedModel;
    private String apiKey; // Opcional, si no se envía se usa la guardada
    private BigDecimal temperature;
    private String testPrompt;
}
