package com.sw1.casetool.service;

import com.sw1.casetool.dto.history.DiagramHistoryResponse;
import com.sw1.casetool.model.DiagramHistory;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.DiagramHistoryRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DiagramHistoryServiceTest {

    @Mock
    private DiagramHistoryRepository diagramHistoryRepository;

    @Mock
    private DiagramProjectRepository diagramProjectRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @InjectMocks
    private DiagramHistoryService diagramHistoryService;

    private UserProfile mockOwner;
    private DiagramProject mockProject;
    private UUID ownerId;
    private UUID projectId;

    @BeforeEach
    void setUp() {
        ownerId = UUID.randomUUID();
        projectId = UUID.randomUUID();

        mockOwner = UserProfile.builder()
                .id(ownerId)
                .email("architect@casetool.com")
                .fullName("Arquitecto Test")
                .role("ARQUITECTO")
                .avatarUrl("https://avatar.com/arch.png")
                .build();

        mockProject = DiagramProject.builder()
                .id(projectId)
                .name("Sistema Logistico")
                .ownerId(ownerId)
                .isDeleted(false)
                .build();
    }

    @Test
    @DisplayName("CU05-H1: Debe persistir registro de trazabilidad en diagram_history")
    void testRecordHistory_Success() {
        diagramHistoryService.recordHistory(
                mockProject,
                ownerId,
                "PROJECT_CREATED",
                "PROJECT",
                projectId,
                null,
                Map.of("name", "Sistema Logistico")
        );

        verify(diagramHistoryRepository, times(1)).saveAndFlush(argThat(h -> {
            assertNotNull(h.getId());
            assertEquals(mockProject, h.getProject());
            assertEquals(ownerId, h.getUserId());
            assertEquals("PROJECT_CREATED", h.getActionType());
            assertEquals("PROJECT", h.getEntityType());
            assertEquals(projectId, h.getEntityId());
            assertNotNull(h.getCreatedAt());
            return true;
        }));
    }

    @Test
    @DisplayName("CU05-H2: Debe retornar timeline con enriquecimiento de perfil de usuario y traducciones al español")
    void testGetProjectHistory_Success() {
        when(userProfileRepository.findByEmailIgnoreCase("architect@casetool.com"))
                .thenReturn(Optional.of(mockOwner));
        when(diagramProjectRepository.findById(projectId))
                .thenReturn(Optional.of(mockProject));

        DiagramHistory entry = DiagramHistory.builder()
                .id(UUID.randomUUID())
                .project(mockProject)
                .userId(ownerId)
                .actionType("NODE_CREATED")
                .entityType("CLASS_NODE")
                .entityId(UUID.randomUUID())
                .beforeState(null)
                .afterState(Map.of("name", "Vehiculo"))
                .createdAt(Instant.now())
                .build();

        when(diagramHistoryRepository.findByProjectIdOrderByCreatedAtDesc(projectId))
                .thenReturn(List.of(entry));
        when(userProfileRepository.findAllById(anySet()))
                .thenReturn(List.of(mockOwner));

        List<DiagramHistoryResponse> responses = diagramHistoryService.getProjectHistory(projectId, "architect@casetool.com");

        assertNotNull(responses);
        assertEquals(1, responses.size());
        DiagramHistoryResponse res = responses.get(0);
        assertEquals("Clase Agregada", res.getActionLabelSpanish());
        assertEquals("Arquitecto Test", res.getUserFullName());
        assertEquals("architect@casetool.com", res.getUserEmail());
        assertEquals("ARQUITECTO", res.getUserRole());
        assertEquals("https://avatar.com/arch.png", res.getUserAvatarUrl());
    }

    @Test
    @DisplayName("CU05-H3: Debe denegar consulta de trazabilidad si el usuario no es propietario ni SUPER_ADMIN")
    void testGetProjectHistory_AccessDenied() {
        UUID strangerId = UUID.randomUUID();
        UserProfile stranger = UserProfile.builder()
                .id(strangerId)
                .email("stranger@casetool.com")
                .role("COLABORADOR")
                .build();

        when(userProfileRepository.findByEmailIgnoreCase("stranger@casetool.com"))
                .thenReturn(Optional.of(stranger));
        when(diagramProjectRepository.findById(projectId))
                .thenReturn(Optional.of(mockProject));

        assertThrows(AccessDeniedException.class, () ->
                diagramHistoryService.getProjectHistory(projectId, "stranger@casetool.com")
        );

        verify(diagramHistoryRepository, never()).findByProjectIdOrderByCreatedAtDesc(any());
    }

    @Test
    @DisplayName("CU05-H4: Debe formatear correctamente las etiquetas de acción en español")
    void testFormatActionLabelSpanish() {
        assertEquals("Proyecto Creado", diagramHistoryService.formatActionLabelSpanish("PROJECT_CREATED"));
        assertEquals("Proyecto Actualizado", diagramHistoryService.formatActionLabelSpanish("PROJECT_UPDATED"));
        assertEquals("Proyecto Eliminado", diagramHistoryService.formatActionLabelSpanish("PROJECT_DELETED"));
        assertEquals("Proyecto Restaurado", diagramHistoryService.formatActionLabelSpanish("PROJECT_RESTORED"));
        assertEquals("Proyecto Clonado", diagramHistoryService.formatActionLabelSpanish("PROJECT_CLONED"));
        assertEquals("Clase Agregada", diagramHistoryService.formatActionLabelSpanish("NODE_CREATED"));
        assertEquals("Clase Agregada", diagramHistoryService.formatActionLabelSpanish("CLASS_CREATED"));
        assertEquals("Clase Modificada", diagramHistoryService.formatActionLabelSpanish("NODE_UPDATED"));
        assertEquals("Clase Eliminada", diagramHistoryService.formatActionLabelSpanish("NODE_DELETED"));
        assertEquals("Relación Creada", diagramHistoryService.formatActionLabelSpanish("RELATIONSHIP_CREATED"));
        assertEquals("Relación Modificada", diagramHistoryService.formatActionLabelSpanish("RELATIONSHIP_UPDATED"));
        assertEquals("Relación Eliminada", diagramHistoryService.formatActionLabelSpanish("RELATIONSHIP_DELETED"));
        assertEquals("Colaborador Conectado", diagramHistoryService.formatActionLabelSpanish("COLLABORATOR_JOINED"));
    }
}
