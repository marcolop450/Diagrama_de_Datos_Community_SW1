package com.sw1.casetool.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.collab.ContinuousSessionResumeResponse;
import com.sw1.casetool.dto.collab.ContinuousSessionSaveRequest;
import com.sw1.casetool.dto.collab.ContinuousSessionSnapshotDto;
import com.sw1.casetool.model.CollaborationSession;
import com.sw1.casetool.model.DiagramProject;
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
import com.sw1.casetool.service.collab.ContinuousSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContinuousSessionServiceTest {

    @Mock
    private CollabSessionSnapshotRepository mongoSnapshotRepository;

    @Mock
    private SessionSnapshotFallbackRepository postgresFallbackRepository;

    @Mock
    private CollaborationSessionRepository sessionRepository;

    @Mock
    private SessionParticipantRepository participantRepository;

    @Mock
    private DiagramProjectRepository projectRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private com.sw1.casetool.service.notification.PushNotificationService pushNotificationService;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

    private ContinuousSessionService continuousSessionService;

    private final UUID sampleProjectId = UUID.randomUUID();
    private final UUID sampleHostId = UUID.randomUUID();
    private final String sampleRoomCode = "SW1-902";

    private DiagramProject sampleProject;
    private CollaborationSession sampleSession;
    private UserProfile sampleHost;

    @BeforeEach
    void setUp() {
        continuousSessionService = new ContinuousSessionService(
                mongoSnapshotRepository,
                postgresFallbackRepository,
                sessionRepository,
                participantRepository,
                projectRepository,
                userProfileRepository,
                auditLogService,
                messagingTemplate,
                objectMapper,
                pushNotificationService
        );

        sampleProject = DiagramProject.builder()
                .id(sampleProjectId)
                .name("Sistema Hospitalario")
                .ownerId(sampleHostId)
                .build();

        sampleSession = CollaborationSession.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .hostId(sampleHostId)
                .sessionCode(sampleRoomCode)
                .status("active")
                .startedAt(Instant.now().minusSeconds(600))
                .build();

        sampleHost = UserProfile.builder()
                .id(sampleHostId)
                .fullName("Arq. Marco Host")
                .username("marco_host")
                .email("host@uagrm.edu.bo")
                .role("ARQUITECTO")
                .build();
    }

    @Test
    @DisplayName("CU16-T01: Guardar instantánea continua exitosamente en MongoDB Atlas")
    void testSaveContinuousSession_MongoSuccess() {
        when(sessionRepository.findBySessionCode(sampleRoomCode)).thenReturn(Optional.of(sampleSession));
        when(userProfileRepository.findById(sampleHostId)).thenReturn(Optional.of(sampleHost));
        when(participantRepository.findBySessionId(any())).thenReturn(Collections.emptyList());

        CollabSessionSnapshotDocument savedDoc = CollabSessionSnapshotDocument.builder()
                .id("mongo-obj-12345")
                .sessionCode(sampleRoomCode)
                .projectId(sampleProjectId.toString())
                .projectName(sampleProject.getName())
                .hostId(sampleHostId.toString())
                .hostName(sampleHost.getFullName())
                .status("SUSPENDED")
                .persistenceSource("MONGODB_ATLAS")
                .build();

        when(mongoSnapshotRepository.save(any(CollabSessionSnapshotDocument.class))).thenReturn(savedDoc);

        ContinuousSessionSaveRequest req = ContinuousSessionSaveRequest.builder()
                .sessionCode(sampleRoomCode)
                .projectId(sampleProjectId)
                .projectName(sampleProject.getName())
                .nodes(List.of(Map.of("id", "c1", "name", "Paciente")))
                .edges(List.of(Map.of("id", "e1", "source", "c1", "target", "c2")))
                .chatHistory(List.of(Map.of("id", "m1", "text", "Hola equipo")))
                .normalizationScore(95)
                .normalizationLevel("3NF")
                .build();

        ContinuousSessionSnapshotDto result = continuousSessionService.saveContinuousSession(sampleRoomCode, sampleHostId, req);

        assertNotNull(result);
        assertEquals(sampleRoomCode, result.getSessionCode());
        assertEquals("SUSPENDED", result.getStatus());
        assertEquals("MONGODB_ATLAS", result.getPersistenceSource());
        assertEquals(1, result.getNodesCount());
        assertEquals(1, result.getEdgesCount());
        assertEquals(1, result.getChatMessagesCount());
        assertEquals("suspended", sampleSession.getStatus());

        verify(mongoSnapshotRepository, times(1)).save(any());
        verify(postgresFallbackRepository, never()).save(any());
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/room/" + sampleRoomCode), any(Object.class));
    }

    @Test
    @DisplayName("CU16-T02: Fallback automático a PostgreSQL cuando MongoDB Atlas arroja excepción de red")
    void testSaveContinuousSession_MongoFails_FallbackToPostgres() {
        when(sessionRepository.findBySessionCode(sampleRoomCode)).thenReturn(Optional.of(sampleSession));
        when(userProfileRepository.findById(sampleHostId)).thenReturn(Optional.of(sampleHost));
        when(participantRepository.findBySessionId(any())).thenReturn(Collections.emptyList());

        // Simular error de conexión con MongoDB Atlas
        when(mongoSnapshotRepository.save(any(CollabSessionSnapshotDocument.class)))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("Timeout al conectar con clúster MongoDB Atlas"));

        SessionSnapshotFallback savedFallback = SessionSnapshotFallback.builder()
                .id(UUID.randomUUID())
                .sessionCode(sampleRoomCode)
                .projectId(sampleProjectId)
                .hostId(sampleHostId)
                .status("SUSPENDED")
                .payloadJson("{}")
                .build();

        when(postgresFallbackRepository.save(any(SessionSnapshotFallback.class))).thenReturn(savedFallback);

        ContinuousSessionSaveRequest req = ContinuousSessionSaveRequest.builder()
                .sessionCode(sampleRoomCode)
                .projectId(sampleProjectId)
                .nodes(List.of(Map.of("id", "c1", "name", "Doctor")))
                .chatHistory(List.of())
                .build();

        ContinuousSessionSnapshotDto result = continuousSessionService.saveContinuousSession(sampleRoomCode, sampleHostId, req);

        assertNotNull(result);
        assertEquals("POSTGRES_FALLBACK", result.getPersistenceSource());
        verify(mongoSnapshotRepository, times(1)).save(any());
        verify(postgresFallbackRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("CU16-T03: Reanudación de sesión reactivando el sessionCode y restaurando el grafo y chat")
    void testResumeContinuousSession_Success() {
        CollabSessionSnapshotDocument doc = CollabSessionSnapshotDocument.builder()
                .id("mongo-obj-777")
                .sessionCode(sampleRoomCode)
                .projectId(sampleProjectId.toString())
                .projectName(sampleProject.getName())
                .hostId(sampleHostId.toString())
                .hostName("Arq. Marco Host")
                .status("SUSPENDED")
                .nodes(List.of(Map.of("id", "n1", "name", "ConsultaMedica")))
                .edges(List.of(Map.of("id", "e1", "type", "association")))
                .chatHistory(List.of(Map.of("id", "m1", "text", "Recuerden validar 3NF")))
                .persistenceSource("MONGODB_ATLAS")
                .build();

        when(mongoSnapshotRepository.findTopBySessionCodeOrderBySavedAtDesc(sampleRoomCode)).thenReturn(Optional.of(doc));
        when(sessionRepository.findBySessionCode(sampleRoomCode)).thenReturn(Optional.of(sampleSession));

        ContinuousSessionResumeResponse response = continuousSessionService.resumeContinuousSession(sampleRoomCode, sampleHostId);

        assertNotNull(response);
        assertEquals(sampleRoomCode, response.getSessionCode());
        assertEquals(1, response.getNodes().size());
        assertEquals(1, response.getEdges().size());
        assertEquals(1, response.getChatHistory().size());
        assertEquals("active", sampleSession.getStatus());
        assertNull(sampleSession.getEndedAt());

        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/room/" + sampleRoomCode), any(Object.class));
    }
}
