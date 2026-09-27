package com.sw1.casetool.service.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.ai.UmlMutationDto;
import com.sw1.casetool.dto.ai.VoiceModelingRequest;
import com.sw1.casetool.dto.ai.VoiceModelingResponse;
import com.sw1.casetool.model.AiPromptLog;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.AiPromptLogRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Servicio de negocio para el procesamiento de comandos de modelado por voz (CU16).
 * Valida reglas semánticas UML 2.5, persiste métricas en ai_prompt_logs y registra auditoría inmutable.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VoiceModelingService {

    private final CircuitBreakerAiService circuitBreakerAiService;
    private final AiPromptLogRepository aiPromptLogRepository;
    private final AuditLogService auditLogService;
    private final UserProfileRepository userProfileRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public VoiceModelingResponse processVoiceCommand(
            VoiceModelingRequest request,
            String userEmail,
            String ip,
            String userAgent
    ) {
        if (request == null || request.getTranscript() == null || request.getTranscript().trim().isEmpty()) {
            throw new IllegalArgumentException("La transcripción o comando de voz no puede estar vacío (Regla E1).");
        }

        UserProfile user = (userEmail != null && !userEmail.isBlank())
                ? userProfileRepository.findByEmail(userEmail).orElse(null) : null;
        UUID userId = user != null ? user.getId() : null;

        // Limpiar artefactos del reconocimiento de voz en la transcripción
        String cleanedTranscript = CircuitBreakerAiService.cleanSpeechPrompt(request.getTranscript());
        request.setTranscript(cleanedTranscript);

        // 1. Invocar la cadena de Circuit Breaker (Gemini -> Groq -> OpenRouter -> Local)
        VoiceModelingResponse response = circuitBreakerAiService.processVoicePrompt(request);

        // 2. Post-procesamiento y saneamiento UML defensivo
        postProcessMutations(response);

        // 3. Persistir log de Inteligencia Artificial en ai_prompt_logs
        AiPromptLog promptLog = recordAiPromptLog(request, response, userId);

        // 4. Registrar auditoría inmutable en audit_logs
        recordAuditLog(request, response, userId, ip, userAgent);

        return response;
    }

    public void postProcessMutations(VoiceModelingResponse response) {
        if (response == null || response.getMutations() == null) {
            return;
        }

        List<UmlMutationDto> normalizedMutations = new ArrayList<>();

        for (UmlMutationDto mut : response.getMutations()) {
            if (mut == null) continue;

            if (mut.getClassData() != null) {
                Map<String, Object> cData = mut.getClassData();
                String rawName = (String) cData.get("name");
                if (rawName != null) {
                    cData.put("name", sanitizeClassName(rawName));
                }

                // Asignar IDs y verificar 1NF (Clave Primaria obligatoria)
                Object rawAttrs = cData.get("attributes");
                if (rawAttrs instanceof List<?> attrList) {
                    boolean hasPk = false;
                    for (Object attrObj : attrList) {
                        if (attrObj instanceof Map<?, ?> map) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> attrMap = (Map<String, Object>) map;
                            attrMap.putIfAbsent("id", UUID.randomUUID().toString());
                            attrMap.putIfAbsent("visibility", "-");
                            attrMap.putIfAbsent("type", "String");

                            if (Boolean.TRUE.equals(attrMap.get("isPrimaryKey")) || Boolean.TRUE.equals(attrMap.get("isId"))
                                    || "id".equalsIgnoreCase((String) attrMap.get("name"))) {
                                hasPk = true;
                                attrMap.put("isPrimaryKey", true);
                                attrMap.put("isNotNull", true);
                            }
                        }
                    }

                    if (!hasPk && "CREATE_CLASS".equalsIgnoreCase(mut.getAction())) {
                        Map<String, Object> pk = new LinkedHashMap<>();
                        pk.put("id", UUID.randomUUID().toString());
                        pk.put("name", "id");
                        pk.put("type", "Long");
                        pk.put("visibility", "+");
                        pk.put("isPrimaryKey", true);
                        pk.put("isNotNull", true);
                        @SuppressWarnings("unchecked")
                        List<Object> modifiableList = (List<Object>) attrList;
                        modifiableList.add(0, pk);
                    }
                }

                // Asignar IDs a métodos si no los tienen
                Object rawMethods = cData.get("methods");
                if (rawMethods instanceof List<?> methodList) {
                    for (Object mObj : methodList) {
                        if (mObj instanceof Map<?, ?> map) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> methodMap = (Map<String, Object>) map;
                            methodMap.putIfAbsent("id", UUID.randomUUID().toString());
                            methodMap.putIfAbsent("visibility", "+");
                            methodMap.putIfAbsent("returnType", "void");
                            methodMap.putIfAbsent("parameters", Collections.emptyList());
                        }
                    }
                }
            }

            if (mut.getRelationshipData() != null) {
                Map<String, Object> rData = mut.getRelationshipData();
                String src = (String) rData.get("sourceClass");
                String tgt = (String) rData.get("targetClass");
                if (src != null) rData.put("sourceClass", sanitizeClassName(src));
                if (tgt != null) rData.put("targetClass", sanitizeClassName(tgt));
                rData.putIfAbsent("type", "ASSOCIATION");
                
                String srcCard = (String) rData.get("sourceCardinality");
                String tgtCard = (String) rData.get("targetCardinality");
                rData.put("sourceCardinality", normalizeCardinality(srcCard, "1"));
                rData.put("targetCardinality", normalizeCardinality(tgtCard, "*"));

                // Normalización de etiqueta central (label) vs roles de extremo
                String label = (String) rData.get("label");
                String sRole = (String) rData.get("sourceRole");
                String tRole = (String) rData.get("targetRole");

                // Si ambos roles son iguales y no vacíos (ej: "uso"), es la etiqueta central de la relación
                if ((label == null || label.isBlank()) && sRole != null && !sRole.isBlank() && sRole.equalsIgnoreCase(tRole)) {
                    label = sRole;
                    sRole = "";
                    tRole = "";
                }

                // Si los roles son redundantes con el nombre de la clase (ej: "mascota" o "carrera"), limpiarlos
                if (src != null && sRole != null && sRole.trim().equalsIgnoreCase(src.trim())) {
                    sRole = "";
                }
                if (tgt != null && tRole != null && tRole.trim().equalsIgnoreCase(tgt.trim())) {
                    tRole = "";
                }

                // Si no hay label pero uno de los roles es un término de relación habitual (ej: "uso", "tiene", "inscribe")
                if (label == null || label.isBlank()) {
                    if (sRole != null && isCommonRelationshipVerb(sRole)) {
                        label = sRole;
                        sRole = "";
                    } else if (tRole != null && isCommonRelationshipVerb(tRole)) {
                        label = tRole;
                        tRole = "";
                    }
                }

                rData.put("label", label != null ? label.trim() : "");
                rData.put("sourceRole", sRole != null ? sRole.trim() : "");
                rData.put("targetRole", tRole != null ? tRole.trim() : "");
            }

            // Si el LLM devolvió classData Y relationshipData en un único objeto, descomponer en 2 mutaciones atómicas
            if (mut.getClassData() != null && mut.getRelationshipData() != null) {
                Map<String, Object> rData = new LinkedHashMap<>(mut.getRelationshipData());

                UmlMutationDto classMut = UmlMutationDto.builder()
                        .action("CREATE_CLASS".equalsIgnoreCase(mut.getAction()) ? mut.getAction() : "CREATE_CLASS")
                        .targetClassName(mut.getTargetClassName())
                        .classData(mut.getClassData())
                        .relationshipData(null)
                        .details(mut.getDetails())
                        .build();
                normalizedMutations.add(classMut);

                UmlMutationDto relMut = UmlMutationDto.builder()
                        .action("CREATE_RELATIONSHIP")
                        .targetClassName((String) rData.get("targetClass"))
                        .classData(null)
                        .relationshipData(rData)
                        .details("Relación UML entre '" + rData.get("sourceClass") + "' y '" + rData.get("targetClass") + "'.")
                        .build();
                addRelationshipOrDecomposeM2M(relMut, normalizedMutations);
            } else if ("CREATE_RELATIONSHIP".equalsIgnoreCase(mut.getAction()) && mut.getRelationshipData() != null) {
                addRelationshipOrDecomposeM2M(mut, normalizedMutations);
            } else {
                normalizedMutations.add(mut);
            }
        }

        response.setMutations(normalizedMutations);
    }

    private void addRelationshipOrDecomposeM2M(UmlMutationDto relMut, List<UmlMutationDto> targetList) {
        Map<String, Object> rData = relMut.getRelationshipData();
        if (rData == null) {
            targetList.add(relMut);
            return;
        }

        String src = (String) rData.get("sourceClass");
        String tgt = (String) rData.get("targetClass");
        String srcCard = (String) rData.get("sourceCardinality");
        String tgtCard = (String) rData.get("targetCardinality");

        if (isManyToMany(srcCard, tgtCard)) {
            String label = (String) rData.get("label");
            String intermediateName;
            if (label != null && !label.isBlank() && !isCommonRelationshipVerb(label)) {
                intermediateName = sanitizeClassName(label);
            } else {
                intermediateName = sanitizeClassName(src) + sanitizeClassName(tgt);
            }

            boolean classAlreadyCreated = targetList.stream().anyMatch(m ->
                    "CREATE_CLASS".equalsIgnoreCase(m.getAction()) &&
                    intermediateName.equalsIgnoreCase(m.getTargetClassName())
            );

            if (!classAlreadyCreated) {
                List<Map<String, Object>> intermediateAttrs = new ArrayList<>();

                Map<String, Object> pk = new LinkedHashMap<>();
                pk.put("id", UUID.randomUUID().toString());
                pk.put("name", "id");
                pk.put("type", "Long");
                pk.put("visibility", "+");
                pk.put("isPrimaryKey", true);
                pk.put("isNotNull", true);
                intermediateAttrs.add(pk);

                Map<String, Object> fk1 = new LinkedHashMap<>();
                fk1.put("id", UUID.randomUUID().toString());
                fk1.put("name", (src != null ? src.toLowerCase() : "origen") + "_id");
                fk1.put("type", "Long");
                fk1.put("visibility", "+");
                fk1.put("isForeignKey", true);
                fk1.put("isNotNull", true);
                intermediateAttrs.add(fk1);

                Map<String, Object> fk2 = new LinkedHashMap<>();
                fk2.put("id", UUID.randomUUID().toString());
                fk2.put("name", (tgt != null ? tgt.toLowerCase() : "destino") + "_id");
                fk2.put("type", "Long");
                fk2.put("visibility", "+");
                fk2.put("isForeignKey", true);
                fk2.put("isNotNull", true);
                intermediateAttrs.add(fk2);

                Map<String, Object> cData = new LinkedHashMap<>();
                cData.put("name", intermediateName);
                cData.put("isAbstract", false);
                cData.put("stereotype", "association");
                cData.put("attributes", intermediateAttrs);
                cData.put("methods", Collections.emptyList());

                UmlMutationDto classMut = UmlMutationDto.builder()
                        .action("CREATE_CLASS")
                        .targetClassName(intermediateName)
                        .classData(cData)
                        .details("Clase asociativa intermedia '" + intermediateName + "' generada automáticamente para relación M:N.")
                        .build();
                targetList.add(classMut);
            }

            Map<String, Object> rel1 = new LinkedHashMap<>();
            rel1.put("sourceClass", src);
            rel1.put("targetClass", intermediateName);
            rel1.put("type", "ASSOCIATION");
            rel1.put("sourceCardinality", "1");
            rel1.put("targetCardinality", "*");
            rel1.put("sourceRole", "");
            rel1.put("targetRole", "");

            targetList.add(UmlMutationDto.builder()
                    .action("CREATE_RELATIONSHIP")
                    .relationshipData(rel1)
                    .details("Enlace 1..* desde '" + src + "' hacia tabla intermedia '" + intermediateName + "'.")
                    .build());

            Map<String, Object> rel2 = new LinkedHashMap<>();
            rel2.put("sourceClass", tgt);
            rel2.put("targetClass", intermediateName);
            rel2.put("type", "ASSOCIATION");
            rel2.put("sourceCardinality", "1");
            rel2.put("targetCardinality", "*");
            rel2.put("sourceRole", "");
            rel2.put("targetRole", "");

            targetList.add(UmlMutationDto.builder()
                    .action("CREATE_RELATIONSHIP")
                    .relationshipData(rel2)
                    .details("Enlace 1..* desde '" + tgt + "' hacia tabla intermedia '" + intermediateName + "'.")
                    .build());
        } else {
            targetList.add(relMut);
        }
    }

    private boolean isManyToMany(String srcCard, String tgtCard) {
        if (srcCard == null || tgtCard == null) return false;
        String s = srcCard.trim().toLowerCase();
        String t = tgtCard.trim().toLowerCase();
        boolean sMany = s.equals("*") || s.equals("n") || s.equals("m") || s.contains("..*") || s.contains("..n") || s.contains("..m");
        boolean tMany = t.equals("*") || t.equals("n") || t.equals("m") || t.contains("..*") || t.contains("..n") || t.contains("..m");
        return sMany && tMany;
    }

    private String normalizeCardinality(String card, String defaultCard) {
        if (card == null || card.isBlank()) return defaultCard;
        String c = card.trim();
        if (c.equalsIgnoreCase("n") || c.equalsIgnoreCase("m") || c.equalsIgnoreCase("many") || c.equalsIgnoreCase("muchos")) return "*";
        if (c.equalsIgnoreCase("uno")) return "1";
        return c.replaceAll("(?i)\\.\\.[nm]", "..*");
    }

    private static boolean isCommonRelationshipVerb(String word) {
        if (word == null || word.isBlank()) return false;
        String w = word.trim().toLowerCase();
        return w.equals("uso") || w.equals("usa") || w.equals("tiene") || w.equals("inscribe")
                || w.equals("matricula") || w.equals("pertenece") || w.equals("asocia")
                || w.equals("asociacion") || w.equals("contiene") || w.equals("gestiona")
                || w.equals("administra") || w.equals("posee") || w.equals("trabaja_en")
                || w.equals("depende") || w.equals("realiza");
    }

    private AiPromptLog recordAiPromptLog(VoiceModelingRequest request, VoiceModelingResponse response, UUID userId) {
        Map<String, Object> responseMap = Collections.emptyMap();
        try {
            responseMap = objectMapper.convertValue(response, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("No se pudo convertir VoiceModelingResponse a Map: {}", e.getMessage());
        }

        String modality = (request.getModality() != null && !request.getModality().isBlank())
                ? request.getModality()
                : "VOICE_SPEECH_PLN";

        AiPromptLog promptLog = AiPromptLog.builder()
                .projectId(request.getProjectId())
                .userId(userId)
                .modality(modality)
                .rawPrompt(request.getTranscript())
                .interpretedIntent(response.getIntent())
                .modelVersion(response.getProviderUsed())
                .latencyMs((int) response.getLatencyMs())
                .responseJson(responseMap)
                .appliedSuccessfully(response.isSuccess())
                .build();

        return aiPromptLogRepository.save(promptLog);
    }

    private void recordAuditLog(
            VoiceModelingRequest request,
            VoiceModelingResponse response,
            UUID userId,
            String ip,
            String userAgent
    ) {
        Map<String, Object> details = new HashMap<>();
        details.put("intent", response.getIntent());
        details.put("providerUsed", response.getProviderUsed());
        details.put("latencyMs", response.getLatencyMs());
        details.put("mutationsCount", response.getMutations() != null ? response.getMutations().size() : 0);
        details.put("transcriptLength", request.getTranscript() != null ? request.getTranscript().length() : 0);
        details.put("success", response.isSuccess());

        auditLogService.recordAction(
                userId,
                "VOICE_MODELING_EXECUTED",
                "ai_prompt_logs",
                request.getProjectId(),
                ip != null ? ip : "127.0.0.1",
                userAgent != null ? userAgent : "CASE-Tool-VoiceModeling",
                details
        );
    }

    private String sanitizeClassName(String raw) {
        if (raw == null || raw.isBlank()) return "Clase";
        String clean = raw.replaceAll("[^a-zA-Z0-9_]", "").trim();
        if (clean.isBlank()) return "Clase";
        return Character.toUpperCase(clean.charAt(0)) + (clean.length() > 1 ? clean.substring(1) : "");
    }
}
