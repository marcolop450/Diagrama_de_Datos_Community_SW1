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
        requestFactory.setReadTimeout(Duration.ofMillis(10000));

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
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
                byte[] responseBytes = restClient.post()
                        .uri(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON, MediaType.ALL)
                        .body(requestBody)
                        .retrieve()
                        .body(byte[].class);
                String rawJson = responseBytes != null ? new String(responseBytes, java.nio.charset.StandardCharsets.UTF_8) : "";

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

                byte[] responseBytes = restClient.post()
                        .uri(url)
                        .header("Authorization", "Bearer " + groqApiKey.trim())
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON, MediaType.ALL)
                        .body(requestBody)
                        .retrieve()
                        .body(byte[].class);
                String rawJson = responseBytes != null ? new String(responseBytes, java.nio.charset.StandardCharsets.UTF_8) : "";

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

                byte[] responseBytes = restClient.post()
                        .uri(url)
                        .header("Authorization", "Bearer " + openrouterApiKey.trim())
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON, MediaType.ALL)
                        .body(requestBody)
                        .retrieve()
                        .body(byte[].class);
                String rawJson = responseBytes != null ? new String(responseBytes, java.nio.charset.StandardCharsets.UTF_8) : "";

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
}
