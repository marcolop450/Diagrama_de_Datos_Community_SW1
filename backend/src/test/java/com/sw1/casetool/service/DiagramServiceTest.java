package com.sw1.casetool.service;

import com.sw1.casetool.dto.ClassNodeRequest;
import com.sw1.casetool.dto.CloneProjectRequest;
import com.sw1.casetool.dto.CreateProjectRequest;
import com.sw1.casetool.dto.ProjectResponse;
import com.sw1.casetool.dto.UpdateProjectRequest;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.model.DomainTemplate;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramHistoryRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.DomainTemplateRepository;
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

    @Mock
    private DiagramHistoryService diagramHistoryService;

    @Mock
    private DiagramHistoryRepository diagramHistoryRepository;

    @Mock
    private DomainTemplateRepository domainTemplateRepository;

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

    @Test
    @DisplayName("CU05-T1: Debe restaurar proyecto de papelera marcando isDeleted=false y registrando historial y auditoría")
    void testRestoreProject_Success() {
        mockProject.setIsDeleted(true);
        when(userProfileRepository.findByEmailIgnoreCase("architect@casetool.com"))
                .thenReturn(Optional.of(mockUser));
        when(projectRepository.findByIdAndIsDeletedTrue(projectId))
                .thenReturn(Optional.of(mockProject));
        when(projectRepository.save(any(DiagramProject.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ProjectResponse response = diagramService.restoreProject(projectId, "architect@casetool.com", "127.0.0.1", "JUnit");

        assertNotNull(response);
        assertFalse(mockProject.getIsDeleted());
        verify(projectRepository, times(1)).save(mockProject);
        verify(auditLogService, times(1)).recordAction(
                eq(userId), eq("PROJECT_RESTORED"), eq("diagram_projects"), eq(projectId), anyString(), anyString(), anyMap()
        );
        verify(diagramHistoryService, times(1)).recordHistory(
                eq(mockProject), eq(userId), eq("PROJECT_RESTORED"), eq("PROJECT"), eq(projectId), anyMap(), anyMap()
        );
    }

    @Test
    @DisplayName("CU05-T2: Debe listar proyectos en la papelera de reciclaje")
    void testGetTrashProjects_Success() {
        mockProject.setIsDeleted(true);
        when(userProfileRepository.findByEmailIgnoreCase("architect@casetool.com"))
                .thenReturn(Optional.of(mockUser));
        when(projectRepository.findByOwnerIdAndIsDeletedTrueOrderByUpdatedAtDesc(userId))
                .thenReturn(List.of(mockProject));

        List<ProjectResponse> trash = diagramService.getTrashProjects("architect@casetool.com");

        assertNotNull(trash);
        assertEquals(1, trash.size());
        assertEquals("Sistema Clinico", trash.get(0).getName());
        assertTrue(trash.get(0).getIsDeleted());
    }

    @Test
    @DisplayName("CU05-T3: Purga definitiva debe eliminar en cascada relaciones, nodos, historial y proyecto")
    void testPurgeProject_Success() {
        mockProject.setIsDeleted(true);
        when(userProfileRepository.findByEmailIgnoreCase("architect@casetool.com"))
                .thenReturn(Optional.of(mockUser));
        when(projectRepository.findByIdAndIsDeletedTrue(projectId))
                .thenReturn(Optional.of(mockProject));

        diagramService.purgeProject(projectId, "architect@casetool.com", "127.0.0.1", "JUnit");

        // Cascada estricta
        verify(relationshipRepository, times(1)).deleteByProjectId(projectId);
        verify(classNodeRepository, times(1)).deleteByProjectId(projectId);
        verify(diagramHistoryRepository, times(1)).deleteByProjectId(projectId);
        verify(projectRepository, times(1)).delete(mockProject);

        // Registro inmutable forense
        verify(auditLogService, times(1)).recordAction(
                eq(userId), eq("PROJECT_PURGED"), eq("diagram_projects"), eq(projectId), anyString(), anyString(), anyMap()
        );
    }

    @Test
    @DisplayName("CU05-T4: Super Admin no puede purgar proyectos (solo restaurar)")
    void testPurgeProject_SuperAdminCannotPurge() {
        mockProject.setIsDeleted(true);
        UserProfile adminUser = UserProfile.builder()
                .id(UUID.randomUUID())
                .email("admin@casetool.com")
                .role("SUPER_ADMIN")
                .build();

        when(userProfileRepository.findByEmailIgnoreCase("admin@casetool.com"))
                .thenReturn(Optional.of(adminUser));
        when(projectRepository.findByIdAndIsDeletedTrue(projectId))
                .thenReturn(Optional.of(mockProject));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                diagramService.purgeProject(projectId, "admin@casetool.com", "127.0.0.1", "JUnit")
        );

        assertTrue(ex.getMessage().contains("El Administrador solo puede supervisar y restaurar"));
        verify(projectRepository, never()).delete(any());
    }

    @Test
    @DisplayName("CU05-T5: Super Admin no puede eliminar proyectos lógicamente (solo restaurar)")
    void testDeleteProject_SuperAdminCannotDelete() {
        UserProfile adminUser = UserProfile.builder()
                .id(UUID.randomUUID())
                .email("admin@casetool.com")
                .role("SUPER_ADMIN")
                .build();

        when(userProfileRepository.findByEmailIgnoreCase("admin@casetool.com"))
                .thenReturn(Optional.of(adminUser));
        when(projectRepository.findByIdAndIsDeletedFalse(projectId))
                .thenReturn(Optional.of(mockProject));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                diagramService.deleteProject(projectId, "admin@casetool.com", "127.0.0.1", "JUnit")
        );

        assertTrue(ex.getMessage().contains("El Administrador solo puede supervisar y restaurar"));
        verify(projectRepository, never()).save(any());
    }

    @Test
    @DisplayName("CU07-T1: Crear proyecto desde plantilla base realiza scaffolding de clases y relaciones")
    void testCreateProject_FromTemplate() {
        CreateProjectRequest request = CreateProjectRequest.builder()
                .name("Proyecto Clinico")
                .description("Modelo desde plantilla clinica")
                .templateId("TEMPLATE_CLINICA")
                .build();

        when(userProfileRepository.findByEmailIgnoreCase(mockUser.getEmail()))
                .thenReturn(Optional.of(mockUser));
        when(projectRepository.save(any(DiagramProject.class)))
                .thenReturn(mockProject);

        Map<String, Object> schema = new HashMap<>();
        schema.put("nodes", List.of(
                Map.of("id", "c1", "name", "Paciente", "attributes", List.of(), "methods", List.of()),
                Map.of("id", "c2", "name", "Medico", "attributes", List.of(), "methods", List.of())
        ));
        schema.put("edges", List.of(
                Map.of("source", "c1", "target", "c2", "type", "association", "sourceCardinality", "1", "targetCardinality", "1..*", "label", "atiende")
        ));

        DomainTemplate template = DomainTemplate.builder()
                .id("TEMPLATE_CLINICA")
                .name("Sistema Clínico")
                .category("Salud")
                .initialSchema(schema)
                .build();

        when(domainTemplateRepository.findById("TEMPLATE_CLINICA"))
                .thenReturn(Optional.of(template));

        ClassNode node1 = ClassNode.builder().id(UUID.randomUUID()).name("Paciente").build();
        ClassNode node2 = ClassNode.builder().id(UUID.randomUUID()).name("Medico").build();
        when(classNodeRepository.save(any(ClassNode.class))).thenReturn(node1, node2);
        when(relationshipRepository.save(any(Relationship.class))).thenAnswer(i -> i.getArgument(0));

        ProjectResponse response = diagramService.createProject(request, mockUser.getEmail(), "127.0.0.1", "JUnit");

        assertNotNull(response);
        assertEquals(mockProject.getName(), response.getName());
        assertEquals(2, response.getNodeCount());
        assertEquals(1, response.getRelationshipCount());

        verify(classNodeRepository, times(2)).save(any(ClassNode.class));
        verify(relationshipRepository, times(1)).save(any(Relationship.class));
        verify(auditLogService, times(1)).recordAction(eq(userId), eq("PROJECT_CREATED_FROM_TEMPLATE"), eq("diagram_projects"), eq(projectId), any(), any(), any());
    }

    @Test
    @DisplayName("CU08-T1: Debe agregar clase UML con visibilidades, atributos, métodos y registrar historial")
    void testAddClassNode_Success() {
        ClassNodeRequest request = new ClassNodeRequest();
        request.setName("Usuario");
        request.setStereotype("entity");
        request.setAbstractClass(false);
        request.setPositionX(100);
        request.setPositionY(120);
        request.setWidth(220);
        request.setHeight(180);
        request.setAttributes(List.of(
                Map.of("name", "id", "type", "UUID", "visibility", "private", "isPrimaryKey", true),
                Map.of("name", "email", "type", "String", "visibility", "private", "isPrimaryKey", false)
        ));
        request.setMethods(List.of(
                Map.of("name", "autenticar", "returnType", "boolean", "visibility", "public", "parameters", List.of(
                        Map.of("name", "token", "type", "String")
                ))
        ));

        when(classNodeRepository.existsByProjectIdAndNameIgnoreCase(projectId, "Usuario")).thenReturn(false);
        when(projectRepository.findByIdAndIsDeletedFalse(projectId)).thenReturn(Optional.of(mockProject));
        when(classNodeRepository.save(any(ClassNode.class))).thenAnswer(i -> {
            ClassNode c = i.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        ClassNode saved = diagramService.addClassNode(projectId, request);

        assertNotNull(saved);
        assertEquals("Usuario", saved.getName());
        assertEquals("entity", saved.getStereotype());
        assertEquals(2, saved.getAttributes().size());
        assertEquals(1, saved.getMethods().size());

        verify(classNodeRepository).save(any(ClassNode.class));
        verify(diagramHistoryService).recordHistory(eq(mockProject), eq(userId), eq("NODE_CREATED"), eq("CLASS_NODE"), any(), isNull(), any());
    }

    @Test
    @DisplayName("CU08-T2: Debe lanzar IllegalArgumentException si el nombre de la clase ya existe en el proyecto (E1)")
    void testAddClassNode_DuplicateName_ThrowsException() {
        ClassNodeRequest request = new ClassNodeRequest();
        request.setName("Usuario");

        when(classNodeRepository.existsByProjectIdAndNameIgnoreCase(projectId, "Usuario")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                diagramService.addClassNode(projectId, request)
        );

        assertTrue(ex.getMessage().contains("Ya existe una clase con el nombre 'Usuario'"));
        verify(classNodeRepository, never()).save(any());
    }

    @Test
    @DisplayName("CU08-T3: Debe lanzar IllegalArgumentException si al actualizar se usa el nombre de otra clase (E1)")
    void testUpdateClassNode_DuplicateName_ThrowsException() {
        UUID classId = UUID.randomUUID();
        ClassNode existing = ClassNode.builder()
                .id(classId)
                .project(mockProject)
                .name("Persona")
                .build();

        ClassNodeRequest request = new ClassNodeRequest();
        request.setName("Cliente"); // Nombre que ya usa otra clase

        when(classNodeRepository.findById(classId)).thenReturn(Optional.of(existing));
        when(classNodeRepository.existsByProjectIdAndNameIgnoreCaseAndIdNot(projectId, "Cliente", classId)).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                diagramService.updateClassNode(projectId, classId, request)
        );

        assertTrue(ex.getMessage().contains("Ya existe otra clase con el nombre 'Cliente'"));
        verify(classNodeRepository, never()).save(any());
    }

    @Test
    @DisplayName("CU08-T4: Debe clonar clase con sufijo 'Copia', desplazamiento (+48, +48) y nuevos IDs de miembros")
    void testCloneClassNode_Success() {
        UUID originalId = UUID.randomUUID();
        ClassNode original = ClassNode.builder()
                .id(originalId)
                .project(mockProject)
                .name("Factura")
                .stereotype("entity")
                .abstractClass(false)
                .positionX(200)
                .positionY(150)
                .width(220)
                .height(180)
                .attributes(new ArrayList<>(List.of(
                        new HashMap<>(Map.of("id", "a1", "name", "total", "type", "BigDecimal", "visibility", "private"))
                )))
                .methods(new ArrayList<>(List.of(
                        new HashMap<>(Map.of("id", "m1", "name", "calcularTotal", "returnType", "void", "visibility", "public"))
                )))
                .build();

        when(classNodeRepository.findById(originalId)).thenReturn(Optional.of(original));
        when(classNodeRepository.existsByProjectIdAndNameIgnoreCase(projectId, "FacturaCopia")).thenReturn(false);
        when(classNodeRepository.save(any(ClassNode.class))).thenAnswer(i -> {
            ClassNode c = i.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        ClassNode cloned = diagramService.cloneClassNode(projectId, originalId);

        assertNotNull(cloned);
        assertEquals("FacturaCopia", cloned.getName());
        assertEquals(248, cloned.getPositionX());
        assertEquals(198, cloned.getPositionY());
        assertEquals(1, cloned.getAttributes().size());
        assertNotEquals("a1", cloned.getAttributes().get(0).get("id"));
        assertEquals(1, cloned.getMethods().size());
        assertNotEquals("m1", cloned.getMethods().get(0).get("id"));

        verify(classNodeRepository).save(any(ClassNode.class));
        verify(diagramHistoryService).recordHistory(eq(mockProject), eq(userId), eq("NODE_CLONED"), eq("CLASS_NODE"), any(), any(), any());
    }
}
