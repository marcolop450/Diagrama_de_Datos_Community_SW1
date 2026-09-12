package com.sw1.casetool.service;

import com.sw1.casetool.dto.generator.GenerateSqlDdlRequest;
import com.sw1.casetool.dto.generator.SqlDdlResponse;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.generator.SqlDdlGeneratorService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SqlDdlGeneratorServiceTest {

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
    private SqlDdlGeneratorService sqlDdlGeneratorService;

    private UUID projectId;
    private DiagramProject sampleProject;
    private ClassNode clienteNode;
    private ClassNode pedidoNode;
    private Relationship relClientePedido;

    @BeforeEach
    void setUp() {
        projectId = UUID.randomUUID();
        sampleProject = DiagramProject.builder()
                .id(projectId)
                .name("Sistema Comercial")
                .version("v1.0.0")
                .build();

        // 1. Cliente Node
        List<Map<String, Object>> clienteAttrs = new ArrayList<>();
        Map<String, Object> cId = new HashMap<>();
        cId.put("name", "id");
        cId.put("type", "Long");
        cId.put("isPrimaryKey", true);
        cId.put("isNotNull", true);
        clienteAttrs.add(cId);

        Map<String, Object> cNombre = new HashMap<>();
        cNombre.put("name", "nombre");
        cNombre.put("type", "String");
        cNombre.put("isPrimaryKey", false);
        cNombre.put("isNotNull", true);
        clienteAttrs.add(cNombre);

        clienteNode = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("Cliente")
                .attributes(clienteAttrs)
                .build();

        // 2. Pedido Node
        List<Map<String, Object>> pedidoAttrs = new ArrayList<>();
        Map<String, Object> pId = new HashMap<>();
        pId.put("name", "id");
        pId.put("type", "Long");
        pId.put("isPrimaryKey", true);
        pId.put("isNotNull", true);
        pedidoAttrs.add(pId);

        Map<String, Object> pTotal = new HashMap<>();
        pTotal.put("name", "total");
        pTotal.put("type", "BigDecimal");
        pTotal.put("isPrimaryKey", false);
        pTotal.put("isNotNull", true);
        pedidoAttrs.add(pTotal);

        pedidoNode = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("Pedido")
                .attributes(pedidoAttrs)
                .build();

        // 3. Relación 1 Cliente -> * Pedidos
        relClientePedido = Relationship.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .sourceClass(clienteNode)
                .targetClass(pedidoNode)
                .type("association")
                .sourceCardinality("1")
                .targetCardinality("*")
                .build();
    }

    @Test
    @DisplayName("Debe generar script DDL PostgreSQL 17 completo con tablas, PKs, FKs e índices")
    void testGenerateSqlDdl_Success() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(Arrays.asList(clienteNode, pedidoNode));
        when(relationshipRepository.findByProjectId(projectId)).thenReturn(Collections.singletonList(relClientePedido));

        GenerateSqlDdlRequest request = GenerateSqlDdlRequest.builder()
                .dropTables(true)
                .createIndexes(true)
                .includeComments(true)
                .includeForeignKeys(true)
                .schema("public")
                .build();

        SqlDdlResponse response = sqlDdlGeneratorService.generateSqlDdl(
                projectId,
                request,
                "arquitecto@sw1.com",
                "127.0.0.1",
                "Mozilla/5.0"
        );

        assertNotNull(response);
        assertEquals("Sistema Comercial", response.getProjectName());
        assertEquals("sistema-comercial-schema.sql", response.getFileName());
        assertEquals(2, response.getTotalTables());
        assertTrue(response.getTotalColumns() >= 4);
        assertEquals(1, response.getTotalForeignKeys());
        assertEquals(1, response.getTotalIndexes());

        String sql = response.getSql();
        assertNotNull(sql);

        // Header and settings
        assertTrue(sql.contains("SCRIPT DDL SQL RELACIONAL — POSTGRESQL 17"));
        assertTrue(sql.contains("SET client_encoding = 'UTF8';"));
        assertTrue(sql.contains("SET search_path TO public, public;"));

        // Phase 1 DROP TABLE
        assertTrue(sql.contains("DROP TABLE IF EXISTS pedido CASCADE;"));
        assertTrue(sql.contains("DROP TABLE IF EXISTS cliente CASCADE;"));

        // Phase 2 CREATE TABLE
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS cliente ("));
        assertTrue(sql.contains("id BIGINT GENERATED ALWAYS AS IDENTITY"));
        assertTrue(sql.contains("nombre VARCHAR(255) NOT NULL"));
        assertTrue(sql.contains("CONSTRAINT pk_cliente PRIMARY KEY (id)"));

        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS pedido ("));
        assertTrue(sql.contains("total NUMERIC(12, 2) NOT NULL"));
        assertTrue(sql.contains("cliente_id BIGINT NOT NULL"));
        assertTrue(sql.contains("CONSTRAINT pk_pedido PRIMARY KEY (id)"));

        // Phase 4 ALTER TABLE FK
        assertTrue(sql.contains("ALTER TABLE pedido"));
        assertTrue(sql.contains("ADD CONSTRAINT fk_pedido_cliente"));
        assertTrue(sql.contains("FOREIGN KEY (cliente_id)"));
        assertTrue(sql.contains("REFERENCES cliente (id)"));
        assertTrue(sql.contains("ON DELETE CASCADE"));

        // Phase 5 INDEX
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_pedido_cliente_id ON pedido (cliente_id);"));

        // Phase 6 COMMENTS
        assertTrue(sql.contains("COMMENT ON TABLE cliente IS 'Entidad de dominio: Cliente';"));
        assertTrue(sql.contains("COMMENT ON TABLE pedido IS 'Entidad de dominio: Pedido';"));

        // Verify Audit Log
        verify(auditLogService, times(1)).recordAction(
                any(),
                eq("SQL_DDL_GENERATED"),
                eq("diagram_projects"),
                eq(projectId),
                eq("127.0.0.1"),
                eq("Mozilla/5.0"),
                any()
        );
    }

    @Test
    @DisplayName("Debe generar tabla asociativa intermedia con clave primaria compuesta para relaciones N:N")
    void testGenerateSqlDdl_ManyToMany_CreatesJunctionTable() {
        ClassNode estudianteNode = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("Estudiante")
                .attributes(Collections.singletonList(Map.of("name", "id", "type", "Long", "isPrimaryKey", true)))
                .build();

        ClassNode cursoNode = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("Curso")
                .attributes(Collections.singletonList(Map.of("name", "id", "type", "Long", "isPrimaryKey", true)))
                .build();

        Relationship relEstudianteCurso = Relationship.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .sourceClass(estudianteNode)
                .targetClass(cursoNode)
                .type("association")
                .sourceCardinality("*")
                .targetCardinality("*")
                .build();

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(Arrays.asList(estudianteNode, cursoNode));
        when(relationshipRepository.findByProjectId(projectId)).thenReturn(Collections.singletonList(relEstudianteCurso));

        GenerateSqlDdlRequest request = GenerateSqlDdlRequest.builder()
                .dropTables(true)
                .createIndexes(true)
                .build();

        SqlDdlResponse response = sqlDdlGeneratorService.generateSqlDdl(
                projectId,
                request,
                "arquitecto@sw1.com",
                "127.0.0.1",
                "TestClient"
        );

        assertNotNull(response);
        assertEquals(3, response.getTotalTables(), "Debe incluir las 2 entidades más la tabla asociativa intermedia");

        String sql = response.getSql();
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS estudiante_curso ("));
        assertTrue(sql.contains("estudiante_id BIGINT NOT NULL"));
        assertTrue(sql.contains("curso_id BIGINT NOT NULL"));
        assertTrue(sql.contains("CONSTRAINT pk_estudiante_curso PRIMARY KEY (estudiante_id, curso_id)"));

        // FKs for junction table
        assertTrue(sql.contains("ALTER TABLE estudiante_curso"));
        assertTrue(sql.contains("REFERENCES estudiante (id)"));
        assertTrue(sql.contains("REFERENCES curso (id)"));

        // Indexes for junction table
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_estudiante_curso_estudiante_id ON estudiante_curso (estudiante_id);"));
        assertTrue(sql.contains("CREATE INDEX IF NOT EXISTS idx_estudiante_curso_curso_id ON estudiante_curso (curso_id);"));
    }

    @Test
    @DisplayName("Debe lanzar excepción E1 si el modelo no tiene clases definidas")
    void testGenerateSqlDdl_EmptyModel_ThrowsE1() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(Collections.emptyList());

        GenerateSqlDdlRequest request = new GenerateSqlDdlRequest();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            sqlDdlGeneratorService.generateSqlDdl(projectId, request, "test@sw1.com", "127.0.0.1", "TestClient");
        });

        assertTrue(ex.getMessage().contains("sin clases definidas (Regla E1)"));
    }

    @Test
    @DisplayName("Debe sintetizar automáticamente clave primaria id BIGINT (Defensa 1NF) si la clase no tiene PK")
    void testGenerateSqlDdl_SynthesizesPrimaryKey_1NFDefense() {
        ClassNode itemSinPk = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("ItemCatalogo")
                .attributes(Collections.singletonList(Map.of("name", "descripcion", "type", "String", "isPrimaryKey", false)))
                .build();

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(Collections.singletonList(itemSinPk));
        when(relationshipRepository.findByProjectId(projectId)).thenReturn(Collections.emptyList());

        SqlDdlResponse response = sqlDdlGeneratorService.generateSqlDdl(
                projectId,
                new GenerateSqlDdlRequest(),
                "test@sw1.com",
                "127.0.0.1",
                "TestClient"
        );

        String sql = response.getSql();
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS item_catalogo ("));
        assertTrue(sql.contains("id BIGINT GENERATED ALWAYS AS IDENTITY"));
        assertTrue(sql.contains("CONSTRAINT pk_item_catalogo PRIMARY KEY (id)"));
    }

    @Test
    @DisplayName("Debe soportar tipos avanzados de PostgreSQL 17 (UUID, TIMESTAMPTZ, NUMERIC, BYTEA, JSONB)")
    void testGenerateSqlDdl_Postgres17DataTypes() {
        List<Map<String, Object>> attrs = new ArrayList<>();
        attrs.add(Map.of("name", "uuidCode", "type", "UUID", "isPrimaryKey", true));
        attrs.add(Map.of("name", "fechaCreacion", "type", "LocalDateTime", "isNotNull", true));
        attrs.add(Map.of("name", "precio", "type", "BigDecimal", "isNotNull", true));
        attrs.add(Map.of("name", "activo", "type", "Boolean", "isNotNull", true));
        attrs.add(Map.of("name", "datosExtra", "type", "JSON", "isNotNull", false));
        attrs.add(Map.of("name", "archivoBinario", "type", "byte[]", "isNotNull", false));

        ClassNode entidadAvanzada = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("RegistroAvanzado")
                .attributes(attrs)
                .build();

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(Collections.singletonList(entidadAvanzada));
        when(relationshipRepository.findByProjectId(projectId)).thenReturn(Collections.emptyList());

        SqlDdlResponse response = sqlDdlGeneratorService.generateSqlDdl(
                projectId,
                new GenerateSqlDdlRequest(),
                "test@sw1.com",
                "127.0.0.1",
                "TestClient"
        );

        String sql = response.getSql();
        assertTrue(sql.contains("uuid_code UUID DEFAULT gen_random_uuid()"));
        assertTrue(sql.contains("fecha_creacion TIMESTAMPTZ NOT NULL"));
        assertTrue(sql.contains("precio NUMERIC(12, 2) NOT NULL"));
        assertTrue(sql.contains("activo BOOLEAN NOT NULL"));
        assertTrue(sql.contains("datos_extra JSONB"));
        assertTrue(sql.contains("archivo_binario BYTEA"));
    }
}
