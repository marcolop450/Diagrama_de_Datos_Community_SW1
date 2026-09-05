package com.sw1.casetool.service;

import com.sw1.casetool.dto.CloneProjectRequest;
import com.sw1.casetool.dto.CreateProjectRequest;
import com.sw1.casetool.dto.ProjectResponse;
import com.sw1.casetool.dto.UpdateProjectRequest;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DiagramServiceTest {

    @Mock
    private DiagramProjectRepository projectRepository;

    @Mock
    private ClassNodeRepository classNodeRepository;

    @Mock
    private RelationshipRepository relationshipRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private DiagramService diagramService;

    private UserProfile mockUser;
    private DiagramProject mockProject;
    private UUID userId;
    private UUID projectId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        projectId = UUID.randomUUID();

        mockUser = UserProfile.builder()
                .id(userId)
                .email("architect@casetool.com")
                .fullName("Arquitecto Test")
                .role("ARQUITECTO")
                .build();

        mockProject = DiagramProject.builder()
                .id(projectId)
                .name("Sistema Clinico")
                .description("Diagrama de clases hospitalario")
                .version("v1.0.0")
                .tags(new ArrayList<>(List.of("Salud", "Clinica")))
                .ownerId(userId)
                .isDeleted(false)
                .metadata(new HashMap<>())
                .build();
    }

    @Test
    @DisplayName("CU03-T1: Debe crear proyecto con metadatos, tags y registrar auditoría")
    void testCreateProject_Success() {
        when(userProfileRepository.findByEmailIgnoreCase("architect@casetool.com"))
                .thenReturn(Optional.of(mockUser));
        when(projectRepository.save(any(DiagramProject.class)))
                .thenAnswer(inv -> {
                    DiagramProject p = inv.getArgument(0);
                    p.setId(projectId);
                    return p;
                });

        CreateProjectRequest request = CreateProjectRequest.builder()
                .name("Sistema Clinico")
                .description("Diagrama de clases hospitalario")
                .version("v1.0.0")
                .tags(List.of("Salud", "Clinica"))
                .build();

        ProjectResponse response = diagramService.createProject(request, "architect@casetool.com", "127.0.0.1", "JUnit");

        assertNotNull(response);
        assertEquals("Sistema Clinico", response.getName());
        assertEquals("v1.0.0", response.getVersion());
        assertEquals(2, response.getTags().size());
        assertEquals(userId, response.getOwnerId());

        verify(auditLogService, times(1)).recordAction(
                eq(userId), eq("PROJECT_CREATED"), eq("diagram_projects"), eq(projectId), anyString(), anyString(), anyMap()
        );
    }

    @Test
    @DisplayName("CU03-T2: Clonación profunda debe re-vincular relaciones a los nuevos nodos clonados")
    void testCloneProject_DeepCopy_Success() {
        when(userProfileRepository.findByEmailIgnoreCase("architect@casetool.com"))
                .thenReturn(Optional.of(mockUser));
        when(projectRepository.findByIdAndIsDeletedFalse(projectId))
                .thenReturn(Optional.of(mockProject));

        UUID clonedProjectId = UUID.randomUUID();
        when(projectRepository.save(any(DiagramProject.class)))
                .thenAnswer(inv -> {
                    DiagramProject p = inv.getArgument(0);
                    p.setId(clonedProjectId);
                    return p;
                });

        // 2 Nodos originales
        UUID node1Id = UUID.randomUUID();
        UUID node2Id = UUID.randomUUID();

        ClassNode node1 = ClassNode.builder()
                .id(node1Id)
                .name("Paciente")
                .project(mockProject)
                .build();

        ClassNode node2 = ClassNode.builder()
                .id(node2Id)
                .name("HistorialMedico")
                .project(mockProject)
                .build();

        when(classNodeRepository.findByProjectId(projectId))
                .thenReturn(List.of(node1, node2));

        // Mock para guardar nodos clonados
        when(classNodeRepository.save(any(ClassNode.class)))
                .thenAnswer(inv -> {
                    ClassNode n = inv.getArgument(0);
                    n.setId(UUID.randomUUID());
                    return n;
                });

        // 1 Relación original entre Paciente e HistorialMedico
        Relationship rel = Relationship.builder()
                .id(UUID.randomUUID())
                .project(mockProject)
                .sourceClass(node1)
                .targetClass(node2)
                .type("COMPOSITION")
                .sourceCardinality("1")
                .targetCardinality("1..*")
                .build();

        when(relationshipRepository.findByProjectId(projectId))
                .thenReturn(List.of(rel));

        CloneProjectRequest cloneReq = CloneProjectRequest.builder()
                .newName("Sistema Clinico (Copia)")
                .build();

        ProjectResponse clonedResponse = diagramService.cloneProject(
                projectId, cloneReq, "architect@casetool.com", "127.0.0.1", "JUnit"
        );

        assertNotNull(clonedResponse);
        assertEquals("Sistema Clinico (Copia)", clonedResponse.getName());
        assertEquals(projectId, clonedResponse.getClonedFromId());

        // Verificaciones de clonación
        verify(classNodeRepository, times(2)).save(any(ClassNode.class));
        verify(relationshipRepository, times(1)).save(argThat(savedRel -> {
            // Verificar que la relación clonada NO apunta a los nodos originales
            assertNotEquals(node1Id, savedRel.getSourceClass().getId());
            assertNotEquals(node2Id, savedRel.getTargetClass().getId());
            assertEquals("COMPOSITION", savedRel.getType());
            return true;
        }));

        verify(auditLogService, times(1)).recordAction(
                eq(userId), eq("PROJECT_CLONED"), eq("diagram_projects"), eq(clonedProjectId), anyString(), anyString(), anyMap()
        );
    }

    @Test
    @DisplayName("CU03-T3: Borrado lógico debe marcar isDeleted=true sin eliminar registro físico")
    void testDeleteProject_SoftDelete_Success() {
        when(userProfileRepository.findByEmailIgnoreCase("architect@casetool.com"))
                .thenReturn(Optional.of(mockUser));
        when(projectRepository.findByIdAndIsDeletedFalse(projectId))
                .thenReturn(Optional.of(mockProject));

        diagramService.deleteProject(projectId, "architect@casetool.com", "127.0.0.1", "JUnit");

        assertTrue(mockProject.getIsDeleted());
        verify(projectRepository, times(1)).save(mockProject);
        verify(projectRepository, never()).deleteById(any());

        verify(auditLogService, times(1)).recordAction(
                eq(userId), eq("PROJECT_DELETED"), eq("diagram_projects"), eq(projectId), anyString(), anyString(), anyMap()
        );
    }

    @Test
    @DisplayName("CU03-T4: Prevención IDOR - No permitir mutación si el usuario no es propietario ni SUPER_ADMIN")
    void testOwnershipValidation_DeniesUnauthorizedUser() {
        UUID otherUserId = UUID.randomUUID();
        UserProfile unauthorizedUser = UserProfile.builder()
                .id(otherUserId)
                .email("other@casetool.com")
                .role("COLABORADOR")
                .build();

        when(userProfileRepository.findByEmailIgnoreCase("other@casetool.com"))
                .thenReturn(Optional.of(unauthorizedUser));
        when(projectRepository.findByIdAndIsDeletedFalse(projectId))
                .thenReturn(Optional.of(mockProject));

        UpdateProjectRequest updateReq = UpdateProjectRequest.builder()
                .name("Nombre Ilegítimo")
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                diagramService.updateProject(projectId, updateReq, "other@casetool.com", "127.0.0.1", "JUnit")
        );

        verify(projectRepository, never()).save(any());
    }
}
