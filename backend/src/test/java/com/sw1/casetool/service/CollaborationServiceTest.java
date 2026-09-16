package com.sw1.casetool.service;

import com.sw1.casetool.dto.FullDiagramResponse;
import com.sw1.casetool.dto.collab.CollaborationSessionDto;
import com.sw1.casetool.dto.collab.JoinSessionRequest;
import com.sw1.casetool.dto.collab.StartSessionRequest;
import com.sw1.casetool.exception.ResourceNotFoundException;
import com.sw1.casetool.model.*;
import com.sw1.casetool.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CollaborationServiceTest {

    @Mock
    private CollaborationSessionRepository sessionRepository;

    @Mock
    private SessionParticipantRepository participantRepository;

    @Mock
    private ElementLockRepository lockRepository;

    @Mock
    private DiagramProjectRepository projectRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private DiagramService diagramService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private com.sw1.casetool.security.JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private CollaborationService collaborationService;

    private UUID projectId;
    private UUID hostId;
    private UUID sessionId;
    private UserProfile hostUser;
    private DiagramProject project;
    private CollaborationSession activeSession;

    @BeforeEach
    void setUp() {
        projectId = UUID.randomUUID();
        hostId = UUID.randomUUID();
        sessionId = UUID.randomUUID();

        hostUser = UserProfile.builder()
                .id(hostId)
                .userId(hostId)
                .fullName("Arq. Marco Host")
                .username("marco_host")
                .email("host@casetool.local")
                .role("ARQUITECTO")
                .build();

        project = DiagramProject.builder()
                .id(projectId)
                .name("Sistema Academico")
                .ownerId(hostId)
                .isDeleted(false)
                .build();

        activeSession = CollaborationSession.builder()
                .id(sessionId)
                .project(project)
                .hostId(hostId)
                .sessionCode("SW1-902")
                .status("active")
                .startedAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("CP-CU18-01: Iniciar sesión colaborativa genera código SW1-XXX y registra al Host")
    void testStartSession_Success() {
        when(userProfileRepository.findByEmailIgnoreCase("host@casetool.local")).thenReturn(Optional.of(hostUser));
        when(projectRepository.findByIdAndIsDeletedFalse(projectId)).thenReturn(Optional.of(project));
        when(sessionRepository.findByProjectIdAndStatus(projectId, "active")).thenReturn(Collections.emptyList());
        when(sessionRepository.findBySessionCode(anyString())).thenReturn(Optional.empty());
        when(sessionRepository.save(any(CollaborationSession.class))).thenAnswer(inv -> {
            CollaborationSession s = inv.getArgument(0);
            s.setId(sessionId);
            return s;
        });
        when(userProfileRepository.findById(hostId)).thenReturn(Optional.of(hostUser));
        when(participantRepository.findBySessionId(sessionId)).thenReturn(Collections.emptyList());
        when(lockRepository.findBySessionId(sessionId)).thenReturn(Collections.emptyList());
        when(diagramService.getFullDiagram(projectId)).thenReturn(
                FullDiagramResponse.builder().project(project).classNodes(List.of()).relationships(List.of()).build()
        );

        StartSessionRequest req = new StartSessionRequest(projectId);
        CollaborationSessionDto dto = collaborationService.startSession(req, "host@casetool.local", "127.0.0.1", "JUnit");

        assertNotNull(dto);
        assertTrue(dto.getSessionCode().startsWith("SW1-"));
        assertEquals("active", dto.getStatus());
        assertEquals(projectId, dto.getProjectId());
        assertEquals("Arq. Marco Host", dto.getHostName());

        verify(sessionRepository, times(1)).save(any(CollaborationSession.class));
        verify(participantRepository, times(1)).save(any(SessionParticipant.class));
        verify(auditLogService, times(1)).recordAction(eq(hostId), eq("COLLABORATION_SESSION_STARTED"), anyString(), any(), anyString(), anyString(), anyMap());
    }

    @Test
    @DisplayName("CP-CU18-02: Unirse a sesión colaborativa como usuario registrado emite evento JOIN")
    void testJoinSession_Success_RegisteredUser() {
        when(sessionRepository.findBySessionCode("SW1-902")).thenReturn(Optional.of(activeSession));

        UUID collabUserId = UUID.randomUUID();
        UserProfile collabUser = UserProfile.builder()
                .id(collabUserId)
                .userId(collabUserId)
                .fullName("Carlos Perez")
                .username("carlos_perez")
                .email("carlos@casetool.local")
                .role("COLABORADOR")
                .subscriptionPlan("COMMUNITY")
                .build();

        when(userProfileRepository.findByEmailIgnoreCase("carlos@casetool.local")).thenReturn(Optional.of(collabUser));
        when(participantRepository.findBySessionId(sessionId)).thenReturn(Collections.emptyList());
        when(userProfileRepository.findById(hostId)).thenReturn(Optional.of(hostUser));
        when(diagramService.getFullDiagram(projectId)).thenReturn(
                FullDiagramResponse.builder().project(project).classNodes(List.of()).relationships(List.of()).build()
        );
        when(jwtTokenProvider.generateToken(any(), any(), any(), any(), any())).thenReturn("mock-jwt-token-12345");

        JoinSessionRequest req = new JoinSessionRequest("SW1-902", "carlos_perez", "Carlos Perez");
        CollaborationSessionDto dto = collaborationService.joinSession(req, "carlos@casetool.local", "127.0.0.1", "JUnit");

        assertNotNull(dto);
        assertEquals("SW1-902", dto.getSessionCode());
        assertEquals("mock-jwt-token-12345", dto.getToken());
        assertNotNull(dto.getUserSession());
        verify(participantRepository, times(1)).save(any(SessionParticipant.class));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/room/SW1-902"), any(Object.class));
    }

    @Test
    @DisplayName("CP-CU18-02b: Super Admin no puede unirse a modelar colaborativamente")
    void testJoinSession_SuperAdmin_ThrowsException() {
        when(sessionRepository.findBySessionCode("SW1-902")).thenReturn(Optional.of(activeSession));

        UserProfile adminUser = UserProfile.builder()
                .id(UUID.randomUUID())
                .fullName("Admin Principal")
                .username("admin")
                .email("admin@casetool.local")
                .role("SUPER_ADMIN")
                .build();

        when(userProfileRepository.findByEmailIgnoreCase("admin@casetool.local")).thenReturn(Optional.of(adminUser));

        JoinSessionRequest req = new JoinSessionRequest("SW1-902", "admin", "Admin Principal");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                collaborationService.joinSession(req, "admin@casetool.local", "127.0.0.1", "JUnit")
        );

        assertTrue(ex.getMessage().contains("Los administradores no participan"));
    }

    @Test
    @DisplayName("CP-CU18-03: Excepción E1 cuando el código de sala no existe o está finalizada")
    void testJoinSession_NotFound_ThrowsE1() {
        when(sessionRepository.findBySessionCode("SW1-XYZ")).thenReturn(Optional.empty());

        JoinSessionRequest req = new JoinSessionRequest("SW1-XYZ", "12345678", "Estudiante");

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () ->
                collaborationService.joinSession(req, "user@casetool.local", "127.0.0.1", "JUnit")
        );

        assertTrue(ex.getMessage().contains("Sala no encontrada"));
    }

    @Test
    @DisplayName("CP-CU18-04: Host expulsa a participante de la sala (Kick)")
    void testKickParticipant_Success() {
        when(sessionRepository.findBySessionCode("SW1-902")).thenReturn(Optional.of(activeSession));
        when(userProfileRepository.findByEmailIgnoreCase("host@casetool.local")).thenReturn(Optional.of(hostUser));

        UUID kickedUserId = UUID.randomUUID();
        SessionParticipant participant = SessionParticipant.builder()
                .id(UUID.randomUUID())
                .session(activeSession)
                .userId(kickedUserId)
                .role("editor")
                .build();

        when(participantRepository.findBySessionId(sessionId)).thenReturn(List.of(participant));

        collaborationService.kickParticipant("SW1-902", kickedUserId, "host@casetool.local", "127.0.0.1", "JUnit");

        verify(lockRepository, times(1)).deleteBySessionIdAndLockedBy(sessionId, kickedUserId);
        verify(participantRepository, times(1)).delete(participant);
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/room/SW1-902"), any(Object.class));
        verify(auditLogService, times(1)).recordAction(eq(hostId), eq("COLLABORATION_PARTICIPANT_KICKED"), anyString(), any(), anyString(), anyString(), anyMap());
    }

    @Test
    @DisplayName("CP-CU18-04: Finalizar sesión finaliza la sala y purga los candados")
    void testEndSession_Success() {
        when(sessionRepository.findBySessionCode("SW1-902")).thenReturn(Optional.of(activeSession));
        when(userProfileRepository.findByEmailIgnoreCase("host@casetool.local")).thenReturn(Optional.of(hostUser));

        collaborationService.endSession("SW1-902", "host@casetool.local", "127.0.0.1", "JUnit");

        assertEquals("ended", activeSession.getStatus());
        assertNotNull(activeSession.getEndedAt());
        verify(lockRepository, times(1)).deleteBySessionId(sessionId);
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/room/SW1-902"), any(Object.class));
    }

    @Test
    @DisplayName("CP-CU18-05: Adquirir y liberar candado optimista de nodo UML")
    void testAcquireAndReleaseLock() {
        UUID elementId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        when(sessionRepository.findBySessionCode("SW1-902")).thenReturn(Optional.of(activeSession));
        when(lockRepository.findBySessionIdAndElementId(sessionId, elementId)).thenReturn(Optional.empty());

        boolean acquired = collaborationService.acquireLock("SW1-902", elementId, userId, "Colaborador 1", "#10B981");

        assertTrue(acquired);
        verify(lockRepository, times(1)).save(any(ElementLock.class));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/room/SW1-902"), any(Object.class));

        collaborationService.releaseLock("SW1-902", elementId, userId);
        verify(lockRepository, times(1)).deleteBySessionIdAndElementId(sessionId, elementId);
    }

    @Test
    @DisplayName("CP-CU18-06: Host actualiza el rol de un participante a viewer (Lector)")
    void testUpdateParticipantRole_Success() {
        when(sessionRepository.findBySessionCode("SW1-902")).thenReturn(Optional.of(activeSession));
        when(userProfileRepository.findByEmailIgnoreCase("host@casetool.local")).thenReturn(Optional.of(hostUser));

        UUID participantUserId = UUID.randomUUID();
        SessionParticipant participant = SessionParticipant.builder()
                .id(UUID.randomUUID())
                .session(activeSession)
                .userId(participantUserId)
                .role("editor")
                .build();

        when(participantRepository.findBySessionId(sessionId)).thenReturn(List.of(participant));

        collaborationService.updateParticipantRole("SW1-902", participantUserId, "viewer", "host@casetool.local", "127.0.0.1", "JUnit");

        assertEquals("viewer", participant.getRole());
        verify(participantRepository, times(1)).save(participant);
        verify(lockRepository, times(1)).deleteBySessionIdAndLockedBy(sessionId, participantUserId);
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/room/SW1-902"), any(Object.class));
        verify(auditLogService, times(1)).recordAction(eq(hostId), eq("COLLABORATION_PARTICIPANT_ROLE_CHANGED"), anyString(), any(), anyString(), anyString(), anyMap());
    }

    @Test
    @DisplayName("CP-CU18-07: Usuario no-host no puede cambiar roles de participantes")
    void testUpdateParticipantRole_NotHost_ThrowsException() {
        when(sessionRepository.findBySessionCode("SW1-902")).thenReturn(Optional.of(activeSession));

        UUID nonHostId = UUID.randomUUID();
        UserProfile nonHost = UserProfile.builder().id(nonHostId).fullName("Otro").email("otro@test.com").role("COLABORADOR").build();
        when(userProfileRepository.findByEmailIgnoreCase("otro@test.com")).thenReturn(Optional.of(nonHost));

        UUID participantUserId = UUID.randomUUID();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                collaborationService.updateParticipantRole("SW1-902", participantUserId, "viewer", "otro@test.com", "127.0.0.1", "JUnit")
        );

        assertTrue(ex.getMessage().contains("Solo el Arquitecto anfitrión"));
    }

    @Test
    @DisplayName("CP-CU18-08: Participante con rol viewer no puede adquirir candados de edición")
    void testAcquireLock_Viewer_ReturnsFalse() {
        UUID elementId = UUID.randomUUID();
        UUID viewerUserId = UUID.randomUUID();

        SessionParticipant viewerParticipant = SessionParticipant.builder()
                .id(UUID.randomUUID())
                .session(activeSession)
                .userId(viewerUserId)
                .role("viewer")
                .build();

        when(sessionRepository.findBySessionCode("SW1-902")).thenReturn(Optional.of(activeSession));
        when(participantRepository.findBySessionId(sessionId)).thenReturn(List.of(viewerParticipant));

        boolean acquired = collaborationService.acquireLock("SW1-902", elementId, viewerUserId, "Lector 1", "#64748B");

        assertFalse(acquired);
        verify(lockRepository, never()).save(any(ElementLock.class));
    }

    @Test
    @DisplayName("CP-CU18-09: Colaborador abandona la sala voluntariamente")
    void testLeaveSession_Collaborator_Success() {
        when(sessionRepository.findBySessionCode("SW1-902")).thenReturn(Optional.of(activeSession));
        UUID collabId = UUID.randomUUID();
        UserProfile collab = UserProfile.builder().id(collabId).fullName("Colaborador").email("collab@test.com").role("COLABORADOR").build();
        when(userProfileRepository.findByEmailIgnoreCase("collab@test.com")).thenReturn(Optional.of(collab));

        collaborationService.leaveSession("SW1-902", "collab@test.com");

        verify(lockRepository, times(1)).deleteBySessionIdAndLockedBy(sessionId, collabId);
        verify(participantRepository, times(1)).deleteBySessionIdAndUserId(sessionId, collabId);
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/room/SW1-902"), any(Object.class));
    }

    @Test
    @DisplayName("CP-CU18-10: Host abandona la sala y finaliza la sesión para todos los colaboradores")
    void testLeaveSession_Host_EndsSessionForAll() {
        when(sessionRepository.findBySessionCode("SW1-902")).thenReturn(Optional.of(activeSession));
        when(userProfileRepository.findByEmailIgnoreCase("host@casetool.local")).thenReturn(Optional.of(hostUser));

        collaborationService.leaveSession("SW1-902", "host@casetool.local");

        assertEquals("ended", activeSession.getStatus());
        verify(lockRepository, times(1)).deleteBySessionId(sessionId);
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/room/SW1-902"), any(Object.class));
    }

    @Test
    @DisplayName("CP-CU18-11: Alternar permiso de acceso (pausar sala) y rechazar uniones cuando está pausada")
    void testToggleGuestAccess_AndJoinWhenPaused() {
        when(sessionRepository.findBySessionCode("SW1-902")).thenReturn(Optional.of(activeSession));
        when(userProfileRepository.findByEmailIgnoreCase("host@casetool.local")).thenReturn(Optional.of(hostUser));

        // 1. Pausar acceso por el Host
        collaborationService.toggleGuestAccess("SW1-902", false, "host@casetool.local");
        assertEquals("paused", activeSession.getStatus());
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/room/SW1-902"), any(Object.class));

        // 2. Intento de unirse a sala pausada
        JoinSessionRequest req = new JoinSessionRequest("SW1-902", "12345678", "Colaborador Intento");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                collaborationService.joinSession(req, "collab@casetool.local", "127.0.0.1", "JUnit")
        );
        assertTrue(ex.getMessage().contains("pausado el acceso"));
    }
}
