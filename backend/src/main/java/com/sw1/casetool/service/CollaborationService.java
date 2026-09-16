package com.sw1.casetool.service;

import com.sw1.casetool.dto.FullDiagramResponse;
import com.sw1.casetool.dto.collab.*;
import com.sw1.casetool.exception.ResourceNotFoundException;
import com.sw1.casetool.model.*;
import com.sw1.casetool.repository.*;
import com.sw1.casetool.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CollaborationService {

    private final CollaborationSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final ElementLockRepository lockRepository;
    private final DiagramProjectRepository projectRepository;
    private final UserProfileRepository userProfileRepository;
    private final DiagramService diagramService;
    private final AuditLogService auditLogService;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtTokenProvider jwtTokenProvider;

    private static final List<String> COLLAB_PALETTE = List.of(
            "#10B981", // Esmeralda
            "#F59E0B", // Ámbar
            "#EC4899", // Rosa
            "#8B5CF6", // Violeta
            "#06B6D4", // Cian
            "#F97316", // Naranja
            "#3B82F6", // Azul Zafiro
            "#14B8A6"  // Turquesa
    );

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    @Transactional
    public CollaborationSessionDto startSession(StartSessionRequest request, String userEmail, String ip, String userAgent) {
        UserProfile host = resolveUser(userEmail);
        DiagramProject project = projectRepository.findByIdAndIsDeletedFalse(request.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado: " + request.getProjectId()));

        // Validar si ya existe una sala activa para este proyecto
        List<CollaborationSession> activeSessions = sessionRepository.findByProjectIdAndStatus(project.getId(), "active");
        if (!activeSessions.isEmpty()) {
            CollaborationSession existing = activeSessions.get(0);
            log.info("Reutilizando sesión colaborativa activa '{}' para proyecto '{}'", existing.getSessionCode(), project.getName());
            return buildSessionDto(existing);
        }

        // Generar código único de 6 caracteres con prefijo SW1 (ej. SW1-892)
        String sessionCode = generateUniqueSessionCode();

        CollaborationSession session = CollaborationSession.builder()
                .project(project)
                .hostId(host.getId())
                .sessionCode(sessionCode)
                .status("active")
                .startedAt(Instant.now())
                .build();

        CollaborationSession saved = sessionRepository.save(session);

        // Registrar al Host como primer participante
        SessionParticipant hostParticipant = SessionParticipant.builder()
                .session(saved)
                .userId(host.getId())
                .role("host")
                .cursorColor("#6366F1") // Indigo para el Host
                .joinedAt(Instant.now())
                .build();
        participantRepository.save(hostParticipant);

        // Bitácora inmutable de auditoría
        Map<String, Object> auditDetails = new HashMap<>();
        auditDetails.put("projectId", project.getId());
        auditDetails.put("projectName", project.getName());
        auditDetails.put("sessionCode", sessionCode);
        auditDetails.put("hostName", host.getFullName());

        auditLogService.recordAction(
                host.getId(),
                "COLLABORATION_SESSION_STARTED",
                "collaboration_sessions",
                saved.getId(),
                ip,
                userAgent,
                auditDetails
        );

        log.info("Sesión colaborativa iniciada con éxito. Código: '{}' por Host '{}'", sessionCode, host.getFullName());
        return buildSessionDto(saved);
    }

    @Transactional
    public CollaborationSessionDto joinSession(JoinSessionRequest request, String userEmail, String ip, String userAgent) {
        String code = request.getSessionCode().trim().toUpperCase();

        CollaborationSession session = sessionRepository.findBySessionCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Sala no encontrada o sesión finalizada. Código: " + code));

        if ("paused".equalsIgnoreCase(session.getStatus())) {
            throw new IllegalArgumentException("El anfitrión ha pausado el acceso a esta sala colaborativa.");
        }

        if (!"active".equalsIgnoreCase(session.getStatus())) {
            throw new ResourceNotFoundException("La sesión colaborativa '" + code + "' ha finalizado.");
        }

        // Exigir usuario registrado y autenticado
        if (userEmail == null || userEmail.isBlank() || "anonymousUser".equalsIgnoreCase(userEmail)) {
            throw new IllegalArgumentException("Debes iniciar sesión con una cuenta de Arquitecto o Colaborador para unirte a la sala.");
        }

        UserProfile participantUser = resolveUser(userEmail);

        if ("SUPER_ADMIN".equalsIgnoreCase(participantUser.getRole())) {
            throw new IllegalArgumentException("Los administradores no participan en sesiones de modelado colaborativo.");
        }

        // Verificar si ya está en la sala
        List<SessionParticipant> currentParticipants = participantRepository.findBySessionId(session.getId());
        boolean alreadyJoined = currentParticipants.stream()
                .anyMatch(p -> p.getUserId().equals(participantUser.getId()));

        if (!alreadyJoined) {
            int colorIndex = Math.abs(participantUser.getId().hashCode()) % COLLAB_PALETTE.size();
            String cursorColor = COLLAB_PALETTE.get(colorIndex);

            SessionParticipant newParticipant = SessionParticipant.builder()
                    .session(session)
                    .userId(participantUser.getId())
                    .role("editor")
                    .cursorColor(cursorColor)
                    .joinedAt(Instant.now())
                    .build();
            participantRepository.save(newParticipant);

            // Notificar a la sala vía WebSocket STOMP
            CollabMessageDto joinMsg = CollabMessageDto.builder()
                    .type(CollabMessageDto.Type.JOIN)
                    .senderId(participantUser.getId())
                    .senderName(participantUser.getFullName())
                    .senderColor(cursorColor)
                    .sessionCode(code)
                    .timestamp(System.currentTimeMillis())
                    .payload(Map.of(
                            "username", participantUser.getUsername() != null ? participantUser.getUsername() : "",
                            "fullName", participantUser.getFullName(),
                            "role", "editor"
                    ))
                    .build();
            messagingTemplate.convertAndSend("/topic/room/" + code, joinMsg);
        }

        // Registrar auditoría con usuario real persistido
        Map<String, Object> auditDetails = new HashMap<>();
        auditDetails.put("sessionCode", code);
        auditDetails.put("participantName", participantUser.getFullName());
        auditDetails.put("username", participantUser.getUsername());
        auditDetails.put("role", participantUser.getRole());

        auditLogService.recordAction(
                participantUser.getId(),
                "COLLABORATION_SESSION_JOINED",
                "session_participants",
                session.getId(),
                ip,
                userAgent,
                auditDetails
        );

        log.info("Participante registrado '{}' (Rol: {}) se unió a la sesión '{}'", participantUser.getFullName(), participantUser.getRole(), code);
        CollaborationSessionDto dto = buildSessionDto(session);

        String token = jwtTokenProvider.generateToken(
                participantUser.getId(),
                participantUser.getEmail(),
                participantUser.getFullName(),
                participantUser.getRole(),
                participantUser.getSubscriptionPlan()
        );
        dto.setToken(token);

        Map<String, Object> sessionMap = new HashMap<>();
        sessionMap.put("userId", participantUser.getId().toString());
        sessionMap.put("email", participantUser.getEmail());
        sessionMap.put("fullName", participantUser.getFullName());
        sessionMap.put("username", participantUser.getUsername());
        sessionMap.put("role", participantUser.getRole());
        sessionMap.put("subscriptionPlan", participantUser.getSubscriptionPlan());
        dto.setUserSession(sessionMap);

        return dto;
    }

    @Transactional
    public void kickParticipant(String sessionCode, UUID participantUserId, String hostEmail, String ip, String userAgent) {
        String code = sessionCode.trim().toUpperCase();
        CollaborationSession session = sessionRepository.findBySessionCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Sala no encontrada: " + code));

        UserProfile host = resolveUser(hostEmail);
        if (!session.getHostId().equals(host.getId())) {
            throw new IllegalArgumentException("Solo el Arquitecto anfitrión puede expulsar participantes de la sala.");
        }

        if (session.getHostId().equals(participantUserId)) {
            throw new IllegalArgumentException("El anfitrión no puede expulsarse a sí mismo de la sala.");
        }

        List<SessionParticipant> participants = participantRepository.findBySessionId(session.getId());
        SessionParticipant toKick = participants.stream()
                .filter(p -> p.getUserId().equals(participantUserId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("El participante no se encuentra en esta sala."));

        // Purgar candados del usuario expulsado
        lockRepository.deleteBySessionIdAndLockedBy(session.getId(), participantUserId);

        // Eliminar de session_participants
        participantRepository.delete(toKick);

        // Difundir evento KICK por WebSocket STOMP
        CollabMessageDto kickMsg = CollabMessageDto.builder()
                .type(CollabMessageDto.Type.KICK)
                .senderId(host.getId())
                .senderName(host.getFullName())
                .sessionCode(code)
                .timestamp(System.currentTimeMillis())
                .payload(Map.of(
                        "kickedUserId", participantUserId.toString(),
                        "message", "Has sido expulsado de la sesión por el Arquitecto anfitrión."
                ))
                .build();
        messagingTemplate.convertAndSend("/topic/room/" + code, kickMsg);

        // Registrar auditoría
        auditLogService.recordAction(
                host.getId(),
                "COLLABORATION_PARTICIPANT_KICKED",
                "session_participants",
                toKick.getId(),
                ip,
                userAgent,
                Map.of("sessionCode", code, "kickedUserId", participantUserId.toString())
        );

        log.info("Host '{}' expulsó al participante '{}' de la sala '{}'", host.getFullName(), participantUserId, code);
    }

    @Transactional
    public void updateParticipantRole(String sessionCode, UUID participantUserId, String newRole, String hostEmail, String ip, String userAgent) {
        String code = sessionCode.trim().toUpperCase();
        CollaborationSession session = sessionRepository.findBySessionCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Sala no encontrada: " + code));

        UserProfile host = resolveUser(hostEmail);
        if (!session.getHostId().equals(host.getId())) {
            throw new IllegalArgumentException("Solo el Arquitecto anfitrión puede cambiar los roles de los participantes.");
        }

        if (session.getHostId().equals(participantUserId)) {
            throw new IllegalArgumentException("No se puede modificar el rol del anfitrión de la sala.");
        }

        String normalizedRole = newRole.trim().toLowerCase();
        if (!"editor".equals(normalizedRole) && !"viewer".equals(normalizedRole)) {
            throw new IllegalArgumentException("Rol inválido. Los roles permitidos son 'editor' o 'viewer'.");
        }

        List<SessionParticipant> participants = participantRepository.findBySessionId(session.getId());
        SessionParticipant participant = participants.stream()
                .filter(p -> p.getUserId().equals(participantUserId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("El participante no se encuentra en esta sala."));

        participant.setRole(normalizedRole);
        participantRepository.save(participant);

        // Si cambia a 'viewer', liberar de inmediato cualquier candado que retenga
        if ("viewer".equals(normalizedRole)) {
            lockRepository.deleteBySessionIdAndLockedBy(session.getId(), participantUserId);
        }

        // Difundir evento ROLE_CHANGED por WebSocket STOMP
        CollabMessageDto roleMsg = CollabMessageDto.builder()
                .type(CollabMessageDto.Type.ROLE_CHANGED)
                .senderId(host.getId())
                .senderName(host.getFullName())
                .sessionCode(code)
                .timestamp(System.currentTimeMillis())
                .payload(Map.of(
                        "participantUserId", participantUserId.toString(),
                        "role", normalizedRole,
                        "message", "El anfitrión ha cambiado tu rol a: " + ("viewer".equals(normalizedRole) ? "Lector (Solo Lectura)" : "Editor")
                ))
                .build();
        messagingTemplate.convertAndSend("/topic/room/" + code, roleMsg);

        // Auditoría inmutable
        auditLogService.recordAction(
                host.getId(),
                "COLLABORATION_PARTICIPANT_ROLE_CHANGED",
                "session_participants",
                participant.getId(),
                ip,
                userAgent,
                Map.of(
                        "sessionCode", code,
                        "participantUserId", participantUserId.toString(),
                        "newRole", normalizedRole
                )
        );

        log.info("Host '{}' actualizó el rol del participante '{}' a '{}' en sala '{}'", host.getFullName(), participantUserId, normalizedRole, code);
    }

    @Transactional
    public void endSession(String sessionCode, String userEmail, String ip, String userAgent) {
        String code = sessionCode.trim().toUpperCase();
        CollaborationSession session = sessionRepository.findBySessionCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Sala no encontrada: " + code));

        UserProfile user = resolveUser(userEmail);
        boolean isHost = session.getHostId().equals(user.getId());
        boolean isAdmin = "SUPER_ADMIN".equalsIgnoreCase(user.getRole());

        if (!isHost && !isAdmin) {
            throw new IllegalArgumentException("Únicamente el Arquitecto anfitrión puede finalizar la sesión colaborativa");
        }

        session.setStatus("ended");
        session.setEndedAt(Instant.now());
        sessionRepository.save(session);

        // Liberar todos los candados de la sala
        lockRepository.deleteBySessionId(session.getId());

        // Purgar todos los participantes de la sala al finalizarla
        participantRepository.deleteBySessionId(session.getId());

        // Emitir evento de desconexión masiva a los clientes
        CollabMessageDto endMsg = CollabMessageDto.builder()
                .type(CollabMessageDto.Type.SESSION_ENDED)
                .senderId(user.getId())
                .senderName(user.getFullName())
                .sessionCode(code)
                .timestamp(System.currentTimeMillis())
                .payload("La sesión colaborativa ha sido finalizada por el anfitrión.")
                .build();
        messagingTemplate.convertAndSend("/topic/room/" + code, endMsg);

        // Registrar auditoría
        Map<String, Object> auditDetails = new HashMap<>();
        auditDetails.put("sessionCode", code);
        auditDetails.put("endedBy", user.getFullName());

        auditLogService.recordAction(
                user.getId(),
                "COLLABORATION_SESSION_ENDED",
                "collaboration_sessions",
                session.getId(),
                ip,
                userAgent,
                auditDetails
        );

        log.info("Sesión colaborativa '{}' finalizada exitosamente.", code);
    }

    @Transactional(readOnly = true)
    public CollaborationSessionDto getSessionStatus(String sessionCode) {
        String code = sessionCode.trim().toUpperCase();
        CollaborationSession session = sessionRepository.findBySessionCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Sala no encontrada: " + code));
        return buildSessionDto(session);
    }

    @Transactional
    public boolean acquireLock(String sessionCode, UUID elementId, UUID userId, String userName, String cursorColor) {
        cleanExpiredLocks();

        CollaborationSession session = sessionRepository.findBySessionCode(sessionCode)
                .orElse(null);
        if (session == null || !"active".equalsIgnoreCase(session.getStatus())) {
            return false;
        }

        List<SessionParticipant> participants = participantRepository.findBySessionId(session.getId());
        boolean isViewer = participants.stream()
                .anyMatch(p -> p.getUserId().equals(userId) && "viewer".equalsIgnoreCase(p.getRole()));
        if (isViewer) {
            log.warn("Participante '{}' en modo solo lectura (viewer) intentó adquirir candado sobre '{}'", userId, elementId);
            return false;
        }

        Optional<ElementLock> existingOpt = lockRepository.findBySessionIdAndElementId(session.getId(), elementId);
        Instant expiresAt = Instant.now().plusSeconds(30);

        if (existingOpt.isPresent()) {
            ElementLock existing = existingOpt.get();
            if (existing.getExpiresAt().isAfter(Instant.now()) && !existing.getLockedBy().equals(userId)) {
                // Bloqueado por otro usuario activo
                return false;
            }
            // Renovar bloqueo
            existing.setLockedBy(userId);
            existing.setLockedByName(userName);
            existing.setExpiresAt(expiresAt);
            lockRepository.save(existing);
        } else {
            ElementLock newLock = ElementLock.builder()
                    .session(session)
                    .elementId(elementId)
                    .lockedBy(userId)
                    .lockedByName(userName)
                    .expiresAt(expiresAt)
                    .build();
            lockRepository.save(newLock);
        }

        // Difundir adquisición de candado
        CollabMessageDto lockMsg = CollabMessageDto.builder()
                .type(CollabMessageDto.Type.LOCK)
                .senderId(userId)
                .senderName(userName)
                .senderColor(cursorColor)
                .sessionCode(sessionCode)
                .timestamp(System.currentTimeMillis())
                .payload(Map.of(
                        "elementId", elementId.toString(),
                        "lockedByName", userName,
                        "cursorColor", cursorColor != null ? cursorColor : "#6366F1",
                        "expiresAt", expiresAt.toEpochMilli()
                ))
                .build();
        messagingTemplate.convertAndSend("/topic/room/" + sessionCode, lockMsg);

        return true;
    }

    @Transactional
    public void releaseLock(String sessionCode, UUID elementId, UUID userId) {
        CollaborationSession session = sessionRepository.findBySessionCode(sessionCode).orElse(null);
        if (session == null) return;

        lockRepository.deleteBySessionIdAndElementId(session.getId(), elementId);

        CollabMessageDto unlockMsg = CollabMessageDto.builder()
                .type(CollabMessageDto.Type.UNLOCK)
                .senderId(userId)
                .sessionCode(sessionCode)
                .timestamp(System.currentTimeMillis())
                .payload(Map.of("elementId", elementId.toString()))
                .build();
        messagingTemplate.convertAndSend("/topic/room/" + sessionCode, unlockMsg);
    }

    @Transactional
    public void cleanExpiredLocks() {
        try {
            lockRepository.deleteExpiredLocks(Instant.now());
        } catch (Exception e) {
            log.warn("Error purgando candados expirados: {}", e.getMessage());
        }
    }

    private CollaborationSessionDto buildSessionDto(CollaborationSession session) {
        UserProfile host = userProfileRepository.findById(session.getHostId()).orElse(null);
        DiagramProject project = session.getProject();

        List<SessionParticipant> participants = participantRepository.findBySessionId(session.getId());
        Map<UUID, UserProfile> profilesMap = userProfileRepository.findAllById(
                participants.stream().map(SessionParticipant::getUserId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(UserProfile::getId, u -> u));

        List<ParticipantDto> participantDtos = participants.stream().map(p -> {
            UserProfile u = profilesMap.get(p.getUserId());
            return ParticipantDto.builder()
                    .id(p.getId())
                    .userId(p.getUserId())
                    .fullName(u != null ? u.getFullName() : "Colaborador")
                    .dni(u != null ? u.getUsername() : "")
                    .role(p.getRole())
                    .cursorColor(p.getCursorColor())
                    .joinedAt(p.getJoinedAt())
                    .build();
        }).collect(Collectors.toList());

        cleanExpiredLocks();
        List<ElementLock> activeLocks = lockRepository.findBySessionId(session.getId());
        List<ElementLockDto> lockDtos = activeLocks.stream().map(l -> ElementLockDto.builder()
                .elementId(l.getElementId())
                .lockedBy(l.getLockedBy())
                .lockedByName(l.getLockedByName())
                .expiresAt(l.getExpiresAt())
                .build()
        ).collect(Collectors.toList());

        FullDiagramResponse diagramData = diagramService.getFullDiagram(project.getId());

        return CollaborationSessionDto.builder()
                .sessionId(session.getId())
                .sessionCode(session.getSessionCode())
                .projectId(project.getId())
                .projectName(project.getName())
                .hostId(session.getHostId())
                .hostName(host != null ? host.getFullName() : "Arquitecto")
                .status(session.getStatus())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .participants(participantDtos)
                .locks(lockDtos)
                .initialDiagram(diagramData)
                .build();
    }

    @Transactional
    public void leaveSession(String sessionCode, String userEmail) {
        String code = sessionCode.trim().toUpperCase();
        CollaborationSession session = sessionRepository.findBySessionCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Sala no encontrada: " + code));

        UserProfile user = resolveUser(userEmail);

        // Si el usuario que abandona es el Host: finaliza la sala para todos (desconecta a todos)
        if (session.getHostId().equals(user.getId())) {
            log.info("Host '{}' abandonó la sala '{}'. Finalizando sala para todos los colaboradores.", user.getFullName(), code);
            endSession(sessionCode, userEmail, "INTERNAL", "Host-Leave");
            return;
        }

        // Si es un colaborador: purgar sus candados y retirarlo de session_participants
        lockRepository.deleteBySessionIdAndLockedBy(session.getId(), user.getId());
        participantRepository.deleteBySessionIdAndUserId(session.getId(), user.getId());

        // Emitir mensaje STOMP LEAVE
        CollabMessageDto leaveMsg = CollabMessageDto.builder()
                .type(CollabMessageDto.Type.LEAVE)
                .senderId(user.getId())
                .senderName(user.getFullName())
                .sessionCode(code)
                .timestamp(System.currentTimeMillis())
                .payload(Map.of("leftUserId", user.getId().toString()))
                .build();
        messagingTemplate.convertAndSend("/topic/room/" + code, leaveMsg);

        log.info("Participante '{}' abandonó voluntariamente la sala '{}'", user.getFullName(), code);
    }

    @Transactional
    public void handleStompLeave(String sessionCode, UUID userId, String userName) {
        String code = sessionCode.trim().toUpperCase();
        sessionRepository.findBySessionCode(code).ifPresent(session -> {
            if (session.getHostId().equals(userId)) {
                // Host left: close session
                session.setStatus("ended");
                session.setEndedAt(Instant.now());
                sessionRepository.save(session);
                lockRepository.deleteBySessionId(session.getId());
                participantRepository.deleteBySessionId(session.getId());
                CollabMessageDto endMsg = CollabMessageDto.builder()
                        .type(CollabMessageDto.Type.SESSION_ENDED)
                        .senderId(userId)
                        .senderName(userName)
                        .sessionCode(code)
                        .timestamp(System.currentTimeMillis())
                        .payload("La sesión colaborativa ha sido finalizada por el anfitrión.")
                        .build();
                messagingTemplate.convertAndSend("/topic/room/" + code, endMsg);
            } else {
                lockRepository.deleteBySessionIdAndLockedBy(session.getId(), userId);
                participantRepository.deleteBySessionIdAndUserId(session.getId(), userId);

                CollabMessageDto leaveMsg = CollabMessageDto.builder()
                        .type(CollabMessageDto.Type.LEAVE)
                        .senderId(userId)
                        .senderName(userName)
                        .sessionCode(code)
                        .timestamp(System.currentTimeMillis())
                        .payload(Map.of("leftUserId", userId.toString()))
                        .build();
                messagingTemplate.convertAndSend("/topic/room/" + code, leaveMsg);
                log.info("Participante '{}' desconectado de la sala '{}' vía STOMP", userName, code);
            }
        });
    }

    @Transactional
    public void toggleGuestAccess(String sessionCode, boolean allowGuests, String hostEmail) {
        String code = sessionCode.trim().toUpperCase();
        CollaborationSession session = sessionRepository.findBySessionCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Sala no encontrada: " + code));

        UserProfile host = resolveUser(hostEmail);
        if (!session.getHostId().equals(host.getId())) {
            throw new IllegalArgumentException("Solo el Arquitecto anfitrión puede alternar el acceso a la sala.");
        }

        session.setStatus(allowGuests ? "active" : "paused");
        sessionRepository.save(session);

        CollabMessageDto statusMsg = CollabMessageDto.builder()
                .type(CollabMessageDto.Type.STANDBY_STATE)
                .senderId(host.getId())
                .senderName(host.getFullName())
                .sessionCode(code)
                .timestamp(System.currentTimeMillis())
                .payload(Map.of("status", session.getStatus(), "allowGuests", allowGuests))
                .build();
        messagingTemplate.convertAndSend("/topic/room/" + code, statusMsg);

        log.info("Host '{}' alternó el acceso de la sala '{}' a '{}'", host.getFullName(), code, session.getStatus());
    }

    private String generateUniqueSessionCode() {
        for (int i = 0; i < 50; i++) {
            StringBuilder sb = new StringBuilder("SW1-");
            for (int j = 0; j < 3; j++) {
                sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            String candidate = sb.toString();
            if (sessionRepository.findBySessionCode(candidate).isEmpty()) {
                return candidate;
            }
        }
        return "SW1-" + System.currentTimeMillis() % 1000;
    }

    private UserProfile resolveUser(String email) {
        return userProfileRepository.findByEmailIgnoreCase(email)
                .or(() -> userProfileRepository.findByUsernameIgnoreCase(email))
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con identificador: " + email));
    }
}
