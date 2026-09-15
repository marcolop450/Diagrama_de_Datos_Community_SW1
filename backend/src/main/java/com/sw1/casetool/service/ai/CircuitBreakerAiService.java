package com.sw1.casetool.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.ai.UmlMutationDto;
import com.sw1.casetool.dto.ai.VoiceModelingRequest;
import com.sw1.casetool.dto.ai.VoiceModelingResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.*;

/**
 * Patrón Circuit Breaker con Cadena de Fallback Multi-IA en 4 Niveles:
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
        requestFactory.setConnectTimeout(Duration.ofMillis(3000));
        requestFactory.setReadTimeout(Duration.ofMillis(15000));

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    private String executePost(String url, Object body, Map<String, String> headers) {
        return restClient.post()
                .uri(url)
                .headers(httpHeaders -> {
                    if (headers != null) {
                        headers.forEach(httpHeaders::add);
                    }
                })
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON, MediaType.ALL)
                .body(body)
                .exchange((request, response) -> {
                    byte[] bytes = response.getBody().readAllBytes();
                    String responseStr = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                    if (response.getStatusCode().isError()) {
                        throw new RuntimeException("HTTP " + response.getStatusCode() + ": " + responseStr);
                    }
                    return responseStr;
                });
    }

    public VoiceModelingResponse processVoicePrompt(VoiceModelingRequest request) {
        long startTime = System.currentTimeMillis();
        String prompt = request.getTranscript() != null ? cleanSpeechPrompt(request.getTranscript().trim()) : "";
        List<String> existingClasses = request.getCurrentClasses() != null ? request.getCurrentClasses() : Collections.emptyList();

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
        modelsToTry.add("gemini-flash-latest");
        modelsToTry.add("gemini-2.5-flash-lite");
        modelsToTry.add("gemini-3.6-flash");
        modelsToTry.add("gemini-3.5-flash");

        Map<String, Object> requestBody = new LinkedHashMap<>();
        Map<String, Object> contents = new LinkedHashMap<>();
        Map<String, Object> part = new LinkedHashMap<>();
        part.put("text", systemInstruction + "\n\nComando dictado por el usuario: \"" + prompt + "\"");
        contents.put("parts", Collections.singletonList(part));
        requestBody.put("contents", Collections.singletonList(contents));

        // Generation Config para exigir JSON
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
        modelsToTry.add("openai/gpt-oss-20b");
        modelsToTry.add("qwen/qwen3.8-27b");
        modelsToTry.add("groq/compound-mini");
        modelsToTry.add("llama-3.1-8b-instant");

        Exception lastException = null;
        for (String model : modelsToTry) {
            try {
                Map<String, Object> requestBody = new LinkedHashMap<>();
                requestBody.put("model", model);
                requestBody.put("temperature", 0.1);

                Map<String, Object> respFormat = new LinkedHashMap<>();
                respFormat.put("type", "json_object");
                requestBody.put("response_format", respFormat);

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
        modelsToTry.add("openrouter/free");

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
                    String contentText = parts.get(0).path("text").asText();
                    return extractAndParseJsonContent(contentText, providerName);
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
                String contentText = choices.get(0).path("message").path("content").asText();
                return extractAndParseJsonContent(contentText, providerName);
            }
        } catch (Exception e) {
            log.warn("Error parseando respuesta OpenAI style de {}: {}", providerName, e.getMessage());
        }
        return null;
    }

    private VoiceModelingResponse extractAndParseJsonContent(String contentText, String providerName) {
        try {
            if (contentText == null || contentText.isBlank()) return null;

            // 1. Eliminar etiquetas de razonamiento como <think>...</think> de modelos como Qwen o DeepSeek
            String clean = contentText.replaceAll("(?s)<think>.*?</think>", "").trim();

            // 2. Extraer bloques de código Markdown ```json ... ```
            if (clean.contains("```json")) {
                int start = clean.indexOf("```json") + 7;
                int end = clean.indexOf("```", start);
                if (end > start) {
                    clean = clean.substring(start, end).trim();
                } else {
                    clean = clean.substring(start).trim();
                }
            } else if (clean.contains("```")) {
                int start = clean.indexOf("```") + 3;
                int end = clean.indexOf("```", start);
                if (end > start) {
                    clean = clean.substring(start, end).trim();
                } else {
                    clean = clean.substring(start).trim();
                }
            }

            // 3. Extraer contenido exacto entre el primer '{' y el último '}'
            int firstBrace = clean.indexOf('{');
            int lastBrace = clean.lastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace) {
                clean = clean.substring(firstBrace, lastBrace + 1).trim();
            }

            // 4. Deserialización resiliente con soporte para esquema raíz o mutaciones directas
            JsonNode root = objectMapper.readTree(clean);
            VoiceModelingResponse resp = new VoiceModelingResponse();
            resp.setProviderUsed(providerName);
            resp.setSuccess(true);

            String intent = root.path("intent").asText(null);
            if (intent == null || intent.isBlank()) {
                intent = root.path("action").asText("AI_INTERPRETED");
            }
            resp.setIntent(intent);

            String msg = root.path("message").asText("Modelo interpretado exitosamente por " + providerName);
            resp.setMessage(msg);

            List<UmlMutationDto> mutations = new ArrayList<>();
            JsonNode mutationsNode = root.path("mutations");
            if (mutationsNode.isArray()) {
                for (JsonNode mNode : mutationsNode) {
                    UmlMutationDto dto = objectMapper.treeToValue(mNode, UmlMutationDto.class);
                    if (dto != null) mutations.add(dto);
                }
            } else if (root.has("action") || root.has("classData") || root.has("relationshipData")) {
                UmlMutationDto dto = objectMapper.treeToValue(root, UmlMutationDto.class);
                if (dto != null) mutations.add(dto);
            }

            resp.setMutations(mutations);
            return resp;
        } catch (Exception e) {
            log.warn("No se pudo deserializar JSON estructurado de {}: {}", providerName, e.getMessage());
        }
        return null;
    }

    public static String cleanSpeechPrompt(String raw) {
        if (raw == null) return "";
        return raw
                .replaceAll("(?i)\\bcoma\\b", ",")
                .replaceAll("(?i)\\bpunto y coma\\b", ";")
                .replaceAll("(?i)\\bpunto\\b", ".")
                .replaceAll("(?i)\\bdos puntos\\b", ":")
                .replaceAll("(?i)\\bguion\\b", "-")
                .replaceAll("(?i)\\by de nombre\\b", "nombre")
                .replaceAll("(?i)\\by con nombre\\b", "nombre")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String buildSystemPrompt(List<String> existingClasses) {
        return "Eres un Arquitecto de Software experto en OMG UML 2.5 y diseño de bases de datos relacionales.\n" +
                "Tu objetivo es interpretar comandos en lenguaje natural dictados por voz o texto y transformarlos en operaciones estructuradas de modelado UML.\n\n" +
                "Clases actualmente existentes en el diagrama: " + existingClasses + "\n\n" +
                "DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO CON LA SIGUIENTE ESTRUCTURA:\n" +
                "{\n" +
                "  \"intent\": \"CREATE_CLASS | ADD_ATTRIBUTES | ADD_METHODS | CREATE_RELATIONSHIP | UPDATE_CLASS | DELETE_ELEMENT | BATCH_DOMAIN\",\n" +
                "  \"message\": \"Descripción amigable de lo que se interpretó\",\n" +
                "  \"mutations\": [\n" +
                "    {\n" +
                "      \"action\": \"CREATE_CLASS\",\n" +
                "      \"targetClassName\": \"NombreClase\",\n" +
                "      \"classData\": {\n" +
                "        \"name\": \"Factura\",\n" +
                "        \"isAbstract\": false,\n" +
                "        \"stereotype\": null,\n" +
                "        \"attributes\": [\n" +
                "          { \"name\": \"id\", \"type\": \"Long\", \"visibility\": \"+\", \"isPrimaryKey\": true, \"isNotNull\": true },\n" +
                "          { \"name\": \"total\", \"type\": \"BigDecimal\", \"visibility\": \"-\", \"isNotNull\": true }\n" +
                "        ],\n" +
                "        \"methods\": []\n" +
                "      },\n" +
                "      \"relationshipData\": null,\n" +
                "      \"details\": \"Detalle de la acción\"\n" +
                "    }\n" +
                "  ]\n" +
                "}\n\n" +
                "Reglas Inviolables:\n" +
                "1. Si el usuario pide crear una clase y no especifica clave primaria, incluye siempre { \"name\": \"id\", \"type\": \"Long\", \"isPrimaryKey\": true } (Defensa 1NF).\n" +
                "2. Tipos de datos Java estándar: String, Integer, Long, Double, BigDecimal, Boolean, LocalDate, LocalDateTime, UUID, byte[].\n" +
                "3. Para relaciones (CREATE_RELATIONSHIP), define relationshipData con: sourceClass, targetClass, type (ASSOCIATION, AGGREGATION, COMPOSITION, GENERALIZATION), sourceCardinality, targetCardinality, label (nombre o verbo de la relación centrado sobre la línea, ej: 'uso', 'inscribe', 'pertenece'), sourceRole (opcional, solo si se pide rol explícito en origen, de lo contrario ''), targetRole (opcional, solo si se pide rol explícito en destino, de lo contrario ''). NUNCA coloques el nombre de la relación o verbo en sourceRole o targetRole; colócalo SIEMPRE en label.\n" +
                "4. No agregues texto fuera del JSON.";
    }

    public VoiceModelingResponse processVisionPrompt(byte[] imageBytes, String mimeType, List<String> existingClasses) {
        long startTime = System.currentTimeMillis();
        String safeMime = (mimeType != null && !mimeType.isBlank()) ? mimeType : "image/jpeg";
        List<String> classesContext = existingClasses != null ? existingClasses : Collections.emptyList();

        // 1. NIVEL 1: Google Gemini Multimodal Vision
        if (geminiApiKey != null && !geminiApiKey.trim().isEmpty() && !geminiApiKey.equalsIgnoreCase("none")) {
            try {
                log.info("Invocando Nivel 1: Google Gemini Multimodal para digitalización de pizarra...");
                VoiceModelingResponse geminiResp = callGeminiVision(imageBytes, safeMime, classesContext);
                if (geminiResp != null && geminiResp.isSuccess()) {
                    geminiResp.setLatencyMs(System.currentTimeMillis() - startTime);
                    return geminiResp;
                }
            } catch (Exception e) {
                log.warn("Nivel 1 (Gemini Multimodal) falló: {}. Conmutando a Nivel 2 (OpenRouter Vision)...", e.getMessage());
            }
        }

        // 2. NIVEL 2: OpenRouter Multimodal Vision
        if (openrouterApiKey != null && !openrouterApiKey.trim().isEmpty() && !openrouterApiKey.equalsIgnoreCase("none")) {
            try {
                log.info("Invocando Nivel 2: OpenRouter Multimodal para digitalización de pizarra...");
                VoiceModelingResponse openRouterResp = callOpenRouterVision(imageBytes, safeMime, classesContext);
                if (openRouterResp != null && openRouterResp.isSuccess()) {
                    openRouterResp.setLatencyMs(System.currentTimeMillis() - startTime);
                    return openRouterResp;
                }
            } catch (Exception e) {
                log.warn("Nivel 2 (OpenRouter Vision) falló: {}. Conmutando a Nivel 3 (Defensa Local)...", e.getMessage());
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

        List<String> modelsToTry = new ArrayList<>();
        modelsToTry.add("gemini-3.6-flash");
        modelsToTry.add("gemini-3.5-flash");
        if (geminiModel != null && !geminiModel.isBlank()) {
            modelsToTry.add(geminiModel.trim());
        }
        modelsToTry.add("gemini-flash-latest");
        modelsToTry.add("gemini-2.5-flash-lite");

        String base64Image = Base64.getEncoder().encodeToString(imageBytes);

        Map<String, Object> requestBody = new LinkedHashMap<>();
        Map<String, Object> contents = new LinkedHashMap<>();
        List<Map<String, Object>> parts = new ArrayList<>();

        Map<String, Object> textPart = new LinkedHashMap<>();
        textPart.put("text", systemInstruction + "\n\nDigitaliza esta fotografía de diagrama UML dibujado en pizarra física y genera las mutaciones JSON canónicas.");
        parts.add(textPart);

        Map<String, Object> inlineData = new LinkedHashMap<>();
        inlineData.put("mime_type", mimeType);
        inlineData.put("data", base64Image);

        Map<String, Object> imagePart = new LinkedHashMap<>();
        imagePart.put("inline_data", inlineData);
        parts.add(imagePart);

        contents.put("parts", parts);
        requestBody.put("contents", Collections.singletonList(contents));

        Map<String, Object> genConfig = new LinkedHashMap<>();
        genConfig.put("responseMimeType", "application/json");
        genConfig.put("temperature", 0.1);
        requestBody.put("generationConfig", genConfig);

        Exception lastException = null;
        for (String modelName : modelsToTry) {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + geminiApiKey.trim();
            try {
                String responseBody = executePost(url, requestBody, null);

                if (responseBody != null && !responseBody.isBlank()) {
                    VoiceModelingResponse resp = parseLlmResponseJson(responseBody, "Google Gemini (" + modelName + " Vision)");
                    if (resp != null && resp.isSuccess()) {
                        return resp;
                    }
                }
            } catch (Exception e) {
                lastException = e;
                log.warn("Gemini model {} falló para visión: {}. Probando siguiente modelo...", modelName, e.getMessage());
            }
        }
        throw new IllegalStateException("Modelos Gemini Multimodal fallaron: " + (lastException != null ? lastException.getMessage() : "sin respuesta"));
    }

    private VoiceModelingResponse callOpenRouterVision(byte[] imageBytes, String mimeType, List<String> existingClasses) {
        String systemInstruction = buildVisionSystemPrompt(existingClasses);
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        String dataUrl = "data:" + mimeType + ";base64," + base64Image;

        List<String> models = List.of(
                "inclusionai/ling-3.0-flash-vl:free",
                "google/gemini-2.0-flash-exp:free",
                "meta-llama/llama-3.2-11b-vision-instruct:free"
        );

        Exception lastException = null;
        for (String modelName : models) {
            try {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("model", modelName);

                List<Map<String, Object>> messages = new ArrayList<>();
                messages.add(Map.of("role", "system", "content", systemInstruction));

                List<Map<String, Object>> userContent = new ArrayList<>();
                userContent.add(Map.of("type", "text", "text", "Digitaliza este diagrama UML de pizarra a JSON."));
                userContent.add(Map.of("type", "image_url", "image_url", Map.of("url", dataUrl)));

                messages.add(Map.of("role", "user", "content", userContent));
                payload.put("messages", messages);
                payload.put("temperature", 0.1);

                Map<String, String> headers = Map.of(
                        "Authorization", "Bearer " + openrouterApiKey.trim(),
                        "HTTP-Referer", "https://casetool.local",
                        "X-Title", "CaseTool"
                );
                String responseBody = executePost("https://openrouter.ai/api/v1/chat/completions", payload, headers);

                if (responseBody != null && !responseBody.isBlank()) {
                    VoiceModelingResponse resp = parseOpenAiStyleResponse(responseBody, "OpenRouter (" + modelName + ")");
                    if (resp != null && resp.isSuccess()) {
                        return resp;
                    }
                }
            } catch (Exception e) {
                lastException = e;
                log.warn("OpenRouter vision model {} falló: {}", modelName, e.getMessage());
            }
        }
        throw new IllegalStateException("OpenRouter Vision falló en todos los modelos multimodales: " + (lastException != null ? lastException.getMessage() : "sin respuesta"));
    }

    private VoiceModelingResponse callLocalVisionFallback(List<String> existingClasses) {
        VoiceModelingResponse resp = new VoiceModelingResponse();
        resp.setSuccess(false);
        resp.setProviderUsed("local-fallback-vision");
        resp.setIntent("DIGITIZE_WHITEBOARD");
        resp.setMessage("No se pudo conectar con los proveedores de IA Multimodal (Gemini / OpenRouter). Asegúrate de tener conexión a Internet activa.");
        resp.setMutations(Collections.emptyList());
        return resp;
    }

    private String buildVisionSystemPrompt(List<String> existingClasses) {
        return "Eres un Arquitecto de Software experto en OMG UML 2.5, visión computacional y modelado de datos relacionales.\n" +
                "Tu objetivo es digitalizar una fotografía de una pizarra física, papel o captura con un diagrama de clases UML dibujado a mano alzada.\n\n" +
                "Clases preexistentes en el diagrama: " + existingClasses + "\n\n" +
                "REGLAS OBLIGATORIAS:\n" +
                "1. Reconoce cada rectángulo o caja como una clase UML. Extrae su nombre en PascalCase (ej: Cliente, Factura, DetallePedido, Medico).\n" +
                "2. Si la clase tiene estereotipo como <<interface>> o <<abstract>> o texto en cursiva, indica stereotype o isAbstract: true.\n" +
                "3. Atributos: Extrae nombre en camelCase, visibilidad (+, -, #, ~; si no tiene usa -), tipo canónico Java (Long, String, Integer, Double, BigDecimal, Boolean, LocalDate, LocalDateTime; si no especifica usa String). Si identificas un identificador o clave (id, código, subrayado, o {PK}), pon isPrimaryKey: true.\n" +
                "4. Métodos: Extrae nombre, tipo de retorno y visibilidad (+ por defecto).\n" +
                "5. Relaciones: Identifica líneas y flechas entre clases. Identifica sourceClass y targetClass (nombres exactos de las clases). Identifica el tipo OMG UML: ASSOCIATION, AGGREGATION, COMPOSITION, INHERITANCE, REALIZATION, DEPENDENCY. Identifica multiplicidades/cardinalidades en sourceCardinality y targetCardinality (ej: '1', '0..1', '1..*', '*'). Si la línea tiene un texto/verbo descriptivo en el centro, colócalo en 'label' (ej: 'realiza', 'contiene', 'atiende').\n\n" +
                "DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO CON LA SIGUIENTE ESTRUCTURA EXACTA:\n" +
                "{\n" +
                "  \"intent\": \"DIGITIZE_WHITEBOARD\",\n" +
                "  \"message\": \"Digitalización de pizarra completada exitosamente\",\n" +
                "  \"mutations\": [\n" +
                "    {\n" +
                "      \"action\": \"CREATE_CLASS\",\n" +
                "      \"targetClassName\": \"NombreClase\",\n" +
                "      \"classData\": {\n" +
                "        \"name\": \"NombreClase\",\n" +
                "        \"isAbstract\": false,\n" +
                "        \"stereotype\": null,\n" +
                "        \"attributes\": [\n" +
                "          { \"name\": \"id\", \"type\": \"Long\", \"visibility\": \"-\", \"isPrimaryKey\": true, \"isNotNull\": true },\n" +
                "          { \"name\": \"nombre\", \"type\": \"String\", \"visibility\": \"-\", \"isPrimaryKey\": false, \"isNotNull\": true }\n" +
                "        ],\n" +
                "        \"methods\": []\n" +
                "      }\n" +
                "    },\n" +
                "    {\n" +
                "      \"action\": \"CREATE_RELATIONSHIP\",\n" +
                "      \"relationshipData\": {\n" +
                "        \"sourceClass\": \"ClaseOrigen\",\n" +
                "        \"targetClass\": \"ClaseDestino\",\n" +
                "        \"type\": \"ASSOCIATION\",\n" +
                "        \"sourceCardinality\": \"1\",\n" +
                "        \"targetCardinality\": \"0..*\",\n" +
                "        \"label\": \"asocia\"\n" +
                "      }\n" +
                "    }\n" +
                "  ]\n" +
                "}";
    }
}
