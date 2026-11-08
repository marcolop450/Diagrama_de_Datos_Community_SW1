package com.sw1.casetool.service.collab;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.collab.CollabMessageDto;
import com.sw1.casetool.dto.collab.ContinuousSessionResumeResponse;
import com.sw1.casetool.dto.collab.ContinuousSessionSaveRequest;
import com.sw1.casetool.dto.collab.ContinuousSessionSnapshotDto;
import com.sw1.casetool.model.CollaborationSession;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.SessionParticipant;
import com.sw1.casetool.model.SessionSnapshotFallback;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.model.nosql.CollabSessionSnapshotDocument;
import com.sw1.casetool.repository.CollaborationSessionRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.SessionParticipantRepository;
import com.sw1.casetool.repository.SessionSnapshotFallbackRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.repository.nosql.CollabSessionSnapshotRepository;
import com.sw1.casetool.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContinuousSessionService {

    private final CollabSessionSnapshotRepository mongoSnapshotRepository;
    private final SessionSnapshotFallbackRepository postgresFallbackRepository;
    private final CollaborationSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final DiagramProjectRepository projectRepository;
    private final UserProfileRepository userProfileRepository;
    private final AuditLogService auditLogService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final com.sw1.casetool.service.notification.PushNotificationService pushNotificationService;

    /**
     * Guarda y suspende una sesión colaborativa continua en MongoDB Atlas (con fallback a PostgreSQL 17).
     */
    @Transactional
    public ContinuousSessionSnapshotDto saveContinuousSession(
            String sessionCode,
            UUID hostId,
            ContinuousSessionSaveRequest request
    ) {
        String cleanCode = sessionCode != null ? sessionCode.trim().toUpperCase() : "";
        CollaborationSession session = sessionRepository.findBySessionCode(cleanCode)
                .orElseThrow(() -> new IllegalArgumentException("No existe ninguna sesión colaborativa activa con el código " + cleanCode));

        DiagramProject project = session.getProject();
        UserProfile hostUser = userProfileRepository.findById(hostId).orElse(null);
        String hostName = hostUser != null ? (hostUser.getFullName() != null ? hostUser.getFullName() : hostUser.getUsername()) : "Host";

        Instant startedAt = session.getStartedAt() != null ? session.getStartedAt() : Instant.now();
        long elapsedMinutes = Duration.between(startedAt, Instant.now()).toMinutes();

        // Extraer participantes de la sesión
        List<SessionParticipant> participants = participantRepository.findBySessionId(session.getId());
        List<Map<String, Object>> participantsList = new ArrayList<>();
        for (SessionParticipant p : participants) {
            participantsList.add(Map.of(
                    "id", p.getId().toString(),
                    "userId", p.getUserId() != null ? p.getUserId().toString() : "",
                    "role", p.getRole(),
                    "cursorColor", p.getCursorColor() != null ? p.getCursorColor() : "#6366F1"
            ));
        }

        String persistenceSource = "MONGODB_ATLAS";
        String snapshotId = UUID.randomUUID().toString();

        CollabSessionSnapshotDocument doc = CollabSessionSnapshotDocument.builder()
                .sessionCode(cleanCode)
                .projectId(project.getId().toString())
                .projectName(project.getName())
                .hostId(hostId != null ? hostId.toString() : null)
                .hostName(hostName)
                .status("SUSPENDED")
                .savedAt(Instant.now())
                .originalStartedAt(startedAt)
                .elapsedMinutesBeforeSuspension(elapsedMinutes)
                .nodes(request.getNodes() != null ? request.getNodes() : Collections.emptyList())
                .edges(request.getEdges() != null ? request.getEdges() : Collections.emptyList())
                .chatHistory(request.getChatHistory() != null ? request.getChatHistory() : Collections.emptyList())
                .sessionEventLogs(request.getSessionEventLogs() != null ? request.getSessionEventLogs() : Collections.emptyList())
                .activeParticipantsSnapshot(participantsList)
                .normalizationScore(request.getNormalizationScore() != null ? request.getNormalizationScore() : 100)
                .normalizationLevel(request.getNormalizationLevel() != null ? request.getNormalizationLevel() : "3NF")
                .persistenceSource(persistenceSource)
                .build();

        // 1. Intentar persistencia primaria en MongoDB Atlas
        boolean savedInMongo = false;
        try {
            log.info("Persistiendo instantánea continua de sala {} en MongoDB Atlas...", cleanCode);
            CollabSessionSnapshotDocument savedDoc = mongoSnapshotRepository.save(doc);
            snapshotId = savedDoc.getId();
            savedInMongo = true;
            log.info("Instantánea resguardada con éxito en MongoDB Atlas (ID: {})", snapshotId);
        } catch (Exception e) {
            log.warn("Fallo de conexión o persistencia en MongoDB Atlas para sala {}: {}. Activando contingencia PostgreSQL 17...", cleanCode, e.getMessage());
            persistenceSource = "POSTGRES_FALLBACK";
            doc.setPersistenceSource(persistenceSource);
        }

        // 2. Si falló MongoDB, guardar respaldo inmediato en PostgreSQL
        if (!savedInMongo) {
            try {
                String payload = objectMapper.writeValueAsString(doc);
                SessionSnapshotFallback fallback = SessionSnapshotFallback.builder()
                        .sessionCode(cleanCode)
                        .projectId(project.getId())
                        .hostId(hostId)
                        .status("SUSPENDED")
                        .payloadJson(payload)
                        .build();
                SessionSnapshotFallback savedFallback = postgresFallbackRepository.save(fallback);
                snapshotId = savedFallback.getId().toString();
                log.info("Instantánea resguardada en contingencia PostgreSQL (ID: {})", snapshotId);
            } catch (Exception ex) {
                log.error("Fallo crítico al guardar contingencia en PostgreSQL: {}", ex.getMessage(), ex);
                throw new RuntimeException("No se pudo persistir la sesión colaborativa: " + ex.getMessage());
            }
        }

        // 3. Marcar la sesión en PostgreSQL como SUSPENDED
        session.setStatus("suspended");
        session.setEndedAt(Instant.now());
        sessionRepository.save(session);

        // 4. Retransmitir evento WebSocket informando a los colaboradores
        notifySuspensionToRoom(cleanCode, hostName);

        // 5. Registrar auditoría forense
        auditLogService.recordAction(
                hostId,
                "CONTINUOUS_SESSION_SUSPENDED",
                "COLLABORATION_SESSION",
                session.getId(),
                "127.0.0.1",
                "CASE-Tool-STOMP",
                Map.of(
                        "sessionCode", cleanCode,
                        "persistenceSource", persistenceSource,
                        "nodesCount", request.getNodes() != null ? request.getNodes().size() : 0,
                        "chatCount", request.getChatHistory() != null ? request.getChatHistory().size() : 0
                )
        );

        int finalParticipantsCount = participantsList.isEmpty() ? 1 : participantsList.size();

        return ContinuousSessionSnapshotDto.builder()
                .id(snapshotId)
                .sessionCode(cleanCode)
                .projectId(project.getId())
                .projectName(project.getName())
                .hostId(hostId)
                .hostName(hostName)
                .status("SUSPENDED")
                .savedAt(Instant.now())
                .elapsedMinutes(elapsedMinutes)
                .nodesCount(request.getNodes() != null ? request.getNodes().size() : 0)
                .edgesCount(request.getEdges() != null ? request.getEdges().size() : 0)
                .chatMessagesCount(request.getChatHistory() != null ? request.getChatHistory().size() : 0)
                .participantsCount(finalParticipantsCount)
                .normalizationScore(request.getNormalizationScore() != null ? request.getNormalizationScore() : 100)
                .normalizationLevel(request.getNormalizationLevel() != null ? request.getNormalizationLevel() : "3NF")
                .persistenceSource(persistenceSource)
                .build();
    }

    /**
     * Consulta el catálogo de sesiones continuas suspendidas para un proyecto.
     */
    @Transactional(readOnly = true)
    public List<ContinuousSessionSnapshotDto> getProjectSnapshots(UUID projectId) {
        List<ContinuousSessionSnapshotDto> results = new ArrayList<>();
        Set<String> seenCodes = new HashSet<>();

        // 1. Consultar MongoDB Atlas
        try {
            List<CollabSessionSnapshotDocument> docs = mongoSnapshotRepository.findByProjectIdOrderBySavedAtDesc(projectId.toString());
            for (CollabSessionSnapshotDocument d : docs) {
                if (d.getSessionCode() != null && seenCodes.add(d.getSessionCode())) {
                    results.add(mapDocToDto(d));
                }
            }
        } catch (Exception e) {
            log.warn("No se pudo consultar MongoDB Atlas para proyecto {}: {}", projectId, e.getMessage());
        }

        // 2. Consultar respaldos en PostgreSQL
        try {
            List<SessionSnapshotFallback> fallbacks = postgresFallbackRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
            for (SessionSnapshotFallback f : fallbacks) {
                if (f.getSessionCode() != null && seenCodes.add(f.getSessionCode())) {
                    try {
                        CollabSessionSnapshotDocument d = objectMapper.readValue(f.getPayloadJson(), CollabSessionSnapshotDocument.class);
                        d.setId(f.getId().toString());
                        d.setPersistenceSource("POSTGRES_FALLBACK");
                        results.add(mapDocToDto(d));
                    } catch (Exception parseErr) {
                        log.warn("Error parseando snapshot fallback {}: {}", f.getId(), parseErr.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error consultando respaldos de PostgreSQL: {}", e.getMessage());
        }

        return results;
    }

    /**
     * Reanuda una sesión suspendida, restaurando el grafo, chat, participantes y reactivando la sala WebSocket.
     */
    @Transactional
    public ContinuousSessionResumeResponse resumeContinuousSession(String sessionCode, UUID requesterId) {
        String cleanCode = sessionCode != null ? sessionCode.trim().toUpperCase() : "";

        // 1. Buscar en MongoDB Atlas
        CollabSessionSnapshotDocument doc = null;
        try {
            doc = mongoSnapshotRepository.findTopBySessionCodeOrderBySavedAtDesc(cleanCode).orElse(null);
        } catch (Exception e) {
            log.warn("No se pudo consultar MongoDB Atlas al reanudar {}: {}", cleanCode, e.getMessage());
        }

        // 2. Si no se encontró en MongoDB, buscar en PostgreSQL
        if (doc == null) {
            SessionSnapshotFallback fallback = postgresFallbackRepository.findTopBySessionCodeOrderByCreatedAtDesc(cleanCode)
                    .orElseThrow(() -> new IllegalArgumentException("No se encontró ninguna instantánea guardada para la sala " + cleanCode));
            try {
                doc = objectMapper.readValue(fallback.getPayloadJson(), CollabSessionSnapshotDocument.class);
                doc.setPersistenceSource("POSTGRES_FALLBACK");
            } catch (Exception e) {
                throw new RuntimeException("Error al deserializar el respaldo de la sesión: " + e.getMessage());
            }
        }

        // 3. Reactivar la sesión en PostgreSQL
        CollaborationSession session = sessionRepository.findBySessionCode(cleanCode).orElse(null);
        if (session != null) {
            session.setStatus("active");
            session.setEndedAt(null);
            sessionRepository.save(session);
        } else {
            UUID pid = doc.getProjectId() != null ? UUID.fromString(doc.getProjectId()) : null;
            UUID hid = doc.getHostId() != null ? UUID.fromString(doc.getHostId()) : null;
            DiagramProject project = projectRepository.findById(pid)
                    .orElseThrow(() -> new IllegalArgumentException("El proyecto de la sesión ya no existe"));
            session = CollaborationSession.builder()
                    .project(project)
                    .hostId(hid)
                    .sessionCode(cleanCode)
                    .status("active")
                    .build();
            sessionRepository.save(session);
        }

        // 4. Retransmitir evento WebSocket de reactivación
        notifyResumptionToRoom(cleanCode, doc.getHostName());

        // 5. Registrar auditoría forense
        auditLogService.recordAction(
                requesterId,
                "CONTINUOUS_SESSION_RESUMED",
                "COLLABORATION_SESSION",
                session.getId(),
                "127.0.0.1",
                "CASE-Tool-STOMP",
                Map.of(
                        "sessionCode", cleanCode,
                        "persistenceSource", doc.getPersistenceSource()
                )
        );

        return ContinuousSessionResumeResponse.builder()
                .sessionCode(cleanCode)
                .projectId(doc.getProjectId() != null ? UUID.fromString(doc.getProjectId()) : null)
                .projectName(doc.getProjectName())
                .hostId(doc.getHostId() != null ? UUID.fromString(doc.getHostId()) : null)
                .hostName(doc.getHostName())
                .resumedAt(Instant.now())
                .nodes(doc.getNodes() != null ? doc.getNodes() : Collections.emptyList())
                .edges(doc.getEdges() != null ? doc.getEdges() : Collections.emptyList())
                .chatHistory(doc.getChatHistory() != null ? doc.getChatHistory() : Collections.emptyList())
                .sessionEventLogs(doc.getSessionEventLogs() != null ? doc.getSessionEventLogs() : Collections.emptyList())
                .normalizationScore(doc.getNormalizationScore() != null ? doc.getNormalizationScore() : 100)
                .normalizationLevel(doc.getNormalizationLevel() != null ? doc.getNormalizationLevel() : "3NF")
                .persistenceSource(doc.getPersistenceSource())
                .build();
    }

    /**
     * Elimina un snapshot documental de la base de datos.
     */
    @Transactional
    public void deleteSnapshot(String snapshotId, UUID requesterId) {
        boolean deleted = false;
        try {
            if (mongoSnapshotRepository.existsById(snapshotId)) {
                mongoSnapshotRepository.deleteById(snapshotId);
                deleted = true;
            }
        } catch (Exception ignored) {}

        if (!deleted) {
            try {
                UUID fbId = UUID.fromString(snapshotId);
                postgresFallbackRepository.deleteById(fbId);
            } catch (Exception ignored) {}
        }
    }

    private void notifySuspensionToRoom(String sessionCode, String hostName) {
        Map<String, Object> payload = Map.of(
                "action", "SESSION_SUSPENDED",
                "sessionCode", sessionCode,
                "hostName", hostName != null ? hostName : "Host",
                "message", "El Host ha suspendido y guardado la sesión continua. Podrás reconectarte con el mismo código cuando sea reanudada."
        );

        CollabMessageDto msg = CollabMessageDto.builder()
                .type(CollabMessageDto.Type.CHAT)
                .senderName("Sistema")
                .senderColor("#EF4444")
                .sessionCode(sessionCode)
                .payload(payload)
                .timestamp(System.currentTimeMillis())
                .build();

        messagingTemplate.convertAndSend("/topic/room/" + sessionCode, msg);

        try {
            sessionRepository.findBySessionCode(sessionCode).ifPresent(s -> {
                if (s.getProject() != null) {
                    pushNotificationService.sendPushToProjectCollaborators(
                            s.getProject().getId(),
                            s.getHostId(),
                            com.sw1.casetool.dto.notification.PushNotificationType.ROOM_STARTED,
                            "Sesión Colaborativa Reanudada",
                            "La sesión colaborativa " + sessionCode + " ha sido reanudada por " + (hostName != null ? hostName : "el Anfitrión") + ".",
                            Map.of("sessionCode", sessionCode, "action", "JOIN_ROOM")
                    );
                }
            });
        } catch (Exception ignored) {}
    }

    private void notifyResumptionToRoom(String sessionCode, String hostName) {
        Map<String, Object> payload = Map.of(
                "action", "SESSION_RESUMED",
                "sessionCode", sessionCode,
                "hostName", hostName != null ? hostName : "Host",
                "message", "La sesión continua ha sido reanudada exitosamente por el Host."
        );

        CollabMessageDto msg = CollabMessageDto.builder()
                .type(CollabMessageDto.Type.CHAT)
                .senderName("Sistema")
                .senderColor("#10B981")
                .sessionCode(sessionCode)
                .payload(payload)
                .timestamp(System.currentTimeMillis())
                .build();

        messagingTemplate.convertAndSend("/topic/room/" + sessionCode, msg);

        try {
            sessionRepository.findBySessionCode(sessionCode).ifPresent(s -> {
                if (s.getProject() != null) {
                    pushNotificationService.sendPushToProjectCollaborators(
                            s.getProject().getId(),
                            s.getHostId(),
                            com.sw1.casetool.dto.notification.PushNotificationType.ROOM_STARTED,
                            "Sesión Colaborativa Reanudada",
                            "La sesión colaborativa " + sessionCode + " ha sido reanudada por " + (hostName != null ? hostName : "el Anfitrión") + ".",
                            Map.of("sessionCode", sessionCode, "action", "JOIN_ROOM")
                    );
                }
            });
        } catch (Exception ignored) {}
    }

    private ContinuousSessionSnapshotDto mapDocToDto(CollabSessionSnapshotDocument d) {
        int pCount = (d.getActiveParticipantsSnapshot() != null && !d.getActiveParticipantsSnapshot().isEmpty())
                ? d.getActiveParticipantsSnapshot().size()
                : 1;

        return ContinuousSessionSnapshotDto.builder()
                .id(d.getId())
                .sessionCode(d.getSessionCode())
                .projectId(d.getProjectId() != null ? UUID.fromString(d.getProjectId()) : null)
                .projectName(d.getProjectName())
                .hostId(d.getHostId() != null ? UUID.fromString(d.getHostId()) : null)
                .hostName(d.getHostName())
                .status(d.getStatus())
                .savedAt(d.getSavedAt())
                .elapsedMinutes(d.getElapsedMinutesBeforeSuspension() != null ? d.getElapsedMinutesBeforeSuspension() : 0L)
                .nodesCount(d.getNodes() != null ? d.getNodes().size() : 0)
                .edgesCount(d.getEdges() != null ? d.getEdges().size() : 0)
                .chatMessagesCount(d.getChatHistory() != null ? d.getChatHistory().size() : 0)
                .participantsCount(pCount)
                .normalizationScore(d.getNormalizationScore() != null ? d.getNormalizationScore() : 100)
                .normalizationLevel(d.getNormalizationLevel() != null ? d.getNormalizationLevel() : "3NF")
                .persistenceSource(d.getPersistenceSource() != null ? d.getPersistenceSource() : "MONGODB_ATLAS")
                .build();
    }
}
