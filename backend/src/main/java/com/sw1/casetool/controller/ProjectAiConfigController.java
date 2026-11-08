package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.ai.OllamaModelsResponse;
import com.sw1.casetool.dto.ai.ProjectAiConfigDto;
import com.sw1.casetool.dto.ai.ProjectAiTestRequest;
import com.sw1.casetool.dto.ai.ProjectAiTestResponse;
import com.sw1.casetool.service.ai.ProjectAiConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/projects/{projectId}/ai-config")
@RequiredArgsConstructor
@Tag(name = "Configuración de Inferencia IA por Proyecto (CU15)", description = "Administración de proveedores locales (Ollama), llaves BYOK (Groq, Gemini, OpenRouter) y sandbox de pruebas")
public class ProjectAiConfigController {

    private final ProjectAiConfigService aiConfigService;

    @GetMapping
    @Operation(summary = "Obtener configuración de motor de IA para el proyecto")
    public ResponseEntity<ApiResponse<ProjectAiConfigDto>> getProjectAiConfig(
            @PathVariable UUID projectId
    ) {
        ProjectAiConfigDto dto = aiConfigService.getProjectAiConfig(projectId);
        return ResponseEntity.ok(ApiResponse.success(
                "Configuración de IA del proyecto recuperada exitosamente",
                dto
        ));
    }

    @PutMapping
    @Operation(summary = "Guardar o actualizar configuración de IA del proyecto")
    public ResponseEntity<ApiResponse<ProjectAiConfigDto>> saveProjectAiConfig(
            @PathVariable UUID projectId,
            @RequestBody ProjectAiConfigDto dto
    ) {
        ProjectAiConfigDto saved = aiConfigService.saveProjectAiConfig(projectId, dto);
        return ResponseEntity.ok(ApiResponse.success(
                "Configuración de IA guardada exitosamente para el proyecto",
                saved
        ));
    }

    @PostMapping("/test")
    @Operation(summary = "Ejecutar prueba de conexión e inferencia (Sandbox Cero Fallos)")
    public ResponseEntity<ApiResponse<ProjectAiTestResponse>> testAiConnection(
            @PathVariable UUID projectId,
            @RequestBody ProjectAiTestRequest request
    ) {
        ProjectAiTestResponse response = aiConfigService.testAiConnection(projectId, request);
        return ResponseEntity.ok(ApiResponse.success(
                response.isSuccess() ? "Prueba de inferencia exitosa" : "Fallo en prueba de inferencia",
                response
        ));
    }

    @PostMapping("/detect-local")
    @Operation(summary = "Detectar modelos locales instalados en servidor local (LM Studio u Ollama)")
    public ResponseEntity<ApiResponse<OllamaModelsResponse>> detectLocalModels(
            @PathVariable UUID projectId,
            @RequestBody Map<String, String> payload
    ) {
        String serverType = payload.getOrDefault("serverType", "LMSTUDIO");
        String endpoint = payload.get("endpoint");
        OllamaModelsResponse response = aiConfigService.detectLocalModels(serverType, endpoint);
        return ResponseEntity.ok(ApiResponse.success(
                response.isSuccess() ? "Modelos locales detectados exitosamente" : "No se pudo conectar al servidor local",
                response
        ));
    }

    @PostMapping("/detect-ollama")
    @Operation(summary = "Detectar modelos locales instalados en servidor Ollama")
    public ResponseEntity<ApiResponse<OllamaModelsResponse>> detectOllamaModels(
            @PathVariable UUID projectId,
            @RequestBody Map<String, String> payload
    ) {
        String endpoint = payload.get("endpoint");
        OllamaModelsResponse response = aiConfigService.detectOllamaModels(endpoint);
        return ResponseEntity.ok(ApiResponse.success(
                response.isSuccess() ? "Modelos locales detectados exitosamente" : "No se pudo conectar a Ollama",
                response
        ));
    }

    @PostMapping("/discover-external-models")
    @Operation(summary = "Descubrir modelos autorizados en API externa (Meta, OpenAI, Groq, OpenRouter)")
    public ResponseEntity<ApiResponse<OllamaModelsResponse>> discoverExternalModels(
            @PathVariable UUID projectId,
            @RequestBody ProjectAiTestRequest request
    ) {
        OllamaModelsResponse response = aiConfigService.discoverExternalModels(
                projectId,
                request.getProvider(),
                request.getOllamaEndpoint(),
                request.getApiKey()
        );
        return ResponseEntity.ok(ApiResponse.success(
                response.isSuccess() ? "Modelos de la API externa descubiertos exitosamente" : "No se pudieron obtener los modelos",
                response
        ));
    }
}
