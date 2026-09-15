package com.sw1.casetool.service.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.ai.UmlMutationDto;
import com.sw1.casetool.dto.ai.VoiceModelingResponse;
import com.sw1.casetool.model.AiPromptLog;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.AiPromptLogRepository;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.AuditLogService;
import com.sw1.casetool.service.importxmi.LayoutEngineUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

/**
 * Servicio de negocio para la Digitalizacion de Fotos de Pizarra (CU17: IA Vision Multimodal).
 * Procesa imagenes mediante Circuit Breaker multimodal, certifica 1NF relacional,
 * calcula auto-layout jerarquico no colisionante y persiste auditoria inmutable.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WhiteboardVisionService {

    private static final long MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp"
    );

    private final CircuitBreakerAiService circuitBreakerAiService;
    private final VoiceModelingService voiceModelingService;
    private final AiPromptLogRepository aiPromptLogRepository;
    private final AuditLogService auditLogService;
    private final UserProfileRepository userProfileRepository;
    private final DiagramProjectRepository diagramProjectRepository;
    private final ClassNodeRepository classNodeRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public VoiceModelingResponse digitizeWhiteboardImage(
            MultipartFile file,
            UUID projectId,
            boolean mergeMode,
            String userEmail,
            String ip,
            String userAgent
    ) {
        validateImageFile(file);

        if (projectId != null) {
            diagramProjectRepository.findById(projectId)
                    .orElseThrow(() -> new IllegalArgumentException("Proyecto no encontrado con ID: " + projectId));
        }

        UserProfile user = (userEmail != null && !userEmail.isBlank())
                ? userProfileRepository.findByEmail(userEmail).orElse(null) : null;
        UUID userId = user != null ? user.getId() : null;

        List<String> existingClasses = Collections.emptyList();
        if (mergeMode && projectId != null) {
            existingClasses = classNodeRepository.findByProjectId(projectId).stream()
                    .map(ClassNode::getName)
                    .filter(Objects::nonNull)
                    .toList();
        }

        byte[] imageBytes;
        try {
            imageBytes = file.getBytes();
        } catch (Exception e) {
            throw new IllegalArgumentException("Error al leer los bytes de la fotografia: " + e.getMessage());
        }

        String mimeType = file.getContentType();
        if (mimeType == null || mimeType.isBlank()) {
            mimeType = "image/jpeg";
        }

        // 1. Invocar Circuit Breaker Multimodal (Gemini 3.6/3.5 -> OpenRouter -> Local)
        VoiceModelingResponse response = circuitBreakerAiService.processVisionPrompt(imageBytes, mimeType, existingClasses);

        // 2. Normalizar mutaciones (1NF Defense, visibilidades, etc.) usando el pipeline canonico
        voiceModelingService.postProcessMutations(response);

        // 3. Aplicar Auto-Layout Jerarquico no colisionante (Topological Layering)
        applyHierarchicalLayout(response);

        // 4. Persistir telemetria inmutable en ai_prompt_logs
        recordAiPromptLog(file, projectId, response, userId);

        // 5. Registrar auditoria inmutable en audit_logs
        recordAuditLog(projectId, response, userId, ip, userAgent);

        return response;
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("El archivo de imagen no puede estar vacio (Regla E1).");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("El tamano de la imagen no puede exceder 15MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Formato no compatible (" + contentType + "). Formatos admitidos: PNG, JPG, JPEG, WEBP.");
        }
    }

    private void applyHierarchicalLayout(VoiceModelingResponse response) {
        if (response == null || response.getMutations() == null || response.getMutations().isEmpty()) {
            return;
        }

        List<String> classNames = new ArrayList<>();
        List<LayoutEngineUtil.EdgeDefinition> edges = new ArrayList<>();

        for (UmlMutationDto mut : response.getMutations()) {
            if ("CREATE_CLASS".equalsIgnoreCase(mut.getAction()) && mut.getClassData() != null) {
                String name = (String) mut.getClassData().get("name");
                if (name != null && !classNames.contains(name)) {
                    classNames.add(name);
                }
            }
        }

        for (UmlMutationDto mut : response.getMutations()) {
            if ("CREATE_RELATIONSHIP".equalsIgnoreCase(mut.getAction()) && mut.getRelationshipData() != null) {
                String src = (String) mut.getRelationshipData().get("sourceClass");
                String tgt = (String) mut.getRelationshipData().get("targetClass");
                if (src != null && tgt != null) {
                    edges.add(new LayoutEngineUtil.EdgeDefinition(src, tgt));
                }
            }
        }

        if (classNames.isEmpty()) {
            return;
        }

        Map<String, LayoutEngineUtil.NodePosition> positions = LayoutEngineUtil.computeLayout(classNames, edges, null);

        for (UmlMutationDto mut : response.getMutations()) {
            if ("CREATE_CLASS".equalsIgnoreCase(mut.getAction()) && mut.getClassData() != null) {
                String name = (String) mut.getClassData().get("name");
                if (positions.containsKey(name)) {
                    LayoutEngineUtil.NodePosition pos = positions.get(name);
                    Map<String, Object> cData = mut.getClassData();
                    cData.put("position", Map.of("x", pos.x, "y", pos.y));
                    cData.put("x", pos.x);
                    cData.put("y", pos.y);
                }
            }
        }
    }

    private void recordAiPromptLog(
            MultipartFile file,
            UUID projectId,
            VoiceModelingResponse response,
            UUID userId
    ) {
        try {
            String rawMetadata = String.format("Whiteboard Photo: %s (%d bytes, %s)",
                    file.getOriginalFilename(), file.getSize(), file.getContentType());
            Map<String, Object> responseMap = objectMapper.convertValue(response, new TypeReference<Map<String, Object>>() {});

            AiPromptLog logEntry = AiPromptLog.builder()
                    .projectId(projectId)
                    .userId(userId)
                    .rawPrompt(rawMetadata)
                    .modality("VISION_PHOTO_OCR")
                    .interpretedIntent("DIGITIZE_WHITEBOARD")
                    .modelVersion(response.getProviderUsed())
                    .responseJson(responseMap)
                    .tokensUsed(null)
                    .latencyMs((int) response.getLatencyMs())
                    .appliedSuccessfully(response.isSuccess())
                    .build();

            aiPromptLogRepository.save(logEntry);
        } catch (Exception e) {
            log.error("No se pudo registrar log en ai_prompt_logs para digitalizacion de pizarra: {}", e.getMessage());
        }
    }

    private void recordAuditLog(
            UUID projectId,
            VoiceModelingResponse response,
            UUID userId,
            String ip,
            String userAgent
    ) {
        try {
            long classCount = (response.getMutations() != null)
                    ? response.getMutations().stream().filter(m -> "CREATE_CLASS".equalsIgnoreCase(m.getAction())).count() : 0;
            long relCount = (response.getMutations() != null)
                    ? response.getMutations().stream().filter(m -> "CREATE_RELATIONSHIP".equalsIgnoreCase(m.getAction())).count() : 0;

            Map<String, Object> details = new HashMap<>();
            details.put("intent", response.getIntent());
            details.put("providerUsed", response.getProviderUsed());
            details.put("latencyMs", response.getLatencyMs());
            details.put("classesCount", classCount);
            details.put("relationshipsCount", relCount);
            details.put("success", response.isSuccess());

            auditLogService.recordAction(
                    userId,
                    "AI_VISION_WHITEBOARD_DIGITIZE",
                    "ai_prompt_logs",
                    projectId,
                    ip != null ? ip : "127.0.0.1",
                    userAgent != null ? userAgent : "CASE-Tool-VisionModeling",
                    details
            );
        } catch (Exception e) {
            log.error("No se pudo registrar evento de auditoria para digitalizacion de pizarra: {}", e.getMessage());
        }
    }
}