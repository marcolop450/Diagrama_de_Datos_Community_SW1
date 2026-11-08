package com.sw1.casetool.service;

import com.sw1.casetool.dto.generator.MultiSqlDdlRequest;
import com.sw1.casetool.dto.generator.MultiSqlDdlResponse;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.service.AuditLogService;
import com.sw1.casetool.service.generator.MultiSqlDdlGeneratorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MultiSqlDdlGeneratorServiceTest {

    @Mock
    private DiagramProjectRepository projectRepository;

    @Mock
    private ClassNodeRepository classNodeRepository;

    @Mock
    private RelationshipRepository relationshipRepository;

    @Mock
    private AuditLogService auditLogService;

    private MultiSqlDdlGeneratorService generatorService;

    private final UUID sampleProjectId = UUID.randomUUID();
    private DiagramProject sampleProject;
    private ClassNode clienteNode;
    private ClassNode facturaNode;

    @BeforeEach
    void setUp() {
        generatorService = new MultiSqlDdlGeneratorService(
                projectRepository,
                classNodeRepository,
                relationshipRepository,
                auditLogService
        );

        sampleProject = DiagramProject.builder()
                .id(sampleProjectId)
                .name("E-Commerce Facturación")
                .build();

        clienteNode = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("Cliente")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isPrimaryKey", true),
                        Map.of("name", "nombre", "type", "String", "isNotNull", true),
                        Map.of("name", "activo", "type", "Boolean")
                ))
                .build();

        facturaNode = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("Factura")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isPrimaryKey", true),
                        Map.of("name", "total", "type", "BigDecimal"),
                        Map.of("name", "fechaEmision", "type", "LocalDate")
                ))
                .build();
    }

    @Test
    @DisplayName("CU16-T06: Compilación en dialecto PostgreSQL 17")
    void testGenerateMultiSqlDdl_PostgreSql() {
        when(projectRepository.findById(sampleProjectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(sampleProjectId)).thenReturn(List.of(clienteNode, facturaNode));
        when(relationshipRepository.findByProjectId(sampleProjectId)).thenReturn(Collections.emptyList());

        MultiSqlDdlRequest req = MultiSqlDdlRequest.builder()
                .dialect(MultiSqlDdlRequest.SqlDialect.POSTGRESQL)
                .build();

        MultiSqlDdlResponse resp = generatorService.generateMultiSqlDdl(sampleProjectId, req, null);

        assertNotNull(resp);
        assertEquals("POSTGRESQL", resp.getDialect());
        assertTrue(resp.getDdlScript().contains("BIGINT GENERATED ALWAYS AS IDENTITY"));
        assertTrue(resp.getDdlScript().contains("BOOLEAN"));
        assertTrue(resp.getDdlScript().contains("NUMERIC(19, 4)"));
    }

    @Test
    @DisplayName("CU16-T07: Compilación en dialecto MySQL 8.x con InnoDB y AUTO_INCREMENT")
    void testGenerateMultiSqlDdl_MySql() {
        when(projectRepository.findById(sampleProjectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(sampleProjectId)).thenReturn(List.of(clienteNode, facturaNode));
        when(relationshipRepository.findByProjectId(sampleProjectId)).thenReturn(Collections.emptyList());

        MultiSqlDdlRequest req = MultiSqlDdlRequest.builder()
                .dialect(MultiSqlDdlRequest.SqlDialect.MYSQL)
                .build();

        MultiSqlDdlResponse resp = generatorService.generateMultiSqlDdl(sampleProjectId, req, null);

        assertNotNull(resp);
        assertEquals("MYSQL", resp.getDialect());
        assertTrue(resp.getDdlScript().contains("BIGINT AUTO_INCREMENT"));
        assertTrue(resp.getDdlScript().contains("TINYINT(1)"));
        assertTrue(resp.getDdlScript().contains("ENGINE=InnoDB"));
    }

    @Test
    @DisplayName("CU16-T08: Compilación en dialecto SQL Server (T-SQL) con IDENTITY e índices NONCLUSTERED")
    void testGenerateMultiSqlDdl_SqlServer() {
        when(projectRepository.findById(sampleProjectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(sampleProjectId)).thenReturn(List.of(clienteNode, facturaNode));
        when(relationshipRepository.findByProjectId(sampleProjectId)).thenReturn(Collections.emptyList());

        MultiSqlDdlRequest req = MultiSqlDdlRequest.builder()
                .dialect(MultiSqlDdlRequest.SqlDialect.SQL_SERVER)
                .build();

        MultiSqlDdlResponse resp = generatorService.generateMultiSqlDdl(sampleProjectId, req, null);

        assertNotNull(resp);
        assertEquals("SQL_SERVER", resp.getDialect());
        assertTrue(resp.getDdlScript().contains("BIGINT IDENTITY(1,1)"));
        assertTrue(resp.getDdlScript().contains("BIT"));
        assertTrue(resp.getDdlScript().contains("[dbo].[cliente]"));
    }

    @Test
    @DisplayName("CU16-T09: Compilación en dialecto Oracle Database con NUMBER(19) IDENTITY")
    void testGenerateMultiSqlDdl_Oracle() {
        when(projectRepository.findById(sampleProjectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(sampleProjectId)).thenReturn(List.of(clienteNode, facturaNode));
        when(relationshipRepository.findByProjectId(sampleProjectId)).thenReturn(Collections.emptyList());

        MultiSqlDdlRequest req = MultiSqlDdlRequest.builder()
                .dialect(MultiSqlDdlRequest.SqlDialect.ORACLE)
                .build();

        MultiSqlDdlResponse resp = generatorService.generateMultiSqlDdl(sampleProjectId, req, null);

        assertNotNull(resp);
        assertEquals("ORACLE", resp.getDialect());
        assertTrue(resp.getDdlScript().contains("NUMBER(19) GENERATED BY DEFAULT AS IDENTITY"));
        assertTrue(resp.getDdlScript().contains("NUMBER(1)"));
        assertTrue(resp.getDdlScript().contains("\"CLIENTE\""));
    }

    @Test
    @DisplayName("CU16-T10: Generación de Claves Foráneas con ON DELETE CASCADE consistente")
    void testGenerateMultiSqlDdl_ForeignKeysCascade() {
        Relationship rel = Relationship.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .sourceClass(clienteNode)
                .targetClass(facturaNode)
                .sourceCardinality("1")
                .targetCardinality("*")
                .build();

        when(projectRepository.findById(sampleProjectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(sampleProjectId)).thenReturn(List.of(clienteNode, facturaNode));
        when(relationshipRepository.findByProjectId(sampleProjectId)).thenReturn(List.of(rel));

        MultiSqlDdlRequest req = MultiSqlDdlRequest.builder()
                .dialect(MultiSqlDdlRequest.SqlDialect.POSTGRESQL)
                .includeForeignKeys(true)
                .build();

        MultiSqlDdlResponse resp = generatorService.generateMultiSqlDdl(sampleProjectId, req, null);

        assertNotNull(resp);
        assertTrue(resp.getDdlScript().contains("FOREIGN KEY (\"cliente_id\")"));
        assertTrue(resp.getDdlScript().contains("ON DELETE CASCADE"));
    }
}
