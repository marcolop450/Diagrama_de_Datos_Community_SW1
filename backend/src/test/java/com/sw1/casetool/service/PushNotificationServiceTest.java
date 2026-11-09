package com.sw1.casetool.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.notification.PushNotificationType;
import com.sw1.casetool.dto.notification.PushTokenRegistrationRequest;
import com.sw1.casetool.model.CollaborationSession;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.SessionParticipant;
import com.sw1.casetool.model.UserPushToken;
import com.sw1.casetool.repository.CollaborationSessionRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.repository.UserPushTokenRepository;
import com.sw1.casetool.service.notification.PushNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PushNotificationServiceTest {

    @Mock
    private UserPushTokenRepository pushTokenRepository;

    @Mock
    private DiagramProjectRepository projectRepository;

    @Mock
    private CollaborationSessionRepository sessionRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private PushNotificationService pushNotificationService;

    private final UUID sampleUserId = UUID.randomUUID();
    private final UUID sampleProjectId = UUID.randomUUID();
    private final String samplePushToken = "ExponentPushToken[AbCdEf123456789]";

    @BeforeEach
    void setUp() {
        pushNotificationService = new PushNotificationService(
                pushTokenRepository,
                projectRepository,
                sessionRepository,
                userProfileRepository,
                objectMapper
        );
    }

    @Test
    @DisplayName("CU18: Registrar un nuevo push token móvil exitosamente")
    void testRegisterPushToken_NewToken() {
        PushTokenRegistrationRequest req = PushTokenRegistrationRequest.builder()
                .pushToken(samplePushToken)
                .deviceType("android")
                .deviceName("Xiaomi Redmi Note 12")
                .build();

        when(pushTokenRepository.findByUserIdAndPushToken(sampleUserId, samplePushToken))
                .thenReturn(Optional.empty());

        when(pushTokenRepository.save(any(UserPushToken.class))).thenAnswer(inv -> {
            UserPushToken t = inv.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });

        UserPushToken saved = pushNotificationService.registerPushToken(sampleUserId, req);

        assertNotNull(saved);
        assertEquals(sampleUserId, saved.getUserId());
        assertEquals(samplePushToken, saved.getPushToken());
        assertTrue(saved.getIsActive());
        verify(pushTokenRepository, times(1)).save(any(UserPushToken.class));
    }

    @Test
    @DisplayName("CU18: Actualizar push token preexistente reactivándolo")
    void testRegisterPushToken_ExistingToken() {
        PushTokenRegistrationRequest req = PushTokenRegistrationRequest.builder()
                .pushToken(samplePushToken)
                .deviceType("ios")
                .deviceName("iPhone 15 Pro")
                .build();

        UserPushToken existing = UserPushToken.builder()
                .id(UUID.randomUUID())
                .userId(sampleUserId)
                .pushToken(samplePushToken)
                .isActive(false)
                .build();

        when(pushTokenRepository.findByUserIdAndPushToken(sampleUserId, samplePushToken))
                .thenReturn(Optional.of(existing));

        when(pushTokenRepository.save(any(UserPushToken.class))).thenReturn(existing);

        UserPushToken updated = pushNotificationService.registerPushToken(sampleUserId, req);

        assertTrue(updated.getIsActive());
        assertEquals("ios", updated.getDeviceType());
        verify(pushTokenRepository, times(1)).save(existing);
    }

    @Test
    @DisplayName("CU18: Desactivar push token al cerrar sesión (Logout)")
    void testDeactivatePushToken_Success() {
        UserPushToken active = UserPushToken.builder()
                .id(UUID.randomUUID())
                .userId(sampleUserId)
                .pushToken(samplePushToken)
                .isActive(true)
                .build();

        when(pushTokenRepository.findByUserIdAndPushToken(sampleUserId, samplePushToken))
                .thenReturn(Optional.of(active));

        pushNotificationService.deactivatePushToken(sampleUserId, samplePushToken);

        assertFalse(active.getIsActive());
        verify(pushTokenRepository, times(1)).save(active);
    }

    @Test
    @DisplayName("CU18: Enviar push a colaboradores de proyecto excluyendo al actor que realizó la acción")
    void testSendPushToProjectCollaborators_ExcludesActor() {
        UUID actorId = UUID.randomUUID();
        UUID collaboratorId = UUID.randomUUID();

        DiagramProject project = DiagramProject.builder()
                .id(sampleProjectId)
                .name("Sistema Académico")
                .ownerId(actorId)
                .build();

        when(projectRepository.findById(sampleProjectId))
                .thenReturn(Optional.of(project));

        UserPushToken tokenActor = UserPushToken.builder()
                .userId(actorId)
                .pushToken("ExponentPushToken[ActorPhone123]")
                .isActive(true)
                .build();

        UserPushToken tokenCollab = UserPushToken.builder()
                .userId(collaboratorId)
                .pushToken("ExponentPushToken[CollabPhone123]")
                .isActive(true)
                .build();

        com.sw1.casetool.model.UserProfile collabUser = com.sw1.casetool.model.UserProfile.builder()
                .id(collaboratorId)
                .role("COLABORADOR")
                .architectId(actorId)
                .build();

        when(userProfileRepository.findByRoleAndArchitectIdOrderByCreatedAtDesc("COLABORADOR", actorId))
                .thenReturn(List.of(collabUser));

        when(pushTokenRepository.findByUserIdInAndIsActiveTrue(anyList()))
                .thenReturn(List.of(tokenCollab));

        assertDoesNotThrow(() -> {
            pushNotificationService.sendPushToProjectCollaborators(
                    sampleProjectId,
                    actorId,
                    PushNotificationType.MODEL_SAVED,
                    "Modelo Guardado",
                    "El arquitecto guardó cambios",
                    Map.of("projectId", sampleProjectId.toString())
            );
        });

        verify(pushTokenRepository, times(1)).findByUserIdInAndIsActiveTrue(anyList());
    }
}
