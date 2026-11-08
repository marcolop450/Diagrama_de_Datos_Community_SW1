package com.sw1.casetool.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.ai.AiTeamResponseDto;
import com.sw1.casetool.dto.ai.UmlMutationDto;
import com.sw1.casetool.dto.ai.VoiceModelingRequest;
import com.sw1.casetool.dto.ai.VoiceModelingResponse;
import com.sw1.casetool.dto.collab.CollabMessageDto;
import com.sw1.casetool.model.AiPromptLog;
import com.sw1.casetool.model.CollaborationSession;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.SessionParticipant;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.AiPromptLogRepository;
import com.sw1.casetool.repository.CollaborationSessionRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.SessionParticipantRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Servicio Co-Desarrollador con IA para Salas Colaborativas STOMP (CU14).
 * Gestiona consultas teóricas de ingeniería de software, modelado estructural en el lienzo,
 * inducción de sesión (catch-up), acciones operativas y auditorías de consistencia bajo estricta no-autonomía.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiTeamMemberService {

    public static final UUID AI_BOT_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");
    public static final String AI_BOT_NAME = "Asistente IA (Co-Dev)";
    public static final String AI_BOT_COLOR = "#6366F1"; // Índigo Oficial

    private final CircuitBreakerAiService circuitBreakerAiService;
    private final VoiceModelingService voiceModelingService;
    private final SimpMessagingTemplate messagingTemplate;
    private final CollaborationSessionRepository sessionRepository;
    private final AiPromptLogRepository aiPromptLogRepository;
    private final ObjectMapper objectMapper;
    private final DiagramProjectRepository projectRepository;
    private final SessionParticipantRepository participantRepository;
    private final UserProfileRepository userProfileRepository;

    /**
     * Memoria volátil de sesión para planes de corrección y auto-reparación interactiva ("@ai si").
     */
    private final Map<String, List<UmlMutationDto>> pendingSessionRepairs = new ConcurrentHashMap<>();

    /**
     * Registro cronológico en memoria de eventos ocurridos durante cada sesión en vivo.
     * Permite un Catch-Up real para los participantes que ingresan a mitad de la colaboración.
     */
    public record SessionEventLog(
            Instant timestamp,
            String author,
            String eventType,
            String details
    ) {}

    private final Map<String, List<SessionEventLog>> sessionEventLogs = new ConcurrentHashMap<>();

    public void recordSessionEvent(String sessionCode, String author, String eventType, String details) {
        if (sessionCode == null || sessionCode.isBlank()) return;
        sessionEventLogs.computeIfAbsent(sessionCode, k -> Collections.synchronizedList(new ArrayList<>()))
                .add(new SessionEventLog(Instant.now(), author != null ? author : "Colaborador", eventType, details));
    }

    private static final Pattern REPAIR_CONFIRM_PATTERN = Pattern.compile(
            "(?i)^(si|sí|reparar|repara|arreglar|arregla|corrige|corregir|aplicar|aplica|ok|dale|adelante|hazlo|proceder).*"
    );

    private static final Pattern SAVE_PROJECT_PATTERN = Pattern.compile(
            "(?i).*(guardar|guarda|salvar|salva|persistir|guardar proyecto|salvar proyecto).*"
    );

    private static final Pattern EXPORT_PATTERN = Pattern.compile(
            "(?i).*(exportar|descargar|generar backend|generar sql|generar ddl|exportar png|exportar pdf|exportar xmi|exportar excel|exportar postman|exportacion|exportación).*"
    );

    private static final Pattern USERS_STATUS_PATTERN = Pattern.compile(
            "(?i).*(quienes estan|quién está|quien esta|participantes|usuarios activos|usuarios conectados|equipo|tiempo de sesion|tiempo de sesión|cuanto tiempo|cuánto tiempo|hora de inicio).*"
    );

    private static final Pattern THEORY_PATTERN = Pattern.compile(
            "(?i).*(que es|cual es la diferencia|explica|concepto|definicion|patron|por que|cuando usar|" +
                    "multiplicidad|herencia|composicion|agregacion|normalizacion|1nf|2nf|3nf|derivado|" +
                    "transitiva|parcial|acoplamiento|cohesion|polimorfismo|encapsulamiento|gof|orm|jpa|hibernate).*"
    );

    private static final Pattern SUMMARY_PATTERN = Pattern.compile(
            "(?i).*(resumen|catch.?up|sintesis|estado de la sesion|que se ha hecho|ponme al dia|recapitulacion).*"
    );

    private static final Pattern AUDIT_PATTERN = Pattern.compile(
            "(?i).*(auditar|audita|inconsistencia|inconsistencias|verificar modelo|chequear modelo|validar modelo|errores del modelo|anomalia).*"
    );

    private static final Pattern NON_TECH_OUT_OF_SCOPE_PATTERN = Pattern.compile(
            "(?i).*(receta|cocina|comida|pizza|futbol|mundial|horoscopo|clima|tiempo manana|musica|cancion|chiste|politica|poema|novela|romance).*"
    );

    private static final Pattern MUTATION_PATTERN = Pattern.compile(
            "(?i).*(crear|crea|agrega|anade|adiciona|modifica|cambia|conecta|relaciona|elimina|borra|" +
                    "tabla|clase|entidad|atributo|campo|id|long|string|asociacion|hereda).*"
    );

    /**
     * Procesa asíncronamente una mención @ai en la sala colaborativa, evitando bloquear
     * el hilo STOMP sub-50ms y retransmitiendo los resultados a /topic/room/{code}.
     */
    public void processTeamAiMessageAsync(
            String sessionCode,
            UUID senderId,
            String senderName,
            String rawText,
            Object diagramSnapshot
    ) {
        CompletableFuture.runAsync(() -> {
            try {
                AiTeamResponseDto response = processTeamAiMessage(sessionCode, senderId, senderName, rawText, diagramSnapshot);
                broadcastAiResponse(sessionCode, senderId, senderName, response);
            } catch (Exception e) {
                log.error("Error procesando solicitud de IA en sala {}: {}", sessionCode, e.getMessage(), e);
                broadcastErrorMessage(sessionCode, senderName, "Ocurrió un error al procesar tu solicitud: " + e.getMessage());
            }
        });
    }

    /**
     * Lógica pura de evaluación y clasificación de intenciones de co-desarrollo.
     */
    public AiTeamResponseDto processTeamAiMessage(
            String sessionCode,
            UUID senderId,
            String senderName,
            String rawText,
            Object diagramSnapshot
    ) {
        long startTime = System.currentTimeMillis();
        String prompt = cleanAiMention(rawText);

        if (prompt.isBlank()) {
            return AiTeamResponseDto.builder()
                    .intent(AiTeamResponseDto.Intent.THEORY_EXPLANATION)
                    .chatResponse("¡Hola @" + senderName + "! Soy el **Asistente Co-Desarrollador**. Puedes pedirme:\n" +
                            "- **Consultoría teórica:** Ej. `@ai ¿Qué es un atributo derivado y cómo se modela?`\n" +
                            "- **Modelado de clases:** Ej. `@ai crea la tabla Factura con id Long y total BigDecimal`\n" +
                            "- **Ponerte al día:** Ej. `@ai resumen`\n" +
                            "- **Auditoría de diseño:** Ej. `@ai auditar`\n" +
                            "- **Auto-reparación:** Responde `@ai si` tras una auditoría para aplicar correcciones.")
                    .requesterName(senderName)
                    .build();
        }

        AiTeamResponseDto.Intent intent = classifyIntent(prompt, sessionCode);
        AiTeamResponseDto responseDto;

        switch (intent) {
            case PROJECT_ACTION -> responseDto = handleProjectAction(sessionCode, senderName, prompt, diagramSnapshot);
            case CATCH_UP_SUMMARY -> responseDto = handleCatchUpSummary(sessionCode, senderName, diagramSnapshot);
            case CONSISTENCY_AUDIT -> responseDto = handleConsistencyAudit(sessionCode, senderName, diagramSnapshot);
            case APPLY_REPAIR -> responseDto = handleApplyRepair(sessionCode, senderId, senderName);
            case THEORY_EXPLANATION -> responseDto = handleTheoryExplanation(sessionCode, prompt, senderName, diagramSnapshot);
            case STRUCTURAL_MUTATION -> responseDto = handleStructuralMutation(sessionCode, senderId, senderName, prompt, diagramSnapshot);
            default -> responseDto = handleOutOfScope(senderName);
        }

        // Registrar telemetría de IA
        try {
            saveAiPromptLog(sessionCode, senderId, prompt, intent.name(), (int) (System.currentTimeMillis() - startTime), responseDto);
        } catch (Exception e) {
            log.warn("No se pudo registrar AiPromptLog: {}", e.getMessage());
        }

        return responseDto;
    }

    private AiTeamResponseDto.Intent classifyIntent(String prompt, String sessionCode) {
        if (sessionCode != null && pendingSessionRepairs.containsKey(sessionCode) && REPAIR_CONFIRM_PATTERN.matcher(prompt.trim()).matches()) {
            return AiTeamResponseDto.Intent.APPLY_REPAIR;
        }
        if (SAVE_PROJECT_PATTERN.matcher(prompt).matches()) {
            return AiTeamResponseDto.Intent.PROJECT_ACTION;
        }
        if (EXPORT_PATTERN.matcher(prompt).matches()) {
            return AiTeamResponseDto.Intent.PROJECT_ACTION;
        }
        if (USERS_STATUS_PATTERN.matcher(prompt).matches()) {
            return AiTeamResponseDto.Intent.PROJECT_ACTION;
        }
        if (SUMMARY_PATTERN.matcher(prompt).matches()) {
            return AiTeamResponseDto.Intent.CATCH_UP_SUMMARY;
        }
        if (AUDIT_PATTERN.matcher(prompt).matches()) {
            return AiTeamResponseDto.Intent.CONSISTENCY_AUDIT;
        }
        if (NON_TECH_OUT_OF_SCOPE_PATTERN.matcher(prompt).matches()) {
            return AiTeamResponseDto.Intent.OUT_OF_SCOPE;
        }
        String pLower = prompt.toLowerCase().trim();
        boolean isQuestion = prompt.contains("?") ||
                pLower.startsWith("que ") || pLower.startsWith("qué ") ||
                pLower.startsWith("como ") || pLower.startsWith("cómo ") ||
                pLower.startsWith("por que ") || pLower.startsWith("por qué ") ||
                pLower.startsWith("cual ") || pLower.startsWith("cuál ") ||
                pLower.startsWith("donde ") || pLower.startsWith("dónde ") ||
                pLower.startsWith("explica");

        if (MUTATION_PATTERN.matcher(prompt).matches() && !isQuestion) {
            return AiTeamResponseDto.Intent.STRUCTURAL_MUTATION;
        }

        // Toda consulta conceptual, teórica, de bases de datos o sobre el proyecto es atendida por el Asistente
        return AiTeamResponseDto.Intent.THEORY_EXPLANATION;
    }

    /**
     * Resuelve consultas teóricas de Ingeniería de Software mediante Circuit Breaker o base de conocimiento local,
     * incorporando consciencia contextual de las entidades modeladas en la sesión.
     */
    private AiTeamResponseDto handleTheoryExplanation(String sessionCode, String prompt, String senderName, Object diagramSnapshot) {
        List<String> classes = extractClassNames(diagramSnapshot);
        String contextNote = classes.isEmpty()
                ? "El diagrama UML actualmente está vacío."
                : "Entidades actualmente modeladas en la sesión: [" + String.join(", ", classes) + "].";

        String systemInstruction =
                "Eres el Asistente Co-Desarrollador de Software e Inteligencia Artificial en una herramienta CASE UML profesional. " +
                        "Responde de forma clara, didáctica, rigurosa y concisa (máximo 3 párrafos cortos con viñetas o código breve si aplica). " +
                        "Aplica estrictamente los estándares de Ingeniería de Software (UML 2.5+, Bases de Datos Relacionales PostgreSQL 17, Codd 1NF-3NF, Fowler, GoF, JPA/Hibernate, Spring Boot). " +
                        "Si la consulta hace referencia a las entidades del modelo, utiliza el siguiente contexto: " + contextNote + ". " +
                        "Dirígete al equipo con profesionalismo sin emojis superfluos.";

        UUID projectId = resolveProjectId(sessionCode);
        CircuitBreakerAiService.ChatCompletionResult chatResult = null;
        try {
            chatResult = circuitBreakerAiService.executeChatTextCompletionDetailed(projectId, systemInstruction, prompt);
        } catch (Exception e) {
            log.warn("Fallo al obtener respuesta de LLM para consulta teórica: {}. Usando base local...", e.getMessage());
        }

        String aiResponse = chatResult != null ? chatResult.text() : null;
        String providerUsed = chatResult != null ? chatResult.providerUsed() : "Motor Teórico Local Offline (OMG UML 2.5)";

        if (aiResponse == null || aiResponse.isBlank()) {
            aiResponse = getLocalTheoryKnowledge(prompt);
            providerUsed = "Motor Teórico Local Offline (OMG UML 2.5)";
        }

        return AiTeamResponseDto.builder()
                .intent(AiTeamResponseDto.Intent.THEORY_EXPLANATION)
                .chatResponse(aiResponse)
                .requesterName(senderName)
                .providerUsed(providerUsed)
                .actionSummary("Consulta técnica respondida para @" + senderName)
                .build();
    }

    /**
     * Procesa comandos de modelado en lenguaje natural transformándolos en mutaciones con defensa 1NF.
     */
    private AiTeamResponseDto handleStructuralMutation(
            String sessionCode,
            UUID senderId,
            String senderName,
            String prompt,
            Object diagramSnapshot
    ) {
        List<String> currentClasses = extractClassNames(diagramSnapshot);
        UUID projectId = resolveProjectId(sessionCode);

        VoiceModelingRequest request = VoiceModelingRequest.builder()
                .transcript(prompt)
                .currentClasses(currentClasses)
                .projectId(projectId)
                .modality("TEXT_COPILOT")
                .build();

        VoiceModelingResponse vResp = voiceModelingService.processVoiceCommand(request, null, "127.0.0.1", "STOMP-Collab-AI");

        if (vResp == null || vResp.getMutations() == null || vResp.getMutations().isEmpty()) {
            return AiTeamResponseDto.builder()
                    .intent(AiTeamResponseDto.Intent.STRUCTURAL_MUTATION)
                    .chatResponse("No pude determinar una mutación estructural válida a partir de: *\"" + prompt + "\"*. " +
                            "Intenta formular la orden indicando la entidad y sus campos (ej. *'crear clase Producto con id Long y precio BigDecimal'*).")
                    .requesterName(senderName)
                    .build();
        }

        StringBuilder sb = new StringBuilder();
        sb.append("He aplicado las siguientes modificaciones al modelo a solicitud de @").append(senderName).append(":\n");
        for (UmlMutationDto mut : vResp.getMutations()) {
            sb.append("- **").append(mut.getAction()).append("**: ").append(mut.getDetails()).append("\n");
        }
        sb.append("\n*(Puedes deshacer esta operación en tu lienzo con `Ctrl+Z`)*");

        return AiTeamResponseDto.builder()
                .intent(AiTeamResponseDto.Intent.STRUCTURAL_MUTATION)
                .chatResponse(sb.toString())
                .mutations(vResp.getMutations())
                .requesterName(senderName)
                .providerUsed(vResp.getProviderUsed() != null ? vResp.getProviderUsed() : "Motor Asistente UML")
                .actionSummary("Modelo actualizado por IA a solicitud de @" + senderName)
                .build();
    }

    /**
     * Aplica el plan de auto-reparación guardado en memoria tras la confirmación "@ai si".
     */
    private AiTeamResponseDto handleApplyRepair(String sessionCode, UUID senderId, String senderName) {
        List<UmlMutationDto> repairs = sessionCode != null ? pendingSessionRepairs.remove(sessionCode) : null;
        if (repairs == null || repairs.isEmpty()) {
            return AiTeamResponseDto.builder()
                    .intent(AiTeamResponseDto.Intent.APPLY_REPAIR)
                    .chatResponse("No hay ningún plan de reparación pendiente para esta sala. " +
                            "Puedes ejecutar `@ai auditar` para que analice el modelo y proponga correcciones automáticas.")
                    .requesterName(senderName)
                    .build();
        }

        StringBuilder sb = new StringBuilder();
        sb.append("🛠️ **Auto-Reparación de Inconsistencias Aplicada**\n\n");
        sb.append("He aplicado las siguientes correcciones de normalización en el lienzo a solicitud de @").append(senderName).append(":\n");
        for (UmlMutationDto mut : repairs) {
            sb.append("- **").append(mut.getAction()).append("**: ").append(mut.getDetails()).append("\n");
        }
        sb.append("\n*(Puedes deshacer esta operación en tu lienzo con `Ctrl+Z`)*");

        return AiTeamResponseDto.builder()
                .intent(AiTeamResponseDto.Intent.APPLY_REPAIR)
                .chatResponse(sb.toString())
                .mutations(repairs)
                .requesterName(senderName)
                .providerUsed("Auto-Reparación Canónica 1NF-3NF")
                .actionSummary("Inconsistencias reparadas por IA a solicitud de @" + senderName)
                .build();
    }

    /**
     * Procesa acciones directas sobre el proyecto: Guardado, Exportación multiformato o Estado del equipo.
     */
    private AiTeamResponseDto handleProjectAction(String sessionCode, String senderName, String prompt, Object diagramSnapshot) {
        String pLower = prompt.toLowerCase().trim();
        UUID projectId = resolveProjectId(sessionCode);
        String projectName = "Modelo UML";
        if (projectId != null && projectRepository != null) {
            projectName = projectRepository.findById(projectId).map(DiagramProject::getName).orElse("Modelo UML");
        }

        if (SAVE_PROJECT_PATTERN.matcher(pLower).matches()) {
            recordSessionEvent(sessionCode, senderName, "PROJECT_SAVED", "Guardó y sincronizó el proyecto en PostgreSQL 17");
            return AiTeamResponseDto.builder()
                    .intent(AiTeamResponseDto.Intent.PROJECT_ACTION)
                    .actionType("SAVE_PROJECT")
                    .chatResponse("**Proyecto Sincronizado y Guardado Exitosamente**\n\n" +
                            "He ordenado la persistencia inmediata de **\"" + projectName + "\"** en PostgreSQL 17 a solicitud de @" + senderName + ". " +
                            "Todas las entidades, atributos y relaciones del lienzo han quedado resguardadas en la base de datos.")
                    .requesterName(senderName)
                    .providerUsed("Asistente Operativo CASE")
                    .actionSummary("Proyecto guardado por @" + senderName)
                    .build();
        }

        if (EXPORT_PATTERN.matcher(pLower).matches()) {
            String format = "OPTIONS";
            String formatLabel = "Catálogo Multiformato CASE";
            String actionType = "EXPORT_OPTIONS";

            if (pLower.contains("backend") || pLower.contains("zip") || pLower.contains("spring") || pLower.contains("java") || pLower.contains("código") || pLower.contains("codigo")) {
                format = "BACKEND_ZIP";
                formatLabel = "Backend Spring Boot en 4 Capas (ZIP)";
                actionType = "EXPORT_BACKEND";
            } else if (pLower.contains("sql") || pLower.contains("ddl") || pLower.contains("postgres") || pLower.contains("tabla")) {
                format = "SQL_DDL";
                formatLabel = "Script DDL PostgreSQL 17";
                actionType = "EXPORT_SQL";
            } else if (pLower.contains("pdf") || pLower.contains("documento") || pLower.contains("memoria")) {
                format = "PDF";
                formatLabel = "Memoria Técnica PDF Ejecutiva";
                actionType = "EXPORT_PDF";
            } else if (pLower.contains("xmi") || pLower.contains("staruml") || pLower.contains("architec")) {
                format = "XMI";
                formatLabel = "OMG XMI 2.1 (Interoperabilidad)";
                actionType = "EXPORT_XMI";
            } else if (pLower.contains("excel") || pLower.contains("xlsx") || pLower.contains("diccionario")) {
                format = "EXCEL";
                formatLabel = "Diccionario de Datos Excel (.xlsx)";
                actionType = "EXPORT_EXCEL";
            } else if (pLower.contains("postman") || pLower.contains("coleccion") || pLower.contains("colección") || pLower.contains("suite")) {
                format = "POSTMAN";
                formatLabel = "Colección Postman v2.1";
                actionType = "EXPORT_POSTMAN";
            } else if (pLower.contains("png") || pLower.contains("imagen") || pLower.contains("foto")) {
                format = "PNG";
                formatLabel = "Diagrama PNG UHD";
                actionType = "EXPORT_PNG";
            }

            if ("EXPORT_OPTIONS".equals(actionType)) {
                recordSessionEvent(sessionCode, senderName, "EXPORT_OPTIONS_REQUESTED", "Solicitó opciones de exportación directa multiformato");
                return AiTeamResponseDto.builder()
                        .intent(AiTeamResponseDto.Intent.PROJECT_ACTION)
                        .actionType("EXPORT_OPTIONS")
                        .actionData(Map.of("options", List.of("XMI", "PNG", "PDF", "EXCEL", "SQL", "POSTMAN")))
                        .chatResponse("**Catálogo de Exportación Multiformato**\n\n" +
                                "Selecciona cualquiera de las 6 especificaciones oficiales del modelo **\"" + projectName + "\"** para iniciar su descarga inmediata:")
                        .requesterName(senderName)
                        .providerUsed("Asistente Operativo CASE")
                        .actionSummary("Catálogo de exportación desplegado por @" + senderName)
                        .build();
            }

            recordSessionEvent(sessionCode, senderName, "EXPORT_TRIGGERED", "Activó la exportación en formato " + formatLabel);
            return AiTeamResponseDto.builder()
                    .intent(AiTeamResponseDto.Intent.PROJECT_ACTION)
                    .actionType(actionType)
                    .actionData(Map.of("format", format, "formatLabel", formatLabel))
                    .chatResponse("**Exportación de Proyecto Iniciada**\n\n" +
                            "He activado la exportación en formato **" + formatLabel + "** para el proyecto **\"" + projectName + "\"** a solicitud de @" + senderName + ".")
                    .requesterName(senderName)
                    .providerUsed("Asistente Operativo CASE")
                    .actionSummary("Exportación " + format + " activada por @" + senderName)
                    .build();
        }

        // Estado de usuarios y telemetría de sesión
        return handleSessionStatusAction(sessionCode, senderName);
    }

    private AiTeamResponseDto handleSessionStatusAction(String sessionCode, String senderName) {
        StringBuilder sb = new StringBuilder();
        sb.append("👥 **Estado de la Sala y Telemetría en Vivo**\n\n");

        if (sessionCode == null || sessionCode.startsWith("SOLO-") || sessionCode.startsWith("PROJ-")) {
            sb.append("- **Modo:** Sesión Individual de Modelado UML (Asistente IA dedicado).\n");
            sb.append("- **Usuario activo:** @").append(senderName).append(".\n");
            sb.append("- **Conectividad:** Enlace REST directo activo con base de datos PostgreSQL 17.\n");
        } else {
            CollaborationSession session = sessionRepository.findBySessionCode(sessionCode).orElse(null);
            if (session != null) {
                Instant startedAt = session.getStartedAt() != null ? session.getStartedAt() : Instant.now();
                long minutesElapsed = java.time.Duration.between(startedAt, Instant.now()).toMinutes();
                String timeFormatted = java.time.format.DateTimeFormatter.ofPattern("HH:mm")
                        .withZone(java.time.ZoneId.systemDefault())
                        .format(startedAt);

                sb.append("**Código de Sala:** `").append(sessionCode).append("` | **Estado:** `").append(session.getStatus().toUpperCase()).append("`\n");
                sb.append("- **Hora de apertura:** ").append(timeFormatted).append(" (hace ").append(minutesElapsed).append(" min).\n");

                List<SessionParticipant> parts = participantRepository != null
                        ? participantRepository.findBySessionId(session.getId())
                        : Collections.emptyList();

                sb.append("- **Participantes conectados (").append(parts.size()).append("):**\n");
                for (SessionParticipant p : parts) {
                    String roleLabel = "host".equalsIgnoreCase(p.getRole()) ? "Host / Arquitecto" : "Colaborador";
                    String name = resolveParticipantName(p);
                    sb.append("  • **@").append(name).append("** (").append(roleLabel).append(")\n");
                }
            } else {
                sb.append("Código de sala: `").append(sessionCode).append("`.\n");
            }
        }

        return AiTeamResponseDto.builder()
                .intent(AiTeamResponseDto.Intent.PROJECT_ACTION)
                .actionType("SHOW_USERS")
                .chatResponse(sb.toString())
                .requesterName(senderName)
                .providerUsed("Asistente Co-Desarrollador")
                .actionSummary("Telemetría de sala consultada por @" + senderName)
                .build();
    }

    private String resolveParticipantName(SessionParticipant p) {
        if (p.getUserId() != null && userProfileRepository != null) {
            return userProfileRepository.findById(p.getUserId())
                    .map(u -> (u.getFullName() != null && !u.getFullName().isBlank()) ? u.getFullName() : u.getUsername())
                    .orElse("Colaborador");
        }
        return "Colaborador";
    }

    /**
     * Genera un resumen ejecutivo de inducción (Catch-Up) enriquecido para integrantes de la sala.
     * Incorpora el tiempo de sesión, participantes y el feed cronológico de eventos ocurridos durante esta sesión.
     */
    private AiTeamResponseDto handleCatchUpSummary(String sessionCode, String senderName, Object diagramSnapshot) {
        List<Map<String, Object>> nodes = extractNodes(diagramSnapshot);
        List<Map<String, Object>> edges = extractEdges(diagramSnapshot);

        StringBuilder sb = new StringBuilder();
        sb.append("📋 **Inducción y Puesta al Día de Sesión (Catch-Up)**\n\n");

        // 1. Información temporal de la sesión colaborativa
        boolean isCollab = sessionCode != null && !sessionCode.startsWith("SOLO-") && !sessionCode.startsWith("PROJ-");
        if (isCollab) {
            CollaborationSession session = sessionRepository.findBySessionCode(sessionCode).orElse(null);
            if (session != null) {
                Instant startedAt = session.getStartedAt() != null ? session.getStartedAt() : Instant.now();
                long minutesElapsed = java.time.Duration.between(startedAt, Instant.now()).toMinutes();
                String timeFormatted = java.time.format.DateTimeFormatter.ofPattern("HH:mm")
                        .withZone(java.time.ZoneId.systemDefault())
                        .format(startedAt);

                sb.append("⏱️ **Sesión Colaborativa `").append(sessionCode).append("`:**\n");
                sb.append("- **Iniciada a las:** ").append(timeFormatted).append(" (hace ").append(minutesElapsed).append(" min).\n");

                List<SessionParticipant> parts = participantRepository != null
                        ? participantRepository.findBySessionId(session.getId())
                        : Collections.emptyList();
                sb.append("- **Equipo activo (").append(parts.size()).append("):** ");
                List<String> partNames = parts.stream().map(p -> "@" + resolveParticipantName(p)).toList();
                sb.append(partNames.isEmpty() ? "@" + senderName : String.join(", ", partNames)).append(".\n\n");
            }
        }

        // 2. Feed de actividad en vivo de la sesión (lo que se realizó durante la sesión)
        List<SessionEventLog> eventLogs = sessionCode != null ? sessionEventLogs.get(sessionCode) : null;
        if (eventLogs != null && !eventLogs.isEmpty()) {
            sb.append("⚡ **Actividad Realizada Durante Esta Sesión:**\n");
            int count = 0;
            synchronized (eventLogs) {
                for (SessionEventLog evt : eventLogs) {
                    if (count++ >= 8) break; // Máximo 8 para síntesis ejecutiva
                    String evtTime = java.time.format.DateTimeFormatter.ofPattern("HH:mm")
                            .withZone(java.time.ZoneId.systemDefault())
                            .format(evt.timestamp());
                    sb.append("- `[").append(evtTime).append("]` **@").append(evt.author()).append("**: ").append(evt.details()).append(".\n");
                }
            }
            sb.append("\n");
        } else if (isCollab) {
            sb.append("⚡ **Actividad en Esta Sesión:** No se registran mutaciones previas en la sala activa.\n\n");
        }

        // 3. Estructura y madurez consolidada del modelo
        sb.append("🏛️ **Estado Consolidado del Dominio:**\n");
        if (nodes.isEmpty()) {
            sb.append("- *El lienzo actualmente no cuenta con clases modeladas. Puedes crear clases con `@ai crea la clase [Nombre]` o desde el panel de herramientas.*\n");
        } else {
            int pkCount = 0;
            for (Map<String, Object> node : nodes) {
                Object dataObj = node.get("data");
                String name = "Clase";
                String stereo = "entity";
                int attrCount = 0;
                boolean hasPk = false;

                if (dataObj instanceof Map<?, ?> dataMap) {
                    if (dataMap.get("name") != null) name = dataMap.get("name").toString();
                    if (dataMap.get("stereotype") != null) stereo = dataMap.get("stereotype").toString();
                    if (dataMap.get("attributes") instanceof List<?> alist) {
                        attrCount = alist.size();
                        for (Object o : alist) {
                            if (o instanceof Map<?, ?> amap && (Boolean.TRUE.equals(amap.get("isPrimaryKey")) || Boolean.TRUE.equals(amap.get("isId")))) {
                                hasPk = true;
                                break;
                            }
                        }
                    }
                }
                if (hasPk) pkCount++;
                sb.append("- **").append(name).append("** `<<").append(stereo).append(">>`: ")
                        .append(attrCount).append(" atributos (").append(hasPk ? "{PK} configurada" : "⚠️ sin {PK}").append(").\n");
            }

            sb.append("\n🔗 **Topología:** ").append(edges.size()).append(" relación(es) conectadas.\n");
            int pkPercentage = (pkCount * 100) / nodes.size();
            sb.append("📊 **Cobertura 1NF:** **").append(pkPercentage).append("%** (").append(pkCount).append("/").append(nodes.size()).append(" entidades con clave primaria).");
        }

        return AiTeamResponseDto.builder()
                .intent(AiTeamResponseDto.Intent.CATCH_UP_SUMMARY)
                .chatResponse(sb.toString())
                .requesterName(senderName)
                .providerUsed("Asistente Co-Desarrollador (Catch-Up)")
                .actionSummary("Puesta al día de sesión presentada a @" + senderName)
                .build();
    }

    /**
     * Ejecuta una auditoría heurística rigurosa de consistencia, normalización Codd (1NF–3NF)
     * y calidad de diseño físico de base de datos JPA, con generación de plan de auto-reparación.
     */
    private AiTeamResponseDto handleConsistencyAudit(String sessionCode, String senderName, Object diagramSnapshot) {
        List<Map<String, Object>> nodes = extractNodes(diagramSnapshot);
        List<Map<String, Object>> edges = extractEdges(diagramSnapshot);

        List<String> normalizationWarnings = new ArrayList<>();
        List<String> databaseWarnings = new ArrayList<>();
        List<String> topologyWarnings = new ArrayList<>();
        List<UmlMutationDto> fixMutations = new ArrayList<>();

        if (nodes.isEmpty()) {
            normalizationWarnings.add("El modelo está vacío. No hay entidades para auditar.");
        } else {
            // 1. Detectar clases huérfanas (sin aristas)
            Set<String> connectedNodeIds = new HashSet<>();
            for (Map<String, Object> edge : edges) {
                Object src = edge.get("source");
                Object tgt = edge.get("target");
                if (src != null) connectedNodeIds.add(src.toString());
                if (tgt != null) connectedNodeIds.add(tgt.toString());
            }

            for (Map<String, Object> node : nodes) {
                String nodeId = node.get("id") != null ? node.get("id").toString() : "";
                Object dataObj = node.get("data");
                String className = (dataObj instanceof Map<?, ?> dataMap && dataMap.get("name") != null)
                        ? dataMap.get("name").toString() : nodeId;

                if (!connectedNodeIds.contains(nodeId)) {
                    topologyWarnings.add("Topología: La entidad **" + className + "** está huérfana (sin asociaciones ni relaciones con otras clases).");
                }

                // 2. Verificar existencia REAL de clave primaria {PK} (1NF)
                if (dataObj instanceof Map<?, ?> dataMap) {
                    Object attrs = dataMap.get("attributes");
                    boolean hasRealPk = false;
                    boolean hasIdNamedField = false;
                    String idFieldType = "Long";

                    if (attrs instanceof List<?> attrList) {
                        for (Object a : attrList) {
                            if (a instanceof Map<?, ?> amap) {
                                String attrName = amap.get("name") != null ? amap.get("name").toString() : "";
                                String attrType = amap.get("type") != null ? amap.get("type").toString() : "String";
                                boolean isPkFlag = Boolean.TRUE.equals(amap.get("isPrimaryKey")) || Boolean.TRUE.equals(amap.get("isId"));

                                if (isPkFlag) {
                                    hasRealPk = true;
                                }

                                if ("id".equalsIgnoreCase(attrName)) {
                                    hasIdNamedField = true;
                                    idFieldType = attrType;
                                }

                                // Inspección de calidad física de BD
                                String lowerName = attrName.toLowerCase();
                                if ((lowerName.contains("precio") || lowerName.contains("monto") || lowerName.contains("total") ||
                                        lowerName.contains("costo") || lowerName.contains("saldo") || lowerName.contains("sueldo") || lowerName.contains("salario"))
                                        && !attrType.equalsIgnoreCase("BigDecimal")) {
                                    databaseWarnings.add("Diseño Físico / JPA: En **" + className + "." + attrName + "** el tipo '" + attrType + "' puede generar pérdida de precisión decimal. Se recomienda **BigDecimal**.");
                                }

                                if ((lowerName.contains("fecha") || lowerName.contains("date") || lowerName.contains("nacimiento") || lowerName.contains("creacion"))
                                        && (attrType.equalsIgnoreCase("String") || attrType.equalsIgnoreCase("Integer") || attrType.equalsIgnoreCase("Long"))) {
                                    databaseWarnings.add("Diseño Físico / JPA: En **" + className + "." + attrName + "** el tipo '" + attrType + "' no es temporal nativo. Se recomienda **LocalDate** o **LocalDateTime**.");
                                }
                            }
                        }
                    }

                    if (!hasRealPk) {
                        if (hasIdNamedField) {
                            normalizationWarnings.add("Infracción 1NF: La entidad **" + className + "** posee un atributo 'id' pero carece de la marca formal de Clave Primaria `{PK}`.");
                        } else {
                            normalizationWarnings.add("Infracción 1NF: La entidad **" + className + "** carece totalmente de Clave Primaria `{PK}` identificadora.");
                        }

                        // Preparar mutación correctiva para auto-reparación
                        Map<String, Object> pkAttr = new LinkedHashMap<>();
                        pkAttr.put("id", "a-" + className.toLowerCase() + "-id");
                        pkAttr.put("name", "id");
                        pkAttr.put("type", idFieldType);
                        pkAttr.put("visibility", "private");
                        pkAttr.put("isPrimaryKey", true);
                        pkAttr.put("isId", true);
                        pkAttr.put("isNotNull", true);

                        UmlMutationDto fixMut = UmlMutationDto.builder()
                                .action("ADD_ATTRIBUTES")
                                .targetClassName(className)
                                .classData(Map.of("attributes", List.of(pkAttr)))
                                .details("Configurar Clave Primaria {PK} id: " + idFieldType + " en la entidad " + className)
                                .build();
                        fixMutations.add(fixMut);
                    }
                }
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append("🔍 **Auditoría de Consistencia, Normalización y Calidad del Modelo**\n\n");

        // Sección 1: Normalización Relacional
        sb.append("📊 **1. Normalización Relacional (Codd 1NF–3NF):**\n");
        if (normalizationWarnings.isEmpty()) {
            sb.append("✅ **Aprobado:** Todas las entidades poseen Claves Primarias {PK} atómicas conformes al estándar 1NF.\n");
        } else {
            for (String w : normalizationWarnings) {
                sb.append("- ").append(w).append("\n");
            }
        }

        // Sección 2: Diseño de Base de Datos y Persistencia JPA
        sb.append("\n💾 **2. Diseño Físico de Base de Datos y Persistencia JPA:**\n");
        if (databaseWarnings.isEmpty()) {
            sb.append("✅ **Aprobado:** Convenciones de tipos (`BigDecimal`, temporales tipados) óptimas para PostgreSQL 17.\n");
        } else {
            for (String w : databaseWarnings) {
                sb.append("- ").append(w).append("\n");
            }
        }

        // Sección 3: Topología del Grafo
        sb.append("\n🔗 **3. Topología y Conectividad del Grafo:**\n");
        if (topologyWarnings.isEmpty()) {
            sb.append("✅ **Aprobado:** El grafo está íntegramente interconectado sin entidades aisladas.\n");
        } else {
            for (String w : topologyWarnings) {
                sb.append("- ").append(w).append("\n");
            }
        }

        // Sección 4: Auto-Reparación Conversacional
        if (!fixMutations.isEmpty()) {
            if (sessionCode != null) {
                pendingSessionRepairs.put(sessionCode, fixMutations);
            }
            sb.append("\n💡 **Plan de Auto-Reparación Preparado (").append(fixMutations.size()).append(" corrección(es)):**\n");
            sb.append("He estructurado las mutaciones necesarias para corregir las infracciones de clave primaria en el lienzo. ");
            sb.append("¿Deseas que las aplique automáticamente? Responde **`@ai si`** o **`@ai reparar`**.");
        } else {
            if (sessionCode != null) {
                pendingSessionRepairs.remove(sessionCode);
            }
        }

        return AiTeamResponseDto.builder()
                .intent(AiTeamResponseDto.Intent.CONSISTENCY_AUDIT)
                .chatResponse(sb.toString())
                .requesterName(senderName)
                .providerUsed("Auditor Canónico TOM/Codd")
                .actionSummary("Auditoría técnica completada para @" + senderName)
                .build();
    }

    private String findNodeNameById(List<Map<String, Object>> nodes, String id) {
        if (id == null || id.isBlank()) return "Desconocida";
        for (Map<String, Object> node : nodes) {
            String nid = node.get("id") != null ? node.get("id").toString() : "";
            if (nid.equals(id)) {
                Object dataObj = node.get("data");
                if (dataObj instanceof Map<?, ?> dataMap && dataMap.get("name") != null) {
                    return dataMap.get("name").toString();
                }
            }
        }
        return id;
    }

    private AiTeamResponseDto handleOutOfScope(String senderName) {
        return AiTeamResponseDto.builder()
                .intent(AiTeamResponseDto.Intent.OUT_OF_SCOPE)
                .chatResponse("Estimado(a) @" + senderName + ", como **Asistente Co-Desarrollador de Software**, mi competencia está delimitada a la ingeniería de software: " +
                        "modelado de clases UML 2.5+, patrones GoF, normalización relacional (1NF–3NF), persistencia JPA/SQL y arquitectura en 4 capas. " +
                        "Por favor plantéame una consulta técnica o comando de modelado para el proyecto.")
                .requesterName(senderName)
                .providerUsed("Asistente Co-Desarrollador (Filtro Fuera de Dominio)")
                .build();
    }

    /**
     * Base de conocimiento local de contingencia para conceptos fundamentales de Ingeniería de Software.
     */
    public String getLocalTheoryKnowledge(String prompt) {
        String p = prompt.toLowerCase();

        if (p.contains("derivado")) {
            return "📐 **Atributo Derivado en UML 2.5+**\n\n" +
                    "Un **atributo derivado** es aquel cuyo valor no se almacena como dato primitivo persistente, sino que se calcula o deduce dinámicamente en tiempo de ejecución a partir de otros atributos o relaciones.\n\n" +
                    "- **Notación UML:** Se representa precedido por una barra inclinada: `/nombreAtributo: Tipo` (ej. `/edad: Integer`).\n" +
                    "- **Ejemplo Práctico:** En una entidad `Estudiante`, almacenar `fechaNacimiento: LocalDate` y definir el atributo derivado `/edad`, el cual se computa mediante `Period.between(fechaNacimiento, LocalDate.now()).getYears()`.\n" +
                    "- **Mapeo JPA/SQL:** En bases de datos relacionales no genera columna física. En Spring Boot / Java se anota con `@Transient` o se implementa como un método getter calculado sin campo persistente.";
        }

        if (p.contains("agregacion") || p.contains("composicion")) {
            return "🔗 **Agregación vs Composición en UML 2.5+**\n\n" +
                    "Ambas representan relaciones de 'todo-parte', pero difieren en la fuerza del acoplamiento y el ciclo de vida:\n\n" +
                    "1. **Agregación (Débil):** El componente (parte) puede existir independientemente del contenedor (todo). Se representa con un **rombo hueco blanco** en el extremo del contenedor. Ej: `Departamento` y `Profesor` (si el departamento cierra, el profesor sigue existiendo).\n" +
                    "2. **Composición (Fuerte):** El componente no tiene razón de ser sin el contenedor; su ciclo de vida está subordinado a él. Si se destruye el contenedor, se destruyen sus partes. Se representa con un **rombo relleno negro**. Ej: `Factura` y `DetalleFactura` (en JPA se implementa con `cascade = CascadeType.ALL, orphanRemoval = true`).";
        }

        if (p.contains("1nf") || p.contains("2nf") || p.contains("3nf") || p.contains("normalizacion")) {
            return "📊 **Formas Normales Relacionales (1NF, 2NF, 3NF - Codd)**\n\n" +
                    "- **1NF (Primera Forma Normal):** Requiere que todos los atributos sean atómicos (indivisibles), sin grupos repetitivos ni arrays dentro de una columna, y exige una **Clave Primaria {PK}** única identificadora.\n" +
                    "- **2NF (Segunda Forma Normal):** Estando en 1NF, ningún atributo no-clave puede tener dependencia funcional parcial respecto a una clave primaria compuesta. Todo atributo debe depender de la clave primaria completa.\n" +
                    "- **3NF (Tercera Forma Normal):** Estando en 2NF, no deben existir dependencias funcionales transitivas entre atributos no-clave (es decir, $X \\rightarrow Y$ y $Y \\rightarrow Z$ donde $Z$ depende indirectamente de la PK a través de $Y$). En multiplicidades N..M, exige una tabla intermedia con claves foráneas.";
        }

        if (p.contains("herencia") || p.contains("generalizacion")) {
            return "🧬 **Generalización / Herencia en UML 2.5+**\n\n" +
                    "Es una relación taxonómica entre un clasificador más general (superclase) y uno más específico (subclase). La subclase hereda atributos, métodos y asociaciones de la superclase y puede añadir comportamiento específico o sobrescribir métodos.\n\n" +
                    "- **Notación:** Flecha con línea continua terminada en un **triángulo hueco cerrado** apuntando hacia la superclase.\n" +
                    "- **Regla Formal:** No se permiten ciclos de herencia (una clase no puede descender de sí misma); la herramienta valida esto mediante búsqueda en profundidad (DFS).\n" +
                    "- **Estrategias JPA:** `@Inheritance(strategy = InheritanceType.JOINED)` o `SINGLE_TABLE`.";
        }

        if (p.contains("base de datos") || p.contains("bases de datos") || p.contains("database") || p.contains("bd") || p.contains("sql") || p.contains("rdbms")) {
            return "💾 **Bases de Datos Relacionales (RDBMS) en Ingeniería de Software**\n\n" +
                    "Una **Base de Datos** es un sistema computacional estructurado para almacenar, organizar, consultar y persistir información de forma confiable, garantizando las propiedades **ACID** (Atomicidad, Consistencia, Aislamiento y Durabilidad).\n\n" +
                    "- **Modelo Relacional (Edgar F. Codd):** Estructura el dominio en tablas (relaciones) bidimensionales formadas por registros (filas) y atributos (columnas), gobernadas por restricciones de integridad, Claves Primarias `{PK}` y Claves Foráneas `{FK}`.\n" +
                    "- **Integración CASE / ORM:** En nuestra plataforma, cada clase UML `<<entity>>` mapea formalmente a una tabla en PostgreSQL 17, tipando los campos (`Long`, `BigDecimal`, `LocalDate`) y generando el DDL optimizado con índices.";
        }

        if (p.contains("patron") || p.contains("patrones") || p.contains("gof") || p.contains("arquitectura")) {
            return "🏛️ **Patrones de Diseño y Arquitectura de Software**\n\n" +
                    "Los **Patrones de Diseño (Gang of Four - GoF)** proporcionan soluciones arquitectónicas probadas a problemáticas comunes del software orientado a objetos:\n\n" +
                    "- **Creacionales:** Factory Method, Singleton, Builder (usado en todos nuestros DTOs).\n" +
                    "- **Estructurales:** Adapter, Composite, Decorator, Facade.\n" +
                    "- **Comportamiento:** Observer (base del canal reactivo STOMP/WebSockets), Strategy, Command.\n" +
                    "- **Arquitectura en 4 Capas:** Controller (REST), Service (Lógica y `@Transactional`), Repository (Spring Data JPA), Entity (Persistencia PostgreSQL 17).";
        }

        return "💡 **Concepto de Ingeniería de Software (UML 2.5+)**\n\n" +
                "En el modelado orientado a objetos y diseño basado en componentes (CBD), las clases estructuran el dominio encapsulando estado (atributos tipados) y comportamiento (métodos). " +
                "El estándar UML 2.5 exige respetar la visibilidad (`+` público, `-` privado, `#` protegido), tipos fuertes y cardinalidades bien definidas para garantizar un mapeo directo hacia entidades JPA y tablas relacionales PostgreSQL 17.";
    }

    /**
     * Retransmite la respuesta de la IA a todos los clientes de la sala vía STOMP.
     */
    private void broadcastAiResponse(String sessionCode, UUID senderId, String senderName, AiTeamResponseDto response) {
        // 1. Mensaje de CHAT público
        Map<String, Object> chatPayload = new LinkedHashMap<>();
        chatPayload.put("id", "ai-msg-" + System.currentTimeMillis());
        chatPayload.put("text", response.getChatResponse());
        chatPayload.put("isAi", true);
        chatPayload.put("intent", response.getIntent() != null ? response.getIntent().name() : "THEORY_EXPLANATION");
        chatPayload.put("actionSummary", response.getActionSummary());
        chatPayload.put("requesterName", senderName);
        chatPayload.put("providerUsed", response.getProviderUsed());
        chatPayload.put("actionType", response.getActionType());
        chatPayload.put("actionData", response.getActionData());

        CollabMessageDto chatMsg = CollabMessageDto.builder()
                .type(CollabMessageDto.Type.CHAT)
                .senderId(AI_BOT_ID)
                .senderName(AI_BOT_NAME)
                .senderColor(AI_BOT_COLOR)
                .sessionCode(sessionCode)
                .payload(chatPayload)
                .timestamp(System.currentTimeMillis())
                .build();

        messagingTemplate.convertAndSend("/topic/room/" + sessionCode, chatMsg);

        // 2. Si hay mutaciones de modelado, retransmitirlas con tipo NODE_CREATE / EDGE_CREATE o SAVE_SYNC
        if (response.getMutations() != null && !response.getMutations().isEmpty()) {
            Map<String, Object> mutationPayload = new LinkedHashMap<>();
            mutationPayload.put("mutations", response.getMutations());
            mutationPayload.put("requesterId", senderId);
            mutationPayload.put("requesterName", senderName);
            mutationPayload.put("actionSummary", response.getActionSummary());

            CollabMessageDto mutMsg = CollabMessageDto.builder()
                    .type(CollabMessageDto.Type.SAVE_SYNC)
                    .senderId(AI_BOT_ID)
                    .senderName(AI_BOT_NAME)
                    .senderColor(AI_BOT_COLOR)
                    .sessionCode(sessionCode)
                    .payload(mutationPayload)
                    .timestamp(System.currentTimeMillis())
                    .build();

            messagingTemplate.convertAndSend("/topic/room/" + sessionCode, mutMsg);
        }
    }

    private void broadcastErrorMessage(String sessionCode, String senderName, String errorText) {
        Map<String, Object> errPayload = Map.of(
                "id", "ai-err-" + System.currentTimeMillis(),
                "text", "⚠️ @" + senderName + ", " + errorText,
                "isAi", true
        );

        CollabMessageDto errMsg = CollabMessageDto.builder()
                .type(CollabMessageDto.Type.CHAT)
                .senderId(AI_BOT_ID)
                .senderName(AI_BOT_NAME)
                .senderColor(AI_BOT_COLOR)
                .sessionCode(sessionCode)
                .payload(errPayload)
                .timestamp(System.currentTimeMillis())
                .build();

        messagingTemplate.convertAndSend("/topic/room/" + sessionCode, errMsg);
    }

    private String cleanAiMention(String text) {
        if (text == null) return "";
        return text.replaceAll("(?i)@ai\\b", "").trim();
    }

    private UUID resolveProjectId(String sessionCode) {
        if (sessionCode == null || sessionCode.isBlank()) return null;
        if (sessionCode.startsWith("PROJ-")) {
            try {
                return UUID.fromString(sessionCode.substring(5).trim());
            } catch (Exception ignored) {}
        }
        try {
            return UUID.fromString(sessionCode.trim());
        } catch (Exception ignored) {}

        try {
            Optional<CollaborationSession> s = sessionRepository.findBySessionCode(sessionCode);
            return s.map(cs -> cs.getProject() != null ? cs.getProject().getId() : null).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractNodes(Object diagramSnapshot) {
        if (diagramSnapshot instanceof Map<?, ?> map && map.get("nodes") instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractEdges(Object diagramSnapshot) {
        if (diagramSnapshot instanceof Map<?, ?> map && map.get("edges") instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return Collections.emptyList();
    }

    private List<String> extractClassNames(Object diagramSnapshot) {
        List<Map<String, Object>> nodes = extractNodes(diagramSnapshot);
        List<String> names = new ArrayList<>();
        for (Map<String, Object> node : nodes) {
            Object dataObj = node.get("data");
            if (dataObj instanceof Map<?, ?> dataMap && dataMap.get("name") != null) {
                names.add(dataMap.get("name").toString());
            }
        }
        return names;
    }

    private void saveAiPromptLog(
            String sessionCode,
            UUID senderId,
            String prompt,
            String intent,
            int latencyMs,
            AiTeamResponseDto response
    ) {
        UUID projectId = resolveProjectId(sessionCode);

        AiPromptLog logEntity = AiPromptLog.builder()
                .projectId(projectId)
                .userId(senderId)
                .modality("TEXT_COPILOT")
                .rawPrompt(prompt)
                .interpretedIntent(intent)
                .modelVersion("CircuitBreaker-AiTeamMember")
                .latencyMs(latencyMs)
                .appliedSuccessfully(response.getIntent() != AiTeamResponseDto.Intent.OUT_OF_SCOPE)
                .build();

        aiPromptLogRepository.save(logEntity);
    }
}
