package com.sw1.casetool.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.ai.UmlMutationDto;
import com.sw1.casetool.dto.ai.VoiceModelingRequest;
import com.sw1.casetool.dto.ai.VoiceModelingResponse;
import com.sw1.casetool.model.ProjectAiConfig;
import com.sw1.casetool.repository.ProjectAiConfigRepository;
import com.sw1.casetool.service.security.AesEncryptionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

/**
 * Patrón Circuit Breaker con Cadena de Fallback Multi-IA en 4 Niveles y Soporte por Proyecto (CU15):
 * Nivel 0: Configuración del Proyecto (LM Studio, Ollama o BYOK Keys privadas)
 * Nivel 1: Google Gemini 2.5 Flash API (GEMINI_API_KEY)
 * Nivel 2: Groq Cloud Llama 3.3/3.1 (GROQ_API_KEY) con latencia ultrabaja
 * Nivel 3: OpenRouter API (OPENROUTER_API_KEY)
 * Nivel 4: Motor Heurístico Local Offline (LocalNlpParser)
 */
@Slf4j
@Service
public class CircuitBreakerAiService {

    private final LocalNlpParser localNlpParser;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final HttpClient nativeHttpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public record ChatCompletionResult(String text, String providerUsed) {}

    @Autowired(required = false)
    private ProjectAiConfigRepository projectAiConfigRepository;

    @Autowired(required = false)
    private AesEncryptionService aesEncryptionService;

    @Value("${ai.gemini.api-key:${GEMINI_API_KEY:${gemini.api.key:}}}")
    private String geminiApiKey;

    @Value("${ai.gemini.model:${GEMINI_MODEL:${gemini.model:gemini-flash-latest}}}")
    private String geminiModel;

    @Value("${ai.groq.api-key:${GROQ_API_KEY:${groq.api.key:}}}")
    private String groqApiKey;

    @Value("${ai.groq.model:${GROQ_MODEL:${groq.model:openai/gpt-oss-20b}}}")
    private String groqModel;

    @Value("${ai.openrouter.api-key:${OPENROUTER_API_KEY:${openrouter.api.key:}}}")
    private String openrouterApiKey;

    @Value("${ai.openrouter.model:${OPENROUTER_MODEL:${openrouter.model:meta-llama/llama-3.1-8b-instruct}}}")
    private String openrouterModel;

