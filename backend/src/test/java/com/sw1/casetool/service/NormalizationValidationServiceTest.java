package com.sw1.casetool.service;

import com.sw1.casetool.dto.normalization.*;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NormalizationValidationServiceTest {

    @Mock
    private DiagramProjectRepository projectRepository;

    @Mock
    private ClassNodeRepository classNodeRepository;

    @Mock
    private RelationshipRepository relationshipRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private NormalizationValidationService validationService;

    private UUID projectId;
    private DiagramProject project;

    @BeforeEach
    void setUp() {
        projectId = UUID.randomUUID();
        project = DiagramProject.builder()
                .id(projectId)
                .name("Sistema de Pruebas")
                .build();
    }

    @Test
    @DisplayName("1NF: Entidad sin clave primaria debe arrojar violación CRITICAL (1NF_NO_PK)")
    void test1NF_EntityWithoutPrimaryKey_ProducesCriticalIssue() {
        ClassNode node = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Cliente")
                .attributes(List.of(
                        Map.of("name", "nombre", "type", "String", "isId", false),
                        Map.of("name", "email", "type", "String", "isId", false)
                ))
                .build();

        NormalizationReportDto report = validationService.analyze(List.of(node), Collections.emptyList());

        assertNotNull(report);
        assertEquals("NON_COMPLIANT", report.getStatus());
        assertTrue(report.getScore() <= 85);
        assertEquals(1, report.getCriticalIssuesCount());

        NormalizationIssueDto issue = report.getIssues().stream()
                .filter(i -> "1NF_NO_PK".equals(i.getRuleId()))
                .findFirst()
                .orElse(null);

        assertNotNull(issue);
        assertEquals(NormalForm.NF1, issue.getNormalForm());
        assertEquals(NormalizationSeverity.CRITICAL, issue.getSeverity());
        assertTrue(issue.isQuickFixAvailable());
    }

    @Test
    @DisplayName("1NF: Atributo multivaluado o tipo lista debe arrojar advertencia WARNING (1NF_MULTIVALUED_ATTRIBUTE)")
    void test1NF_EntityWithMultivaluedAttribute_ProducesWarning() {
        ClassNode node = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Usuario")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "telefonos", "type", "List<String>", "isId", false)
                ))
                .build();

        NormalizationReportDto report = validationService.analyze(List.of(node), Collections.emptyList());

        assertNotNull(report);
        assertTrue(report.getWarningIssuesCount() >= 1);

        boolean hasMultiValuedIssue = report.getIssues().stream()
                .anyMatch(i -> "1NF_MULTIVALUED_ATTRIBUTE".equals(i.getRuleId()));
        assertTrue(hasMultiValuedIssue);
    }

    @Test
    @DisplayName("1NF: Atributos repetitivos numerados (tel1, tel2) deben arrojar advertencia (1NF_REPEATING_GROUP)")
    void test1NF_EntityWithNumberedRepeatingGroups_ProducesWarning() {
        ClassNode node = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Proveedor")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "telefono1", "type", "String", "isId", false),
                        Map.of("name", "telefono2", "type", "String", "isId", false)
                ))
                .build();

        NormalizationReportDto report = validationService.analyze(List.of(node), Collections.emptyList());

        assertNotNull(report);
        boolean hasRepeatingGroup = report.getIssues().stream()
                .anyMatch(i -> "1NF_REPEATING_GROUP".equals(i.getRuleId()));
        assertTrue(hasRepeatingGroup);
    }

    @Test
    @DisplayName("2NF: Ubicación invertida de clave foránea en lado 1 de 1..* arroja advertencia (2NF_INVERTED_FK)")
    void test2NF_InvertedForeignKey_ProducesWarning() {
        ClassNode cliente = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Cliente")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "pedido_id", "type", "Long", "isId", false) // Inverted FK!
                ))
                .build();

        ClassNode pedido = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Pedido")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "codigo", "type", "String", "isId", false)
                ))
                .build();

        Relationship rel = Relationship.builder()
                .id(UUID.randomUUID())
                .sourceClass(cliente)
                .targetClass(pedido)
                .type("association")
                .sourceCardinality("1")
                .targetCardinality("*")
                .build();

        NormalizationReportDto report = validationService.analyze(List.of(cliente, pedido), List.of(rel));

        assertNotNull(report);
        boolean hasInvertedFk = report.getIssues().stream()
                .anyMatch(i -> "2NF_INVERTED_FK".equals(i.getRuleId()));
        assertTrue(hasInvertedFk);
    }

    @Test
    @DisplayName("3NF: Relación directa muchos a muchos (*..*) sin tabla intermedia arroja CRITICAL (3NF_MANY_TO_MANY)")
    void test3NF_DirectManyToMany_ProducesCriticalIssue() {
        ClassNode estudiante = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Estudiante")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "nombre", "type", "String", "isId", false)
                ))
                .build();

        ClassNode curso = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Curso")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "titulo", "type", "String", "isId", false)
                ))
                .build();

        Relationship rel = Relationship.builder()
                .id(UUID.randomUUID())
                .sourceClass(estudiante)
                .targetClass(curso)
                .type("association")
                .sourceCardinality("*")
                .targetCardinality("*") // *..* Direct many to many!
                .build();

        NormalizationReportDto report = validationService.analyze(List.of(estudiante, curso), List.of(rel));

        assertNotNull(report);
        assertEquals("NON_COMPLIANT", report.getStatus());
        assertTrue(report.getCriticalIssuesCount() >= 1);

        NormalizationIssueDto m2mIssue = report.getIssues().stream()
                .filter(i -> "3NF_MANY_TO_MANY".equals(i.getRuleId()))
                .findFirst()
                .orElse(null);

        assertNotNull(m2mIssue);
        assertEquals(NormalForm.NF3, m2mIssue.getNormalForm());
        assertEquals(NormalizationSeverity.CRITICAL, m2mIssue.getSeverity());
        assertTrue(m2mIssue.isQuickFixAvailable());
    }

    @Test
    @DisplayName("3NF: Dependencia transitiva con atributos descriptivos de otra entidad arroja advertencia (3NF_TRANSITIVE_DEPENDENCY)")
    void test3NF_TransitiveDependency_ProducesWarning() {
        ClassNode depto = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Departamento")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "nombre", "type", "String", "isId", false)
                ))
                .build();

        ClassNode empleado = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Empleado")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "departamento_id", "type", "Long", "isId", false), // Allowed FK
                        Map.of("name", "departamento_nombre", "type", "String", "isId", false) // Transitive dependency!
                ))
                .build();

        NormalizationReportDto report = validationService.analyze(List.of(depto, empleado), Collections.emptyList());

        assertNotNull(report);
        boolean hasTransitive = report.getIssues().stream()
                .anyMatch(i -> "3NF_TRANSITIVE_DEPENDENCY".equals(i.getRuleId()));
        assertTrue(hasTransitive);
    }

    @Test
    @DisplayName("3NF: Atributo derivado 'edad' coexistiendo con 'fecha_nacimiento' arroja INFO (3NF_DERIVED_ATTRIBUTE)")
    void test3NF_DerivedAttribute_ProducesInfo() {
        ClassNode persona = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Persona")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "fecha_nacimiento", "type", "LocalDate", "isId", false),
                        Map.of("name", "edad", "type", "Integer", "isId", false)
                ))
                .build();

        NormalizationReportDto report = validationService.analyze(List.of(persona), Collections.emptyList());

        assertNotNull(report);
        boolean hasDerived = report.getIssues().stream()
                .anyMatch(i -> "3NF_DERIVED_ATTRIBUTE".equals(i.getRuleId()));
        assertTrue(hasDerived);
    }

    @Test
    @DisplayName("Modelo 100% Conforme: Clases con PK y relaciones 1..* normales deben obtener Score 100 y status COMPLIANT")
    void testCompliantModel_Score100_StatusCompliant() {
        ClassNode autor = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Autor")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "nombre", "type", "String", "isId", false)
                ))
                .build();

        ClassNode libro = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Libro")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "titulo", "type", "String", "isId", false),
                        Map.of("name", "autor_id", "type", "Long", "isId", false)
                ))
                .build();

        Relationship rel = Relationship.builder()
                .id(UUID.randomUUID())
                .sourceClass(autor)
                .targetClass(libro)
                .type("association")
                .sourceCardinality("1")
                .targetCardinality("*")
                .build();

        NormalizationReportDto report = validationService.analyze(List.of(autor, libro), List.of(rel));

        assertNotNull(report);
        assertEquals(100, report.getScore());
        assertEquals("COMPLIANT", report.getStatus());
        assertEquals(0, report.getCriticalIssuesCount());
        assertEquals(0, report.getWarningIssuesCount());
        assertEquals(0, report.getInfoIssuesCount());
        assertTrue(report.getIssues().isEmpty());
    }

    @Test
    @DisplayName("Validación de Proyecto Persistido: Carga desde repositorio y audita la acción")
    void testValidateProject_Persisted_CallsAuditLog() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(Collections.emptyList());
        when(relationshipRepository.findByProjectId(projectId)).thenReturn(Collections.emptyList());

        UUID actorId = UUID.randomUUID();
        NormalizationReportDto report = validationService.validateProject(projectId, actorId, null);

        assertNotNull(report);
        assertEquals(100, report.getScore());
        verify(auditLogService, times(1)).recordAction(
                eq(actorId),
                eq("NORMALIZATION_AUDITED"),
                eq("diagram_projects"),
                eq(projectId),
                any(),
                any(),
                any()
        );
    }

    @Test
    @DisplayName("1NF: Atributo llamado 'id' sin isId=true no es considerado PK y arroja 1NF_NO_PK")
    void test1NF_AttributeNamedId_WithoutIsIdTrue_FailsPkCheck() {
        ClassNode node = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Cliente")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", false), // Not marked as PK!
                        Map.of("name", "nombre", "type", "String", "isId", false)
                ))
                .build();

        NormalizationReportDto report = validationService.analyze(List.of(node), Collections.emptyList());

        assertNotNull(report);
        boolean hasNoPkIssue = report.getIssues().stream()
                .anyMatch(i -> "1NF_NO_PK".equals(i.getRuleId()));
        assertTrue(hasNoPkIssue, "Debe arrojar 1NF_NO_PK aunque el atributo se llame 'id' si isId no es true");
    }

    @Test
    @DisplayName("1NF: Tipo byte[] / BLOB se considera atómico escalar y no debe arrojar advertencia")
    void test1NF_ByteArrayType_IsConsideredAtomic() {
        ClassNode node = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Documento")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "contenido", "type", "byte[]", "isId", false)
                ))
                .build();

        NormalizationReportDto report = validationService.analyze(List.of(node), Collections.emptyList());

        assertNotNull(report);
        boolean hasMultiValued = report.getIssues().stream()
                .anyMatch(i -> "1NF_MULTIVALUED_ATTRIBUTE".equals(i.getRuleId()));
        assertFalse(hasMultiValued, "byte[] no debe ser penalizado como multivaluado");
    }

    @Test
    @DisplayName("2NF: Atributo que depende de parte de una clave primaria compuesta arroja 2NF_PARTIAL_DEPENDENCY")
    void test2NF_CompositeKey_PartialDependency_ProducesWarning() {
        ClassNode detalle = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("DetalleFactura")
                .attributes(List.of(
                        Map.of("name", "factura_id", "type", "Long", "isId", true),
                        Map.of("name", "producto_id", "type", "Long", "isId", true),
                        Map.of("name", "cantidad", "type", "Integer", "isId", false),
                        Map.of("name", "producto_descripcion", "type", "String", "isId", false) // Depends only on producto_id!
                ))
                .build();

        NormalizationReportDto report = validationService.analyze(List.of(detalle), Collections.emptyList());

        assertNotNull(report);
        boolean hasPartialDep = report.getIssues().stream()
                .anyMatch(i -> "2NF_PARTIAL_DEPENDENCY".equals(i.getRuleId()));
        assertTrue(hasPartialDep, "Debe detectar dependencia parcial sobre producto_id");
    }

    @Test
    @DisplayName("3NF: Dependencia transitiva en formato camelCase (departamentoNombre) arroja 3NF_TRANSITIVE_DEPENDENCY")
    void test3NF_CamelCaseTransitiveDependency_ProducesWarning() {
        ClassNode depto = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Departamento")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "nombre", "type", "String", "isId", false)
                ))
                .build();

        ClassNode empleado = ClassNode.builder()
                .id(UUID.randomUUID())
                .name("Empleado")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isId", true),
                        Map.of("name", "departamentoId", "type", "Long", "isId", false),
                        Map.of("name", "departamentoNombre", "type", "String", "isId", false) // Transitive dependency in camelCase!
                ))
                .build();

        NormalizationReportDto report = validationService.analyze(List.of(depto, empleado), Collections.emptyList());

        assertNotNull(report);
        boolean hasTransitive = report.getIssues().stream()
                .anyMatch(i -> "3NF_TRANSITIVE_DEPENDENCY".equals(i.getRuleId()));
        assertTrue(hasTransitive, "Debe detectar dependencia transitiva en camelCase 'departamentoNombre'");
    }
}
