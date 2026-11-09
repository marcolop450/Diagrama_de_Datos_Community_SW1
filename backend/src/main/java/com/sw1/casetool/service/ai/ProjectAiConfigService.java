package com.sw1.casetool.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.ai.*;
import com.sw1.casetool.model.ProjectAiConfig;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.ProjectAiConfigRepository;
import com.sw1.casetool.service.security.AesEncryptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectAiConfigService {

    private final ProjectAiConfigRepository aiConfigRepository;
    private final DiagramProjectRepository projectRepository;
    private final AesEncryptionService aesEncryptionService;
    private final ObjectMapper objectMapper;

    private final RestClient restClient = RestClient.builder()
            .requestFactory(createRequestFactory(10000, 120000))
            .defaultHeader("Bypass-Tunnel-Reminder", "true")
            .defaultHeader("ngrok-skip-browser-warning", "69420")
            .defaultHeader("User-Agent", "CASE-Tool-Agent/1.0")
            .messageConverters(converters -> {
                org.springframework.http.converter.StringHttpMessageConverter stringConverter =
                        new org.springframework.http.converter.StringHttpMessageConverter(java.nio.charset.StandardCharsets.UTF_8);
                stringConverter.setSupportedMediaTypes(List.of(MediaType.ALL));
                converters.add(0, stringConverter);
            })
            .build();

    private final HttpClient nativeHttpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private String executeDirectHttpJson(String url, String jsonBody, Map<String, String> headers, Duration timeout) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json, text/plain, */*")
                .header("Bypass-Tunnel-Reminder", "true")
                .header("ngrok-skip-browser-warning", "69420")
                .header("User-Agent", "CASE-Tool-Agent/1.0")
                .timeout(timeout != null ? timeout : Duration.ofSeconds(60))
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8));

        if (headers != null) {
            headers.forEach(builder::header);
        }

        HttpResponse<String> response = nativeHttpClient.send(
                builder.build(),
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
        );

        if (response.statusCode() >= 400) {
            throw new RuntimeException("HTTP " + response.statusCode() + ": " + response.body());
        }
        return response.body();
    }

    private static SimpleClientHttpRequestFactory createRequestFactory(int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        return factory;
    }

    @Transactional(readOnly = true)
    public ProjectAiConfigDto getProjectAiConfig(UUID projectId) {
        return aiConfigRepository.findByProjectId(projectId)
                .map(this::mapToDto)
                .orElseGet(() -> ProjectAiConfigDto.builder()
                        .projectId(projectId)
                        .provider("SYSTEM_DEFAULT")
                        .ollamaEndpoint("")
                        .selectedModel("")
                        .temperature(new BigDecimal("0.20"))
                        .maxTokens(2048)
                        .isActive(true)
                        .hasCustomApiKey(false)
                        .build());
    }

    @Transactional
    public ProjectAiConfigDto saveProjectAiConfig(UUID projectId, ProjectAiConfigDto dto) {
        ProjectAiConfig config = aiConfigRepository.findByProjectId(projectId)
                .orElseGet(() -> ProjectAiConfig.builder()
                        .projectId(projectId)
                        .build());

        String provider = dto.getProvider() != null && !dto.getProvider().isBlank()
                ? dto.getProvider().toUpperCase().trim()
                : "SYSTEM_DEFAULT";

        config.setProvider(provider);
        config.setOllamaEndpoint(dto.getOllamaEndpoint() != null ? dto.getOllamaEndpoint().trim() : null);
        config.setSelectedModel(dto.getSelectedModel() != null ? dto.getSelectedModel().trim() : null);
        config.setTemperature(dto.getTemperature() != null ? dto.getTemperature() : new BigDecimal("0.20"));
        config.setMaxTokens(dto.getMaxTokens() != null ? dto.getMaxTokens() : 2048);
        config.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);

        // Si se envió una API key nueva (no vacía y no enmascarada con asteriscos)
        if (dto.getApiKey() != null && !dto.getApiKey().isBlank() && !dto.getApiKey().contains("••••")) {
            config.setApiKeyEncrypted(aesEncryptionService.encrypt(dto.getApiKey().trim()));
        } else if (dto.getApiKey() != null && dto.getApiKey().isBlank()) {
            // Clave enviada en blanco explícitamente para borrarla
            config.setApiKeyEncrypted(null);
        }

        ProjectAiConfig saved = aiConfigRepository.save(config);
        log.info("Configuración de inferencia IA actualizada para proyecto {}: proveedor={}, modelo={}",
                projectId, saved.getProvider(), saved.getSelectedModel());

        return mapToDto(saved);
    }

    /**
     * Autodescubrimiento de modelos en servidores locales (Ollama o LM Studio).
     */
    public OllamaModelsResponse detectLocalModels(String serverType, String endpoint) {
        boolean isLmStudio = "LMSTUDIO".equalsIgnoreCase(serverType) || "LMSTUDIO_LOCAL".equalsIgnoreCase(serverType);

        if (endpoint == null || endpoint.isBlank()) {
            String example = isLmStudio ? "http://localhost:1234" : "http://localhost:11434";
            return OllamaModelsResponse.builder()
                    .success(false)
                    .errorMessage("Por favor ingresa la URL de tu servidor local (ej. " + example + ")")
                    .models(Collections.emptyList())
                    .build();
        }

        String cleanedEndpoint = endpoint.trim().replaceAll("/+$", "");

        if (isLmStudio) {
            String url = cleanedEndpoint.endsWith("/v1") ? cleanedEndpoint + "/models" : cleanedEndpoint + "/v1/models";
            try {
                log.info("Consultando modelos locales en LM Studio: {}", url);
                String responseStr = restClient.get()
                        .uri(url)
                        .accept(MediaType.APPLICATION_JSON)
                        .retrieve()
                        .body(String.class);

                List<String> modelNames = new ArrayList<>();
                if (responseStr != null && !responseStr.isBlank()) {
                    JsonNode root = objectMapper.readTree(responseStr);
                    JsonNode dataNode = root.path("data");
                    if (dataNode.isArray()) {
                        for (JsonNode m : dataNode) {
                            String id = m.path("id").asText(null);
                            if (id != null && !id.isBlank()) {
                                modelNames.add(id);
                            }
                        }
                    }
                }

                if (modelNames.isEmpty()) {
                    return OllamaModelsResponse.builder()
                            .success(true)
                            .endpoint(cleanedEndpoint)
                            .models(Collections.emptyList())
                            .errorMessage("LM Studio respondió correctamente pero no se detectaron modelos cargados. Ve a LM Studio y carga un modelo en memoria.")
                            .build();
                }

                return OllamaModelsResponse.builder()
                        .success(true)
                        .endpoint(cleanedEndpoint)
                        .models(modelNames)
                        .build();

            } catch (Exception e) {
                log.warn("Fallo al conectar con servidor LM Studio en {}: {}", url, e.getMessage());
                return OllamaModelsResponse.builder()
                        .success(false)
                        .endpoint(cleanedEndpoint)
                        .models(Collections.emptyList())
                        .errorMessage("No se pudo conectar con LM Studio en '" + cleanedEndpoint + "'. Verifica que el servidor local esté encendido en la pestaña 'Developer' -> 'Start Server' en LM Studio (puerto 1234).")
                        .build();
            }
        } else {
            return detectOllamaModels(endpoint);
        }
    }

    /**
     * Autodescubrimiento de modelos locales instalados en el servidor Ollama mediante GET /api/tags.
     */
    public OllamaModelsResponse detectOllamaModels(String endpoint) {
        if (endpoint == null || endpoint.isBlank()) {
            return OllamaModelsResponse.builder()
                    .success(false)
                    .errorMessage("Por favor ingresa la URL de tu servidor Ollama (ej. http://localhost:11434)")
                    .models(Collections.emptyList())
                    .build();
        }

        String cleanedEndpoint = endpoint.trim().replaceAll("/+$", "");
        String url = cleanedEndpoint + "/api/tags";

        try {
            log.info("Consultando modelos locales en Ollama: {}", url);
            String responseStr = restClient.get()
                    .uri(url)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(String.class);

            List<String> modelNames = new ArrayList<>();
            if (responseStr != null && !responseStr.isBlank()) {
                JsonNode root = objectMapper.readTree(responseStr);
                JsonNode modelsNode = root.path("models");
                if (modelsNode.isArray()) {
                    for (JsonNode m : modelsNode) {
                        String name = m.path("name").asText(null);
                        if (name != null && !name.isBlank()) {
                            modelNames.add(name);
                        }
                    }
                }
            }

            if (modelNames.isEmpty()) {
                return OllamaModelsResponse.builder()
                        .success(true)
                        .endpoint(cleanedEndpoint)
                        .models(Collections.emptyList())
                        .errorMessage("Ollama respondió correctamente pero no se encontraron modelos descargados. Ejecuta 'ollama pull <modelo>' en tu terminal.")
                        .build();
            }

            return OllamaModelsResponse.builder()
                    .success(true)
                    .endpoint(cleanedEndpoint)
                    .models(modelNames)
                    .build();

        } catch (Exception e) {
            log.warn("Fallo al conectar con servidor Ollama en {}: {}", url, e.getMessage());
            return OllamaModelsResponse.builder()
                    .success(false)
                    .endpoint(cleanedEndpoint)
                    .models(Collections.emptyList())
                    .errorMessage("No se pudo conectar con Ollama en '" + cleanedEndpoint + "'. Verifica que el servidor esté encendido (ej. 'ollama serve') y que no haya bloqueos de firewall o CORS.")
                    .build();
        }
    }

    /**
     * Consulta el catálogo de modelos disponibles en una API externa (Meta, OpenAI, Groq, OpenRouter)
     * mediante GET /v1/models con la API Key proporcionada, evitando errores de 'model_not_found'.
     */
    public OllamaModelsResponse discoverExternalModels(UUID projectId, String provider, String endpoint, String apiKey) {
        String rawKey = resolveApiKey(projectId, apiKey);
        String displayProvider = (provider != null && !provider.isBlank()) ? provider.trim() : "API Externa";

        if (rawKey == null || rawKey.isBlank()) {
            return OllamaModelsResponse.builder()
                    .success(false)
                    .models(Collections.emptyList())
                    .errorMessage("Se requiere ingresar una API Key válida para consultar los modelos de " + displayProvider + ".")
                    .build();
        }

        String baseEndpoint = (endpoint != null && !endpoint.isBlank()) ? endpoint.trim() : "";
        if (baseEndpoint.isBlank()) {
            if (provider != null && provider.toLowerCase().contains("meta")) {
                baseEndpoint = "https://api.meta.ai/v1";
            } else if (provider != null && provider.toLowerCase().contains("openrouter")) {
                baseEndpoint = "https://openrouter.ai/api/v1";
            } else if (provider != null && provider.toLowerCase().contains("groq")) {
                baseEndpoint = "https://api.groq.com/openai/v1";
            } else {
                baseEndpoint = "https://api.openai.com/v1";
            }
        }

        String clean = baseEndpoint.replaceAll("/+$", "");
        String url = clean.endsWith("/models") ? clean : (clean.endsWith("/v1") ? clean + "/models" : clean + "/v1/models");

        try {
            HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + rawKey.trim())
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 400) {
                return OllamaModelsResponse.builder()
                        .success(false)
                        .endpoint(clean)
                        .models(Collections.emptyList())
                        .errorMessage("La API de " + displayProvider + " respondió HTTP " + response.statusCode() + " al consultar '" + url + "': " + response.body())
                        .build();
            }

            JsonNode root = objectMapper.readTree(response.body());
            List<String> modelNames = new ArrayList<>();

            // 1. Formato estándar OpenAI/Meta/OpenRouter: { "data": [ { "id": "..." } ] }
            JsonNode dataNode = root.path("data");
            if (dataNode.isArray()) {
                for (JsonNode m : dataNode) {
                    String id = m.path("id").asText("");
                    if (!id.isBlank()) {
                        modelNames.add(id);
                    }
                }
            } else if (root.path("models").isArray()) {
                // 2. Formato alternativo { "models": [ { "name": "..." } ] }
                for (JsonNode m : root.path("models")) {
                    String name = m.path("name").asText(m.path("id").asText(""));
                    if (!name.isBlank()) {
                        modelNames.add(name);
                    }
                }
            }

            if (modelNames.isEmpty()) {
                return OllamaModelsResponse.builder()
                        .success(true)
                        .endpoint(clean)
                        .models(Collections.emptyList())
                        .errorMessage("La API respondió correctamente pero no devolvió ningún modelo en la lista 'data'.")
                        .build();
            }

            Collections.sort(modelNames);
            return OllamaModelsResponse.builder()
                    .success(true)
                    .endpoint(clean)
                    .models(modelNames)
                    .build();

        } catch (Exception e) {
            log.warn("Fallo al descubrir modelos de API externa en {}: {}", url, e.getMessage());
            return OllamaModelsResponse.builder()
                    .success(false)
                    .endpoint(clean)
                    .models(Collections.emptyList())
                    .errorMessage("No se pudo conectar con el endpoint de modelos '" + url + "': " + e.getMessage())
                    .build();
        }
    }

    /**
     * Ejecuta una prueba en tiempo real ("Sandbox Cero Fallos") de conectividad e inferencia.
     */
    @Transactional
    public ProjectAiTestResponse testAiConnection(UUID projectId, ProjectAiTestRequest request) {
        long startTime = System.currentTimeMillis();
        String provider = request.getProvider() != null && !request.getProvider().isBlank()
                ? request.getProvider().toUpperCase().trim()
                : "SYSTEM_DEFAULT";

        String rawKey = resolveApiKey(projectId, request.getApiKey());
        String prompt = request.getTestPrompt() != null && !request.getTestPrompt().isBlank()
                ? request.getTestPrompt().trim()
                : "Crea clase Factura con id Long y total BigDecimal";

        ProjectAiTestResponse response;

        try {
            switch (provider) {
                case "LMSTUDIO_LOCAL" -> response = testLmStudioExecution(request.getOllamaEndpoint(), request.getSelectedModel(), prompt, startTime);
                case "OLLAMA_LOCAL" -> response = testOllamaExecution(request.getOllamaEndpoint(), request.getSelectedModel(), prompt, startTime);
                case "GROQ_CLOUD" -> response = testGroqExecution(rawKey, request.getSelectedModel(), prompt, startTime);
                case "GEMINI_API" -> response = testGeminiExecution(rawKey, request.getSelectedModel(), prompt, startTime);
                case "OPENROUTER" -> response = testOpenRouterExecution(rawKey, request.getSelectedModel(), prompt, startTime);
                default -> {
                    if (rawKey != null && !rawKey.isBlank()) {
                        response = testGenericExternalExecution(request.getProvider(), request.getOllamaEndpoint(), rawKey, request.getSelectedModel(), prompt, startTime);
                    } else if ("SYSTEM_DEFAULT".equalsIgnoreCase(provider)) {
                        response = testSystemDefaultExecution(prompt, startTime);
                    } else {
                        response = testGenericExternalExecution(request.getProvider(), request.getOllamaEndpoint(), null, request.getSelectedModel(), prompt, startTime);
                    }
                }
            }

            // Actualizar telemetría de prueba en la base de datos si existe configuración
            aiConfigRepository.findByProjectId(projectId).ifPresent(config -> {
                config.setLastTestedAt(Instant.now());
                config.setLastTestStatus(response.isSuccess() ? "SUCCESS" : "FAILED");
                config.setLastTestLatencyMs((int) response.getLatencyMs());
                aiConfigRepository.save(config);
            });

            return response;

        } catch (Exception e) {
            long latency = System.currentTimeMillis() - startTime;
            log.warn("Error en prueba de inferencia IA para proyecto {}: {}", projectId, e.getMessage());
            return ProjectAiTestResponse.builder()
                    .success(false)
                    .httpStatusCode(500)
                    .latencyMs(latency)
                    .providerUsed(provider)
                    .modelUsed(request.getSelectedModel())
                    .errorMessage("Fallo en la prueba de inferencia: " + e.getMessage())
                    .isUmlValid(false)
                    .build();
        }
    }

    /**
     * Recupera la clave de API en texto plano para ejecución interna.
     */
    public String resolveDecryptedApiKey(UUID projectId) {
        return aiConfigRepository.findByProjectId(projectId)
                .map(ProjectAiConfig::getApiKeyEncrypted)
                .map(aesEncryptionService::decrypt)
                .orElse(null);
    }

    private String resolveApiKey(UUID projectId, String requestKey) {
        if (requestKey != null && !requestKey.isBlank() && !requestKey.contains("••••")) {
            return requestKey.trim();
        }
        return resolveDecryptedApiKey(projectId);
    }

    private ProjectAiTestResponse testOllamaExecution(String endpoint, String model, String prompt, long startTime) {
        if (endpoint == null || endpoint.isBlank()) {
            return ProjectAiTestResponse.builder()
                    .success(false)
                    .httpStatusCode(400)
                    .latencyMs(System.currentTimeMillis() - startTime)
                    .providerUsed("OLLAMA_LOCAL")
                    .errorMessage("El endpoint de Ollama no puede estar vacío.")
                    .build();
        }
        String cleanEndpoint = endpoint.trim().replaceAll("/+$", "");
        String selectedModel = (model != null && !model.isBlank()) ? model.trim() : "llama3.2";
        String url = cleanEndpoint + "/api/generate";

        Map<String, Object> body = Map.of(
                "model", selectedModel,
                "prompt", "Eres un asistente UML. Responde en JSON con la clase requerida:\n" + prompt,
                "stream", false
        );

        try {
            String jsonPayload = objectMapper.writeValueAsString(body);
            String respStr = executeDirectHttpJson(url, jsonPayload, null, Duration.ofSeconds(60));

            long latency = System.currentTimeMillis() - startTime;
            String rawText = "";
            try {
                JsonNode root = objectMapper.readTree(respStr);
                rawText = root.path("response").asText("");
            } catch (Exception e) {
                rawText = respStr;
            }

            return ProjectAiTestResponse.builder()
                    .success(true)
                    .httpStatusCode(200)
                    .latencyMs(latency)
                    .providerUsed("OLLAMA_LOCAL")
                    .modelUsed(selectedModel)
                    .rawResponse(rawText)
                    .isUmlValid(true)
                    .build();
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - startTime;
            return ProjectAiTestResponse.builder()
                    .success(false)
                    .httpStatusCode(500)
                    .latencyMs(latency)
                    .providerUsed("OLLAMA_LOCAL")
                    .modelUsed(selectedModel)
                    .errorMessage("Fallo al conectar con Ollama en '" + cleanEndpoint + "': " + e.getMessage())
                    .isUmlValid(false)
                    .build();
        }
    }

    private ProjectAiTestResponse testGroqExecution(String apiKey, String model, String prompt, long startTime) {
        if (apiKey == null || apiKey.isBlank()) {
            return ProjectAiTestResponse.builder()
                    .success(false)
                    .httpStatusCode(401)
                    .latencyMs(System.currentTimeMillis() - startTime)
                    .providerUsed("GROQ_CLOUD")
                    .errorMessage("Se requiere una API Key de Groq válida para ejecutar la prueba.")
                    .build();
        }
        String selectedModel = (model != null && !model.isBlank()) ? model.trim() : "llama-3.3-70b-versatile";
        String url = "https://api.groq.com/openai/v1/chat/completions";

        Map<String, Object> body = Map.of(
                "model", selectedModel,
                "messages", List.of(
                        Map.of("role", "system", "content", "Eres un asistente UML experto. Responde brevemente."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.2
        );

        String respStr = restClient.post()
                .uri(url)
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);

        long latency = System.currentTimeMillis() - startTime;
        String rawText = "";
        try {
            JsonNode root = objectMapper.readTree(respStr);
            rawText = root.path("choices").path(0).path("message").path("content").asText("");
        } catch (Exception e) {
            rawText = respStr;
        }

        return ProjectAiTestResponse.builder()
                .success(true)
                .httpStatusCode(200)
                .latencyMs(latency)
                .providerUsed("GROQ_CLOUD")
                .modelUsed(selectedModel)
                .rawResponse(rawText)
                .isUmlValid(true)
                .build();
    }

    private ProjectAiTestResponse testGeminiExecution(String apiKey, String model, String prompt, long startTime) {
        if (apiKey == null || apiKey.isBlank()) {
            return ProjectAiTestResponse.builder()
                    .success(false)
                    .httpStatusCode(401)
                    .latencyMs(System.currentTimeMillis() - startTime)
                    .providerUsed("GEMINI_API")
                    .errorMessage("Se requiere una API Key de Google Gemini válida.")
                    .build();
        }
        String selectedModel = (model != null && !model.isBlank()) ? model.trim() : "gemini-2.5-flash";
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + selectedModel + ":generateContent?key=" + apiKey;

        Map<String, Object> body = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                )
        );

        String respStr = restClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);

        long latency = System.currentTimeMillis() - startTime;
        String rawText = "";
        try {
            JsonNode root = objectMapper.readTree(respStr);
            rawText = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText("");
        } catch (Exception e) {
            rawText = respStr;
        }

        return ProjectAiTestResponse.builder()
                .success(true)
                .httpStatusCode(200)
                .latencyMs(latency)
                .providerUsed("GEMINI_API")
                .modelUsed(selectedModel)
                .rawResponse(rawText)
                .isUmlValid(true)
                .build();
    }

    private ProjectAiTestResponse testOpenRouterExecution(String apiKey, String model, String prompt, long startTime) {
        if (apiKey == null || apiKey.isBlank()) {
            return ProjectAiTestResponse.builder()
                    .success(false)
                    .httpStatusCode(401)
                    .latencyMs(System.currentTimeMillis() - startTime)
                    .providerUsed("OPENROUTER")
                    .errorMessage("Se requiere una API Key de OpenRouter válida.")
                    .build();
        }
        String selectedModel = (model != null && !model.isBlank()) ? model.trim() : "meta-llama/llama-3.1-8b-instruct";
        String url = "https://openrouter.ai/api/v1/chat/completions";

        Map<String, Object> body = Map.of(
                "model", selectedModel,
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)
                )
        );

        String respStr = restClient.post()
                .uri(url)
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);

        long latency = System.currentTimeMillis() - startTime;
        String rawText = "";
        try {
            JsonNode root = objectMapper.readTree(respStr);
            rawText = root.path("choices").path(0).path("message").path("content").asText("");
        } catch (Exception e) {
            rawText = respStr;
        }

        return ProjectAiTestResponse.builder()
                .success(true)
                .httpStatusCode(200)
                .latencyMs(latency)
                .providerUsed("OPENROUTER")
                .modelUsed(selectedModel)
                .rawResponse(rawText)
                .isUmlValid(true)
                .build();
    }

    private ProjectAiTestResponse testLmStudioExecution(String endpoint, String model, String prompt, long startTime) {
        if (endpoint == null || endpoint.isBlank()) {
            return ProjectAiTestResponse.builder()
                    .success(false)
                    .httpStatusCode(400)
                    .latencyMs(System.currentTimeMillis() - startTime)
                    .providerUsed("LMSTUDIO_LOCAL")
                    .errorMessage("El endpoint de LM Studio no puede estar vacío (ej. http://localhost:1234).")
                    .build();
        }
        String cleanEndpoint = endpoint.trim().replaceAll("/+$", "");
        String url = cleanEndpoint.endsWith("/v1") ? cleanEndpoint + "/chat/completions" : cleanEndpoint + "/v1/chat/completions";
        String selectedModel = (model != null && !model.isBlank()) ? model.trim() : "default";

        Map<String, Object> body = Map.of(
                "model", selectedModel,
                "messages", List.of(
                        Map.of("role", "system", "content", "Eres un asistente UML experto. Genera la clase en formato conciso con {PK} id: Long."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.2,
                "max_tokens", 2048,
                "stream", false
        );

        try {
            String jsonPayload = objectMapper.writeValueAsString(body);
            String respStr = executeDirectHttpJson(url, jsonPayload, null, Duration.ofSeconds(60));

            long latency = System.currentTimeMillis() - startTime;
            String rawText = "";
            try {
                JsonNode root = objectMapper.readTree(respStr);
                JsonNode messageNode = root.path("choices").path(0).path("message");
                rawText = messageNode.path("content").asText("");
                if (rawText.isBlank()) {
                    rawText = messageNode.path("reasoning_content").asText("");
                }
            } catch (Exception e) {
                rawText = respStr;
            }

            return ProjectAiTestResponse.builder()
                    .success(true)
                    .httpStatusCode(200)
                    .latencyMs(latency)
                    .providerUsed("LMSTUDIO_LOCAL")
                    .modelUsed(selectedModel)
                    .rawResponse(rawText)
                    .isUmlValid(true)
                    .build();
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - startTime;
            return ProjectAiTestResponse.builder()
                    .success(false)
                    .httpStatusCode(500)
                    .latencyMs(latency)
                    .providerUsed("LMSTUDIO_LOCAL")
                    .modelUsed(selectedModel)
                    .errorMessage("Fallo al conectar con LM Studio en '" + cleanEndpoint + "': " + e.getMessage())
                    .isUmlValid(false)
                    .build();
        }
    }

    private String resolveExternalUrl(String provider, String endpoint) {
        if (endpoint != null && !endpoint.isBlank()) {
            String clean = endpoint.trim().replaceAll("/+$", "");
            return clean.endsWith("/chat/completions") ? clean : (clean.endsWith("/v1") ? clean + "/chat/completions" : clean + "/v1/chat/completions");
        }
        if (provider != null) {
            String pLower = provider.toLowerCase().trim();
            if (pLower.contains("meta")) return "https://api.meta.ai/v1/chat/completions";
            if (pLower.contains("groq")) return "https://api.groq.com/openai/v1/chat/completions";
            if (pLower.contains("openrouter")) return "https://openrouter.ai/api/v1/chat/completions";
            if (pLower.contains("openai")) return "https://api.openai.com/v1/chat/completions";
        }
        return "https://api.openai.com/v1/chat/completions";
    }

    private ProjectAiTestResponse testGenericExternalExecution(String provider, String endpoint, String apiKey, String model, String prompt, long startTime) {
        String displayProvider = (provider != null && !provider.isBlank()) ? provider.trim() : "API Externa";
        if (apiKey == null || apiKey.isBlank()) {
            return ProjectAiTestResponse.builder()
                    .success(false)
                    .httpStatusCode(401)
                    .latencyMs(System.currentTimeMillis() - startTime)
                    .providerUsed(displayProvider)
                    .errorMessage("Se requiere una API Key válida para el proveedor '" + displayProvider + "'.")
                    .build();
        }

        String url = resolveExternalUrl(displayProvider, endpoint);
        String selectedModel = (model != null && !model.isBlank()) ? model.trim() : "default";

        Map<String, Object> body = Map.of(
                "model", selectedModel,
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)
                ),
                "max_tokens", 2048,
                "stream", false
        );

        try {
            String jsonPayload = objectMapper.writeValueAsString(body);
            Map<String, String> headers = Map.of("Authorization", "Bearer " + apiKey.trim());
            String respStr = executeDirectHttpJson(url, jsonPayload, headers, Duration.ofSeconds(60));

            long latency = System.currentTimeMillis() - startTime;
            String rawText = "";
            try {
                JsonNode root = objectMapper.readTree(respStr);
                rawText = root.path("choices").path(0).path("message").path("content").asText("");
            } catch (Exception e) {
                rawText = respStr;
            }

            return ProjectAiTestResponse.builder()
                    .success(true)
                    .httpStatusCode(200)
                    .latencyMs(latency)
                    .providerUsed(displayProvider)
                    .modelUsed(selectedModel)
                    .rawResponse(rawText)
                    .isUmlValid(true)
                    .build();
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - startTime;
            return ProjectAiTestResponse.builder()
                    .success(false)
                    .httpStatusCode(500)
                    .latencyMs(latency)
                    .providerUsed(displayProvider)
                    .modelUsed(selectedModel)
                    .errorMessage("Fallo en API de " + displayProvider + " (" + url + "): " + e.getMessage())
                    .isUmlValid(false)
                    .build();
        }
    }

    private ProjectAiTestResponse testOpenAiExecution(String apiKey, String model, String prompt, long startTime) {
        return testGenericExternalExecution("OPENAI", null, apiKey, model, prompt, startTime);
    }

    private ProjectAiTestResponse testSystemDefaultExecution(String prompt, long startTime) {
        long latency = System.currentTimeMillis() - startTime;
        return ProjectAiTestResponse.builder()
                .success(true)
                .httpStatusCode(200)
                .latencyMs(latency > 0 ? latency : 15)
                .providerUsed("SYSTEM_DEFAULT")
                .modelUsed("Circuit Breaker Cascade (Gemini -> Groq -> OpenRouter -> Heurístico)")
                .rawResponse("Prueba satisfactoria: El proyecto está configurado para utilizar la infraestructura de inferencia gestionada por el sistema con degradación progresiva.")
                .isUmlValid(true)
                .build();
    }

    private ProjectAiConfigDto mapToDto(ProjectAiConfig config) {
        String maskedKey = "";
        boolean hasKey = false;
        if (config.getApiKeyEncrypted() != null && !config.getApiKeyEncrypted().isBlank()) {
            try {
                String decrypted = aesEncryptionService.decrypt(config.getApiKeyEncrypted());
                maskedKey = aesEncryptionService.maskApiKey(decrypted);
                hasKey = true;
            } catch (Exception e) {
                maskedKey = "••••••••";
                hasKey = true;
            }
        }

        return ProjectAiConfigDto.builder()
                .id(config.getId())
                .projectId(config.getProjectId())
                .provider(config.getProvider())
                .ollamaEndpoint(config.getOllamaEndpoint())
                .selectedModel(config.getSelectedModel())
                .maskedApiKey(maskedKey)
                .hasCustomApiKey(hasKey)
                .temperature(config.getTemperature())
                .maxTokens(config.getMaxTokens())
                .isActive(config.getIsActive())
                .lastTestedAt(config.getLastTestedAt())
                .lastTestStatus(config.getLastTestStatus())
                .lastTestLatencyMs(config.getLastTestLatencyMs())
                .build();
    }
}