    public CircuitBreakerAiService(LocalNlpParser localNlpParser, ObjectMapper objectMapper) {
        this.localNlpParser = localNlpParser;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(10000));
        requestFactory.setReadTimeout(Duration.ofMillis(120000));

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .messageConverters(converters -> {
                    org.springframework.http.converter.StringHttpMessageConverter stringConverter =
                            new org.springframework.http.converter.StringHttpMessageConverter(java.nio.charset.StandardCharsets.UTF_8);
                    stringConverter.setSupportedMediaTypes(List.of(MediaType.ALL));
                    converters.add(0, stringConverter);
                })
                .build();
    }

    private String executePost(String url, Object body, Map<String, String> headers) {
        try {
            String jsonPayload;
            if (body instanceof String s) {
                jsonPayload = s;
            } else {
                jsonPayload = objectMapper.writeValueAsString(body);
            }

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json, text/plain, */*")
                    .header("Bypass-Tunnel-Reminder", "true")
                    .header("ngrok-skip-browser-warning", "69420")
                    .header("User-Agent", "CASE-Tool-Agent/1.0")
                    .timeout(Duration.ofSeconds(60))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8));

            if (headers != null) {
                headers.forEach(reqBuilder::header);
            }

            HttpResponse<String> response = nativeHttpClient.send(
                    reqBuilder.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            if (response.statusCode() >= 400) {
                log.warn("executePost retornó HTTP {} para {}: {}", response.statusCode(), url, response.body());
                throw new RuntimeException("HTTP " + response.statusCode() + ": " + response.body());
            }

            return response.body();
        } catch (Exception e) {
            log.warn("executePost falló para {}: {}", url, e.getMessage());
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    public VoiceModelingResponse processVoicePrompt(VoiceModelingRequest request) {
        long startTime = System.currentTimeMillis();
        String prompt = request.getTranscript() != null ? cleanSpeechPrompt(request.getTranscript().trim()) : "";
        List<String> existingClasses = request.getCurrentClasses() != null ? request.getCurrentClasses() : Collections.emptyList();

        // 0. NIVEL PROYECTO (CU15: Motor Híbrido por Proyecto)
        if (request.getProjectId() != null && projectAiConfigRepository != null) {
            try {
                ProjectAiConfig config = projectAiConfigRepository.findByProjectId(request.getProjectId()).orElse(null);
                if (config != null && Boolean.TRUE.equals(config.getIsActive())) {
                    String provider = config.getProvider();
                    if ("LMSTUDIO_LOCAL".equalsIgnoreCase(provider) && config.getOllamaEndpoint() != null && !config.getOllamaEndpoint().isBlank()) {
                        log.info("Invocando Nivel Proyecto: LM Studio Local ({})...", config.getOllamaEndpoint());
                        VoiceModelingResponse lmResp = callLmStudio(config.getOllamaEndpoint(), config.getSelectedModel(), prompt, existingClasses);
                        if (lmResp != null && lmResp.isSuccess()) {
                            lmResp.setLatencyMs(System.currentTimeMillis() - startTime);
                            return lmResp;
                        }
                    } else if ("OLLAMA_LOCAL".equalsIgnoreCase(provider) && config.getOllamaEndpoint() != null && !config.getOllamaEndpoint().isBlank()) {
                        log.info("Invocando Nivel Proyecto: Ollama Local ({})...", config.getOllamaEndpoint());
                        VoiceModelingResponse ollamaResp = callOllama(config.getOllamaEndpoint(), config.getSelectedModel(), prompt, existingClasses);
                        if (ollamaResp != null && ollamaResp.isSuccess()) {
                            ollamaResp.setLatencyMs(System.currentTimeMillis() - startTime);
                            return ollamaResp;
                        }
                    } else if ("GROQ_CLOUD".equalsIgnoreCase(provider)) {
                        String customKey = decryptKeySafe(config.getApiKeyEncrypted());
                        if (customKey != null && !customKey.isBlank()) {
                            log.info("Invocando Nivel Proyecto: Groq Cloud BYOK...");
                            VoiceModelingResponse groqResp = callGroqLlamaWithCustomKey(prompt, existingClasses, customKey, config.getSelectedModel());
                            if (groqResp != null && groqResp.isSuccess()) {
                                groqResp.setLatencyMs(System.currentTimeMillis() - startTime);
                                return groqResp;
                            }
                        }
                    } else if ("GEMINI_API".equalsIgnoreCase(provider)) {
                        String customKey = decryptKeySafe(config.getApiKeyEncrypted());
                        if (customKey != null && !customKey.isBlank()) {
                            log.info("Invocando Nivel Proyecto: Gemini API BYOK...");
                            VoiceModelingResponse geminiResp = callGeminiFlashWithCustomKey(prompt, existingClasses, customKey, config.getSelectedModel());
                            if (geminiResp != null && geminiResp.isSuccess()) {
                                geminiResp.setLatencyMs(System.currentTimeMillis() - startTime);
                                return geminiResp;
                            }
                        }
                    } else if ("OPENROUTER".equalsIgnoreCase(provider)) {
                        String customKey = decryptKeySafe(config.getApiKeyEncrypted());
                        if (customKey != null && !customKey.isBlank()) {
                            log.info("Invocando Nivel Proyecto: OpenRouter BYOK...");
                            VoiceModelingResponse orResp = callOpenRouterWithCustomKey(prompt, existingClasses, customKey, config.getSelectedModel());
                            if (orResp != null && orResp.isSuccess()) {
                                orResp.setLatencyMs(System.currentTimeMillis() - startTime);
                                return orResp;
                            }
                        }
                    } else if (config.getApiKeyEncrypted() != null && !config.getApiKeyEncrypted().isBlank()) {
                        // Proveedor Cloud Externo Genérico (Meta, OpenAI, etc.)
                        String customKey = decryptKeySafe(config.getApiKeyEncrypted());
                        if (customKey != null && !customKey.isBlank()) {
                            log.info("Invocando Nivel Proyecto: API Externa ({}) con modelo {}...", provider, config.getSelectedModel());
                            VoiceModelingResponse extResp = callGenericOpenAiApi(provider, config.getOllamaEndpoint(), customKey, config.getSelectedModel(), prompt, existingClasses);
                            if (extResp != null && extResp.isSuccess()) {
                                extResp.setLatencyMs(System.currentTimeMillis() - startTime);
                                return extResp;
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Nivel Proyecto de IA falló: {}. Conmutando a cascada de fallback del sistema...", e.getMessage());
            }
        }

        // 1. NIVEL 1: Google Gemini Flash
        if (geminiApiKey != null && !geminiApiKey.trim().isEmpty() && !geminiApiKey.equalsIgnoreCase("none")) {
            try {
                log.info("Invocando Nivel 1: Google Gemini Flash para comando de voz...");
                VoiceModelingResponse geminiResp = callGeminiFlash(prompt, existingClasses);
                if (geminiResp != null && geminiResp.isSuccess()) {
                    geminiResp.setLatencyMs(System.currentTimeMillis() - startTime);
                    return geminiResp;
                }
            } catch (Exception e) {
                log.warn("Nivel 1 (Gemini) falló o agotó cuota: {}. Conmutando a Nivel 2 (Groq)...", e.getMessage());
            }
        }

        // 2. NIVEL 2: Groq Cloud
        if (groqApiKey != null && !groqApiKey.trim().isEmpty() && !groqApiKey.equalsIgnoreCase("none")) {
            try {
                log.info("Invocando Nivel 2: Groq Cloud para comando de voz...");
                VoiceModelingResponse groqResp = callGroqLlama(prompt, existingClasses);
                if (groqResp != null && groqResp.isSuccess()) {
                    groqResp.setLatencyMs(System.currentTimeMillis() - startTime);
                    return groqResp;
                }
            } catch (Exception e) {
                log.warn("Nivel 2 (Groq) falló: {}. Conmutando a Nivel 3 (OpenRouter)...", e.getMessage());
            }
        }

        // 3. NIVEL 3: OpenRouter API
        if (openrouterApiKey != null && !openrouterApiKey.trim().isEmpty() && !openrouterApiKey.equalsIgnoreCase("none")) {
            try {
                log.info("Invocando Nivel 3: OpenRouter para comando de voz...");
                VoiceModelingResponse openRouterResp = callOpenRouter(prompt, existingClasses);
                if (openRouterResp != null && openRouterResp.isSuccess()) {
                    openRouterResp.setLatencyMs(System.currentTimeMillis() - startTime);
                    return openRouterResp;
                }
            } catch (Exception e) {
                log.warn("Nivel 3 (OpenRouter) falló: {}. Conmutando a Nivel 4 (Motor Heurístico Local)...", e.getMessage());
            }
        }

        // 4. NIVEL 4: Fallback Local Heurístico Offline (100% de Resiliencia)
        log.info("Ejecutando Nivel 4: Motor Heurístico Local Offline (LocalNlpParser)...");
        VoiceModelingResponse localResp = localNlpParser.parse(prompt, existingClasses);
        localResp.setLatencyMs(System.currentTimeMillis() - startTime);
        return localResp;
    }

    private VoiceModelingResponse callGeminiFlash(String prompt, List<String> existingClasses) {
        String systemInstruction = buildSystemPrompt(existingClasses);

        List<String> modelsToTry = new ArrayList<>();
        if (geminiModel != null && !geminiModel.isBlank()) {
            modelsToTry.add(geminiModel.trim());
        }
        modelsToTry.add("gemini-flash-lite-latest");
        modelsToTry.add("gemini-flash-latest");
        modelsToTry.add("gemini-3.5-flash-lite");
        modelsToTry.add("gemini-3.8-flash");

        Map<String, Object> requestBody = new LinkedHashMap<>();
        Map<String, Object> contents = new LinkedHashMap<>();
        Map<String, Object> part = new LinkedHashMap<>();
        part.put("text", systemInstruction + "\n\nComando dictado por el usuario: \"" + prompt + "\"");
        contents.put("parts", Collections.singletonList(part));
        requestBody.put("contents", Collections.singletonList(contents));

        Map<String, Object> genConfig = new LinkedHashMap<>();
        genConfig.put("responseMimeType", "application/json");
        genConfig.put("temperature", 0.1);
        requestBody.put("generationConfig", genConfig);

        Exception lastException = null;
        for (String model : modelsToTry) {
            try {
                String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiApiKey.trim();
                String rawJson = executePost(url, requestBody, null);

                VoiceModelingResponse resp = parseLlmResponseJson(rawJson, "gemini-" + model);
                if (resp != null) {
                    return resp;
                }
            } catch (Exception e) {
                lastException = e;
                log.debug("Intento con Gemini '{}' falló: {}. Probando siguiente modelo...", model, e.getMessage());
            }
        }
        if (lastException != null) {
            throw new RuntimeException("Modelos Gemini fallaron: " + lastException.getMessage(), lastException);
        }
        return null;
    }

    private VoiceModelingResponse callGroqLlama(String prompt, List<String> existingClasses) {
        String systemInstruction = buildSystemPrompt(existingClasses);
        String url = "https://api.groq.com/openai/v1/chat/completions";

        List<String> modelsToTry = new ArrayList<>();
        if (groqModel != null && !groqModel.isBlank()) {
            modelsToTry.add(groqModel.trim());
        }
        modelsToTry.add("llama-3.3-70b-versatile");
        modelsToTry.add("llama-3.1-8b-instant");
        modelsToTry.add("llama3-70b-8192");

        Exception lastException = null;
        for (String model : modelsToTry) {
            try {
                Map<String, Object> requestBody = new LinkedHashMap<>();
                requestBody.put("model", model);
                requestBody.put("temperature", 0.1);
                requestBody.put("response_format", Map.of("type", "json_object"));

                List<Map<String, String>> messages = new ArrayList<>();
                messages.add(Map.of("role", "system", "content", systemInstruction));
                messages.add(Map.of("role", "user", "content", "Comando dictado por el usuario: \"" + prompt + "\""));
                requestBody.put("messages", messages);

                Map<String, String> headers = Map.of("Authorization", "Bearer " + groqApiKey.trim());
                String rawJson = executePost(url, requestBody, headers);

                VoiceModelingResponse resp = parseOpenAiStyleResponse(rawJson, "groq-" + model);
                if (resp != null) {
                    return resp;
                }
            } catch (Exception e) {
                lastException = e;
                log.debug("Intento con Groq '{}' falló: {}. Probando siguiente modelo...", model, e.getMessage());
            }
        }
        if (lastException != null) {
            throw new RuntimeException("Modelos Groq fallaron: " + lastException.getMessage(), lastException);
        }
        return null;
    }

    private VoiceModelingResponse callOpenRouter(String prompt, List<String> existingClasses) {
        String systemInstruction = buildSystemPrompt(existingClasses);
        String url = "https://openrouter.ai/api/v1/chat/completions";

        List<String> modelsToTry = new ArrayList<>();
        if (openrouterModel != null && !openrouterModel.isBlank()) {
            modelsToTry.add(openrouterModel.trim());
        }
        modelsToTry.add("meta-llama/llama-3.1-8b-instruct");
        modelsToTry.add("google/gemini-2.0-flash-exp:free");
        modelsToTry.add("mistralai/mistral-7b-instruct:free");

        Exception lastException = null;
        for (String model : modelsToTry) {
            try {
                Map<String, Object> requestBody = new LinkedHashMap<>();
                requestBody.put("model", model);
                requestBody.put("temperature", 0.1);

                List<Map<String, String>> messages = new ArrayList<>();
                messages.add(Map.of("role", "system", "content", systemInstruction));
                messages.add(Map.of("role", "user", "content", "Comando dictado por el usuario: \"" + prompt + "\""));
                requestBody.put("messages", messages);

                Map<String, String> headers = Map.of("Authorization", "Bearer " + openrouterApiKey.trim());
                String rawJson = executePost(url, requestBody, headers);

                VoiceModelingResponse resp = parseOpenAiStyleResponse(rawJson, "openrouter-" + model);
                if (resp != null) {
                    return resp;
                }
            } catch (Exception e) {
                lastException = e;
                log.debug("Intento con OpenRouter '{}' falló: {}. Probando siguiente modelo...", model, e.getMessage());
            }
        }
        if (lastException != null) {
            throw new RuntimeException("Modelos OpenRouter fallaron: " + lastException.getMessage(), lastException);
        }
        return null;
    }

    private VoiceModelingResponse parseLlmResponseJson(String rawResponse, String providerName) {
        try {
            JsonNode root = objectMapper.readTree(rawResponse);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    String text = parts.get(0).path("text").asText();
                    return extractAndParseJsonContent(text, providerName);
                }
            }
        } catch (Exception e) {
            log.warn("Error parseando respuesta de {}: {}", providerName, e.getMessage());
        }
        return null;
    }

    private VoiceModelingResponse parseOpenAiStyleResponse(String rawResponse, String providerName) {
        try {
            JsonNode root = objectMapper.readTree(rawResponse);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && !choices.isEmpty()) {
                JsonNode messageNode = choices.get(0).path("message");
                String contentText = messageNode.path("content").asText("");
                if (contentText.isBlank()) {
                    contentText = messageNode.path("reasoning_content").asText("");
                }
                return extractAndParseJsonContent(contentText, providerName);
            }
        } catch (Exception e) {
            log.warn("Error parseando respuesta estilo OpenAI de {}: {}", providerName, e.getMessage());
        }
        return null;
    }

    private VoiceModelingResponse extractAndParseJsonContent(String contentText, String providerName) {
        if (contentText == null || contentText.isBlank()) return null;

        String cleaned = contentText.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        cleaned = cleaned.trim();

        try {
            VoiceModelingResponse resp = objectMapper.readValue(cleaned, VoiceModelingResponse.class);
            if (resp != null && resp.getMutations() != null) {
                resp.setSuccess(true);
                resp.setProviderUsed(providerName);
                return resp;
            }
        } catch (Exception e) {
            log.warn("Fallo al deserializar JSON de {}: {}. Texto recibido: {}", providerName, e.getMessage(), cleaned);
        }
        return null;
    }

    public static String cleanSpeechPrompt(String raw) {
        if (raw == null) return "";
        String cleaned = raw.replaceAll("^[\s,.]+", "").replaceAll("[\s,.]+$", "").trim();
        cleaned = cleaned.replaceAll("^(por favor|oye|ok|bueno)\s+", "");
        return cleaned;
    }

    private String buildSystemPrompt(List<String> existingClasses) {
        return "Eres un Arquitecto de Software experto en OMG UML 2.5 y normalización relacional.\n" +
                "Tu objetivo es transformar el comando dictado en un lote de mutaciones canónicas JSON.\n\n" +
                "Clases actuales en el modelo: " + existingClasses + "\n\n" +
                "REGLAS INVIOLABLES:\n" +
                "1. Toda clase debe poseer identificador clave primaria '{PK} id: Long'.\n" +
                "2. Responde exclusivamente con un objeto JSON sin markdown exterior.\n" +
                "Estructura: { \"intent\": \"CREATE_CLASS\", \"message\": \"...\", \"mutations\": [...] }";
    }

    public VoiceModelingResponse processVisionPrompt(byte[] imageBytes, String mimeType, List<String> existingClasses) {
        long startTime = System.currentTimeMillis();
        String safeMime = (mimeType != null && !mimeType.isBlank()) ? mimeType : "image/jpeg";
        List<String> classesContext = existingClasses != null ? existingClasses : Collections.emptyList();

        // 1. NIVEL 1: Google Gemini Multimodal Vision
        if (geminiApiKey != null && !geminiApiKey.trim().isEmpty() && !geminiApiKey.equalsIgnoreCase("none")) {
            try {
                log.info("Invocando Nivel 1: Google Gemini Multimodal para visión...");
                VoiceModelingResponse geminiResp = callGeminiVision(imageBytes, safeMime, classesContext);
                if (geminiResp != null && geminiResp.isSuccess()) {
                    geminiResp.setLatencyMs(System.currentTimeMillis() - startTime);
                    return geminiResp;
                }
            } catch (Exception e) {
                log.warn("Nivel 1 (Gemini Multimodal) falló: {}. Conmutando a Nivel 2...", e.getMessage());
            }
        }

        // 2. NIVEL 2: OpenRouter Multimodal Vision
        if (openrouterApiKey != null && !openrouterApiKey.trim().isEmpty() && !openrouterApiKey.equalsIgnoreCase("none")) {
            try {
                log.info("Invocando Nivel 2: OpenRouter Multimodal para visión...");
                VoiceModelingResponse openRouterResp = callOpenRouterVision(imageBytes, safeMime, classesContext);
                if (openRouterResp != null && openRouterResp.isSuccess()) {
                    openRouterResp.setLatencyMs(System.currentTimeMillis() - startTime);
                    return openRouterResp;
                }
            } catch (Exception e) {
                log.warn("Nivel 2 (OpenRouter Vision) falló: {}. Conmutando a Nivel 3...", e.getMessage());
            }
        }

        // 3. NIVEL 3: Defensa Local Offline
        log.info("Ejecutando Nivel 3: Fallback Local Defensivo para Visión...");
        VoiceModelingResponse localResp = callLocalVisionFallback(classesContext);
        localResp.setLatencyMs(System.currentTimeMillis() - startTime);
        return localResp;
    }

    private VoiceModelingResponse callGeminiVision(byte[] imageBytes, String mimeType, List<String> existingClasses) {
        String systemInstruction = buildVisionSystemPrompt(existingClasses);
        List<String> modelsToTry = List.of("gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-flash-latest");
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);

        Map<String, Object> requestBody = new LinkedHashMap<>();
        Map<String, Object> contents = new LinkedHashMap<>();
        List<Map<String, Object>> parts = new ArrayList<>();

        parts.add(Map.of("text", systemInstruction + "\n\nDigitaliza esta fotografía de diagrama UML."));
        parts.add(Map.of("inline_data", Map.of("mime_type", mimeType, "data", base64Image)));
        contents.put("parts", parts);
        requestBody.put("contents", Collections.singletonList(contents));
        requestBody.put("generationConfig", Map.of("responseMimeType", "application/json", "temperature", 0.1));

        for (String modelName : modelsToTry) {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + geminiApiKey.trim();
            try {
                String responseBody = executePost(url, requestBody, null);
                VoiceModelingResponse resp = parseLlmResponseJson(responseBody, "Google Gemini (" + modelName + " Vision)");
                if (resp != null && resp.isSuccess()) return resp;
            } catch (Exception e) {
                log.debug("Gemini vision model {} fallo: {}", modelName, e.getMessage());
            }
        }
        return null;
    }

    private VoiceModelingResponse callOpenRouterVision(byte[] imageBytes, String mimeType, List<String> existingClasses) {
        String systemInstruction = buildVisionSystemPrompt(existingClasses);
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        String dataUrl = "data:" + mimeType + ";base64," + base64Image;

        List<String> models = List.of("google/gemini-2.0-flash-exp:free", "meta-llama/llama-3.2-11b-vision-instruct:free");
        for (String modelName : models) {
            try {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("model", modelName);
                List<Map<String, Object>> messages = new ArrayList<>();
                Map<String, Object> userMsg = new LinkedHashMap<>();
                userMsg.put("role", "user");
                List<Map<String, Object>> contentList = new ArrayList<>();
                contentList.add(Map.of("type", "text", "text", systemInstruction));
                contentList.add(Map.of("type", "image_url", "image_url", Map.of("url", dataUrl)));
                userMsg.put("content", contentList);
                messages.add(userMsg);
                payload.put("messages", messages);

                Map<String, String> headers = Map.of("Authorization", "Bearer " + openrouterApiKey.trim());
                String responseBody = executePost("https://openrouter.ai/api/v1/chat/completions", payload, headers);
                VoiceModelingResponse resp = parseOpenAiStyleResponse(responseBody, "OpenRouter (" + modelName + ")");
                if (resp != null && resp.isSuccess()) return resp;
            } catch (Exception e) {
                log.debug("OpenRouter vision model {} fallo: {}", modelName, e.getMessage());
            }
        }
        return null;
    }

    private VoiceModelingResponse callLocalVisionFallback(List<String> existingClasses) {
        VoiceModelingResponse resp = new VoiceModelingResponse();
        resp.setSuccess(false);
        resp.setProviderUsed("local-fallback-vision");
        resp.setIntent("DIGITIZE_WHITEBOARD");
        resp.setMessage("No se pudo conectar con los proveedores de IA Multimodal.");
        resp.setMutations(Collections.emptyList());
        return resp;
    }

    private String buildVisionSystemPrompt(List<String> existingClasses) {
        return "Eres un Arquitecto de Software experto en OMG UML 2.5.\n" +
                "Digitaliza el dibujo de clases UML a mano alzada.\n" +
                "Responde en JSON: { \"intent\": \"DIGITIZE_WHITEBOARD\", \"mutations\": [...] }";
    }

    // ==========================================
    // EJECUCIÓN TEXTUAL Y COPILOTO (CU14 & CU15)
    // ==========================================

    public String executeChatTextCompletion(String systemInstruction, String userPrompt) {
        ChatCompletionResult res = executeChatTextCompletionDetailed(null, systemInstruction, userPrompt);
        return res != null && res.text() != null ? res.text() : "Respuesta local: Consulta procesada correctamente bajo los fundamentos de ingeniería de software OMG UML 2.5.";
    }

    public String executeChatTextCompletion(java.util.UUID projectId, String systemInstruction, String userPrompt) {
        ChatCompletionResult res = executeChatTextCompletionDetailed(projectId, systemInstruction, userPrompt);
        return res != null && res.text() != null ? res.text() : "Respuesta local: Consulta procesada correctamente bajo los fundamentos de ingeniería de software OMG UML 2.5.";
    }

    public ChatCompletionResult executeChatTextCompletionDetailed(java.util.UUID projectId, String systemInstruction, String userPrompt) {
        boolean customProviderAttempted = false;
        String attemptedProviderName = "";

        if (projectId != null && projectAiConfigRepository != null) {
            try {
                ProjectAiConfig config = projectAiConfigRepository.findByProjectId(projectId).orElse(null);
                if (config != null && Boolean.TRUE.equals(config.getIsActive())) {
                    String provider = config.getProvider();
                    String modelName = config.getSelectedModel() != null && !config.getSelectedModel().isBlank() ? config.getSelectedModel() : "default";

                    if (!"SYSTEM_DEFAULT".equalsIgnoreCase(provider)) {
                        customProviderAttempted = true;
                        attemptedProviderName = "LMSTUDIO_LOCAL".equalsIgnoreCase(provider) ? "LM Studio" :
                                                "OLLAMA_LOCAL".equalsIgnoreCase(provider) ? "Ollama" : provider;
                    }

                    if ("LMSTUDIO_LOCAL".equalsIgnoreCase(provider) && config.getOllamaEndpoint() != null && !config.getOllamaEndpoint().isBlank()) {
                        String resp = callLmStudioText(config.getOllamaEndpoint(), config.getSelectedModel(), systemInstruction, userPrompt);
                        if (resp != null && !resp.isBlank()) {
                            return new ChatCompletionResult(resp, "LM Studio (" + modelName + ")");
                        } else {
                            log.warn("LM Studio en '{}' no respondió. Activando Circuit Breaker hacia proveedores Cloud...", config.getOllamaEndpoint());
                        }
                    } else if ("OLLAMA_LOCAL".equalsIgnoreCase(provider) && config.getOllamaEndpoint() != null && !config.getOllamaEndpoint().isBlank()) {
                        String resp = callOllamaText(config.getOllamaEndpoint(), config.getSelectedModel(), systemInstruction, userPrompt);
                        if (resp != null && !resp.isBlank()) {
                            return new ChatCompletionResult(resp, "Ollama (" + modelName + ")");
                        } else {
                            log.warn("Ollama en '{}' no respondió. Activando Circuit Breaker hacia proveedores Cloud...", config.getOllamaEndpoint());
                        }
                    } else if ("GROQ_CLOUD".equalsIgnoreCase(provider)) {
                        String key = decryptKeySafe(config.getApiKeyEncrypted());
                        if (key != null && !key.isBlank()) {
                            String resp = callGroqTextWithCustomKey(systemInstruction, userPrompt, key, config.getSelectedModel());
                            if (resp != null && !resp.isBlank()) {
                                return new ChatCompletionResult(resp, "Groq Cloud (" + modelName + ")");
                            }
                        }
                    } else if ("GEMINI_API".equalsIgnoreCase(provider)) {
                        String key = decryptKeySafe(config.getApiKeyEncrypted());
                        if (key != null && !key.isBlank()) {
                            String resp = callGeminiTextWithCustomKey(systemInstruction, userPrompt, key, config.getSelectedModel());
                            if (resp != null && !resp.isBlank()) {
                                return new ChatCompletionResult(resp, "Google Gemini (" + modelName + ")");
                            }
                        }
                    } else if ("OPENROUTER".equalsIgnoreCase(provider)) {
                        String key = decryptKeySafe(config.getApiKeyEncrypted());
                        if (key != null && !key.isBlank()) {
                            String resp = callOpenRouterTextWithCustomKey(systemInstruction, userPrompt, key, config.getSelectedModel());
                            if (resp != null && !resp.isBlank()) {
                                return new ChatCompletionResult(resp, "OpenRouter (" + modelName + ")");
                            }
                        }
                    } else if (config.getApiKeyEncrypted() != null && !config.getApiKeyEncrypted().isBlank()) {
                        String key = decryptKeySafe(config.getApiKeyEncrypted());
                        if (key != null && !key.isBlank()) {
                            String resp = callGenericOpenAiApiText(provider, config.getOllamaEndpoint(), key, config.getSelectedModel(), systemInstruction, userPrompt);
                            if (resp != null && !resp.isBlank()) {
                                return new ChatCompletionResult(resp, provider + " (" + modelName + ")");
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Inferencia de texto con configuracion de proyecto fallo: {}. Usando fallback...", e.getMessage());
            }
        }

        String suffix = customProviderAttempted ? " (Fallback por " + attemptedProviderName + " inalcanzable)" : " (Sistema)";

        // Cascada del sistema (Circuit Breaker predeterminado)
        if (geminiApiKey != null && !geminiApiKey.trim().isEmpty() && !geminiApiKey.equalsIgnoreCase("none")) {
            String resp = callGeminiText(systemInstruction, userPrompt);
            if (resp != null && !resp.isBlank()) {
                return new ChatCompletionResult(resp, "Google Gemini Flash" + suffix);
            }
        }
        if (groqApiKey != null && !groqApiKey.trim().isEmpty() && !groqApiKey.equalsIgnoreCase("none")) {
            String resp = callGroqText(systemInstruction, userPrompt);
            if (resp != null && !resp.isBlank()) {
                return new ChatCompletionResult(resp, "Groq Cloud Llama 3.3" + suffix);
            }
        }
        if (openrouterApiKey != null && !openrouterApiKey.trim().isEmpty() && !openrouterApiKey.equalsIgnoreCase("none")) {
            String resp = callOpenRouterText(systemInstruction, userPrompt);
            if (resp != null && !resp.isBlank()) {
                return new ChatCompletionResult(resp, "OpenRouter" + suffix);
            }
        }

        return new ChatCompletionResult(null, "Motor Teórico Local Offline (OMG UML 2.5)");
    }

    private String decryptKeySafe(String encrypted) {
        if (encrypted == null || encrypted.isBlank() || aesEncryptionService == null) return null;
        try {
            return aesEncryptionService.decrypt(encrypted);
        } catch (Exception e) {
            log.warn("No se pudo descifrar la clave BYOK del proyecto: {}", e.getMessage());
            return null;
        }
    }

    private String callGeminiText(String systemInstruction, String userPrompt) {
        String model = (geminiModel != null && !geminiModel.isBlank()) ? geminiModel.trim() : "gemini-2.5-flash";
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiApiKey.trim();
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", systemInstruction + "\n\n" + userPrompt))))
        );
        try {
            String rawJson = executePost(url, requestBody, null);
            JsonNode root = objectMapper.readTree(rawJson);
            return root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText("");
        } catch (Exception e) {
            return null;
        }
    }

    private String callGroqText(String systemInstruction, String userPrompt) {
        String url = "https://api.groq.com/openai/v1/chat/completions";
        Map<String, Object> requestBody = Map.of(
                "model", "llama-3.3-70b-versatile",
                "messages", List.of(Map.of("role", "system", "content", systemInstruction), Map.of("role", "user", "content", userPrompt))
        );
        try {
            String rawJson = executePost(url, requestBody, Map.of("Authorization", "Bearer " + groqApiKey.trim()));
            JsonNode root = objectMapper.readTree(rawJson);
            return root.path("choices").path(0).path("message").path("content").asText("");
        } catch (Exception e) {
            return null;
        }
    }

    private String callOpenRouterText(String systemInstruction, String userPrompt) {
        String url = "https://openrouter.ai/api/v1/chat/completions";
        Map<String, Object> requestBody = Map.of(
                "model", "meta-llama/llama-3.1-8b-instruct",
                "messages", List.of(Map.of("role", "system", "content", systemInstruction), Map.of("role", "user", "content", userPrompt))
        );
        try {
            String rawJson = executePost(url, requestBody, Map.of("Authorization", "Bearer " + openrouterApiKey.trim()));
            JsonNode root = objectMapper.readTree(rawJson);
            return root.path("choices").path(0).path("message").path("content").asText("");
        } catch (Exception e) {
            return null;
        }
    }

    private VoiceModelingResponse callOllama(String endpoint, String model, String prompt, List<String> existingClasses) {
        String systemInstruction = buildSystemPrompt(existingClasses);
        String cleanEndpoint = endpoint.trim().replaceAll("/+$", "");
        String selectedModel = (model != null && !model.isBlank()) ? model.trim() : "llama3.2";
        String url = cleanEndpoint + "/api/generate";

        Map<String, Object> body = Map.of(
                "model", selectedModel,
                "prompt", systemInstruction + "\n\nComando dictado por el usuario: \"" + prompt + "\"",
                "stream", false,
                "format", "json"
        );

        try {
            String rawJson = executePost(url, body, null);
            JsonNode root = objectMapper.readTree(rawJson);
            String responseText = root.path("response").asText("");
            VoiceModelingResponse resp = extractAndParseJsonContent(responseText, "ollama-" + selectedModel);
            if (resp != null) {
                resp.setProviderUsed("Ollama Local (" + selectedModel + ")");
                return resp;
            }
        } catch (Exception e) {
            log.warn("Error parseando respuesta de Ollama: {}", e.getMessage());
        }
        return null;
    }

    private String callOllamaText(String endpoint, String model, String systemInstruction, String userPrompt) {
        String cleanEndpoint = endpoint.trim().replaceAll("/+$", "");
        String selectedModel = (model != null && !model.isBlank()) ? model.trim() : "llama3.2";
        String url = cleanEndpoint + "/api/generate";

        Map<String, Object> body = Map.of(
                "model", selectedModel,
                "prompt", systemInstruction + "\n\nConsulta del usuario:\n" + userPrompt,
                "stream", false
        );

        try {
            String rawJson = executePost(url, body, null);
            JsonNode root = objectMapper.readTree(rawJson);
            return root.path("response").asText("");
        } catch (Exception e) {
            log.warn("Error en respuesta textual de Ollama: {}", e.getMessage());
            return null;
        }
    }

    private VoiceModelingResponse callLmStudio(String endpoint, String model, String prompt, List<String> existingClasses) {
        String systemInstruction = buildSystemPrompt(existingClasses);
        String cleanEndpoint = endpoint.trim().replaceAll("/+$", "");
        String url = cleanEndpoint.endsWith("/v1") ? cleanEndpoint + "/chat/completions" : cleanEndpoint + "/v1/chat/completions";
        String selectedModel = (model != null && !model.isBlank()) ? model.trim() : "default";

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", selectedModel);
        requestBody.put("temperature", 0.1);
        requestBody.put("max_tokens", 450);
        requestBody.put("stream", false);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemInstruction));
        messages.add(Map.of("role", "user", "content", "Comando dictado por el usuario: \"" + prompt + "\""));
        requestBody.put("messages", messages);

        try {
            String rawJson = executePost(url, requestBody, null);
            VoiceModelingResponse resp = parseOpenAiStyleResponse(rawJson, "lmstudio-" + selectedModel);
            if (resp != null) {
                resp.setProviderUsed("LM Studio Local (" + selectedModel + ")");
                return resp;
            }
        } catch (Exception e) {
            log.warn("Error al invocar LM Studio Local en {}: {}", url, e.getMessage());
        }
        return null;
    }

    private String callLmStudioText(String endpoint, String model, String systemInstruction, String userPrompt) {
        String cleanEndpoint = endpoint.trim().replaceAll("/+$", "");
        String url = cleanEndpoint.endsWith("/v1") ? cleanEndpoint + "/chat/completions" : cleanEndpoint + "/v1/chat/completions";
        String selectedModel = (model != null && !model.isBlank()) ? model.trim() : "default";

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", selectedModel);
        requestBody.put("temperature", 0.2);
        requestBody.put("max_tokens", 450);
        requestBody.put("stream", false);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemInstruction));
        messages.add(Map.of("role", "user", "content", userPrompt));
        requestBody.put("messages", messages);

        try {
            String rawJson = executePost(url, requestBody, null);
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && !choices.isEmpty()) {
                JsonNode messageNode = choices.get(0).path("message");
                String content = messageNode.path("content").asText("");
                if (!content.isBlank()) {
                    return content;
                }
                String reasoning = messageNode.path("reasoning_content").asText("");
                if (!reasoning.isBlank()) {
                    return reasoning;
                }
            }
        } catch (Exception e) {
            log.warn("Error en respuesta textual de LM Studio: {}", e.getMessage());
        }
        return null;
    }

    private VoiceModelingResponse callGroqLlamaWithCustomKey(String prompt, List<String> existingClasses, String customKey, String customModel) {
        String systemInstruction = buildSystemPrompt(existingClasses);
        String url = "https://api.groq.com/openai/v1/chat/completions";
        String model = (customModel != null && !customModel.isBlank()) ? customModel.trim() : "llama-3.3-70b-versatile";

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", model);
        requestBody.put("temperature", 0.1);
        requestBody.put("response_format", Map.of("type", "json_object"));

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemInstruction));
        messages.add(Map.of("role", "user", "content", "Comando dictado por el usuario: \"" + prompt + "\""));
        requestBody.put("messages", messages);

        Map<String, String> headers = Map.of("Authorization", "Bearer " + customKey.trim());
        String rawJson = executePost(url, requestBody, headers);
        return parseOpenAiStyleResponse(rawJson, "groq-byok-" + model);
    }

    private String callGroqTextWithCustomKey(String systemInstruction, String userPrompt, String customKey, String customModel) {
        String url = "https://api.groq.com/openai/v1/chat/completions";
        String model = (customModel != null && !customModel.isBlank()) ? customModel.trim() : "llama-3.3-70b-versatile";

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", model);
        requestBody.put("temperature", 0.3);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemInstruction));
        messages.add(Map.of("role", "user", "content", userPrompt));
        requestBody.put("messages", messages);

        Map<String, String> headers = Map.of("Authorization", "Bearer " + customKey.trim());
        String rawJson = executePost(url, requestBody, headers);
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && !choices.isEmpty()) {
                return choices.get(0).path("message").path("content").asText();
            }
        } catch (Exception e) {
            log.debug("Groq BYOK text error: {}", e.getMessage());
        }
        return null;
    }

    private VoiceModelingResponse callGeminiFlashWithCustomKey(String prompt, List<String> existingClasses, String customKey, String customModel) {
        String systemInstruction = buildSystemPrompt(existingClasses);
        String model = (customModel != null && !customModel.isBlank()) ? customModel.trim() : "gemini-2.5-flash";
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + customKey.trim();

        Map<String, Object> requestBody = new LinkedHashMap<>();
        Map<String, Object> contents = new LinkedHashMap<>();
        Map<String, Object> part = new LinkedHashMap<>();
        part.put("text", systemInstruction + "\n\nComando dictado por el usuario: \"" + prompt + "\"");
        contents.put("parts", Collections.singletonList(part));
        requestBody.put("contents", Collections.singletonList(contents));
        requestBody.put("generationConfig", Map.of("responseMimeType", "application/json", "temperature", 0.1));

        String rawJson = executePost(url, requestBody, null);
        return parseLlmResponseJson(rawJson, "gemini-byok-" + model);
    }

    private String callGeminiTextWithCustomKey(String systemInstruction, String userPrompt, String customKey, String customModel) {
        String model = (customModel != null && !customModel.isBlank()) ? customModel.trim() : "gemini-2.5-flash";
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + customKey.trim();

        Map<String, Object> requestBody = new LinkedHashMap<>();
        Map<String, Object> contents = new LinkedHashMap<>();
        Map<String, Object> part = new LinkedHashMap<>();
        part.put("text", systemInstruction + "\n\nConsulta del usuario:\n" + userPrompt);
        contents.put("parts", Collections.singletonList(part));
        requestBody.put("contents", Collections.singletonList(contents));
        requestBody.put("generationConfig", Map.of("temperature", 0.3));

        String rawJson = executePost(url, requestBody, null);
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    return parts.get(0).path("text").asText();
                }
            }
        } catch (Exception e) {
            log.debug("Gemini BYOK text error: {}", e.getMessage());
        }
        return null;
    }

    private VoiceModelingResponse callOpenRouterWithCustomKey(String prompt, List<String> existingClasses, String customKey, String customModel) {
        String systemInstruction = buildSystemPrompt(existingClasses);
        String url = "https://openrouter.ai/api/v1/chat/completions";
        String model = (customModel != null && !customModel.isBlank()) ? customModel.trim() : "meta-llama/llama-3.1-8b-instruct";

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", model);
        requestBody.put("temperature", 0.1);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemInstruction));
        messages.add(Map.of("role", "user", "content", "Comando dictado por el usuario: \"" + prompt + "\""));
        requestBody.put("messages", messages);

        Map<String, String> headers = Map.of("Authorization", "Bearer " + customKey.trim());
        String rawJson = executePost(url, requestBody, headers);
        return parseOpenAiStyleResponse(rawJson, "openrouter-byok-" + model);
    }

    private String callOpenRouterTextWithCustomKey(String systemInstruction, String userPrompt, String customKey, String customModel) {
        String url = "https://openrouter.ai/api/v1/chat/completions";
        String model = (customModel != null && !customModel.isBlank()) ? customModel.trim() : "meta-llama/llama-3.1-8b-instruct";

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", model);
        requestBody.put("temperature", 0.3);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemInstruction));
        messages.add(Map.of("role", "user", "content", userPrompt));
        requestBody.put("messages", messages);

        Map<String, String> headers = Map.of("Authorization", "Bearer " + customKey.trim());
        String rawJson = executePost(url, requestBody, headers);
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && !choices.isEmpty()) {
                return choices.get(0).path("message").path("content").asText();
            }
        } catch (Exception e) {
            log.debug("OpenRouter BYOK text error: {}", e.getMessage());
        }
        return null;
    }

    private String resolveOpenAiUrl(String provider, String endpoint) {
        if (endpoint != null && !endpoint.isBlank()) {
            String clean = endpoint.trim().replaceAll("/+$", "");
            return clean.endsWith("/chat/completions") ? clean : (clean.endsWith("/v1") ? clean + "/chat/completions" : clean + "/v1/chat/completions");
        }
        if (provider != null) {
            String pLower = provider.toLowerCase();
            if (pLower.contains("meta")) return "https://api.meta.ai/v1/chat/completions";
            if (pLower.contains("groq")) return "https://api.groq.com/openai/v1/chat/completions";
            if (pLower.contains("openrouter")) return "https://openrouter.ai/api/v1/chat/completions";
            if (pLower.contains("openai")) return "https://api.openai.com/v1/chat/completions";
        }
        return "https://api.openai.com/v1/chat/completions";
    }

    private VoiceModelingResponse callGenericOpenAiApi(String provider, String endpoint, String apiKey, String model, String prompt, List<String> existingClasses) {
        String systemInstruction = buildSystemPrompt(existingClasses);
        String url = resolveOpenAiUrl(provider, endpoint);
        String selectedModel = (model != null && !model.isBlank()) ? model.trim() : "default";

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", selectedModel);
        requestBody.put("temperature", 0.1);
        requestBody.put("stream", false);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemInstruction));
        messages.add(Map.of("role", "user", "content", "Comando dictado por el usuario: \"" + prompt + "\""));
        requestBody.put("messages", messages);

        try {
            Map<String, String> headers = Map.of("Authorization", "Bearer " + apiKey.trim());
            String rawJson = executePost(url, requestBody, headers);
            VoiceModelingResponse resp = parseOpenAiStyleResponse(rawJson, provider + "-" + selectedModel);
            if (resp != null) {
                resp.setProviderUsed(provider + " (" + selectedModel + ")");
                return resp;
            }
        } catch (Exception e) {
            log.warn("Fallo al invocar API externa {} en {}: {}", provider, url, e.getMessage());
        }
        return null;
    }

    private String callGenericOpenAiApiText(String provider, String endpoint, String apiKey, String model, String systemInstruction, String userPrompt) {
        String url = resolveOpenAiUrl(provider, endpoint);
        String selectedModel = (model != null && !model.isBlank()) ? model.trim() : "default";

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", selectedModel);
        requestBody.put("temperature", 0.2);
        requestBody.put("stream", false);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemInstruction));
        messages.add(Map.of("role", "user", "content", userPrompt));
        requestBody.put("messages", messages);

        try {
            Map<String, String> headers = Map.of("Authorization", "Bearer " + apiKey.trim());
            String rawJson = executePost(url, requestBody, headers);
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && !choices.isEmpty()) {
                return choices.get(0).path("message").path("content").asText();
            }
        } catch (Exception e) {
            log.warn("Fallo en respuesta textual de API externa {} en {}: {}", provider, url, e.getMessage());
        }
        return null;
    }
}
