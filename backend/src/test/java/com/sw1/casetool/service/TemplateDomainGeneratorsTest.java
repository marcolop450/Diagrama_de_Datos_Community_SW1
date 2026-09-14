package com.sw1.casetool.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.config.TemplateDataSeeder;
import com.sw1.casetool.dto.generator.GenerateBackendRequest;
import com.sw1.casetool.dto.generator.GeneratePostmanRequest;
import com.sw1.casetool.dto.generator.GenerateSqlDdlRequest;
import com.sw1.casetool.dto.generator.PostmanResponse;
import com.sw1.casetool.dto.generator.SqlDdlResponse;
import com.sw1.casetool.dto.normalization.NormalizationReportDto;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.DomainTemplate;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.DomainTemplateRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.generator.PostmanGeneratorService;
import com.sw1.casetool.service.generator.SpringBootGeneratorService;
import com.sw1.casetool.service.generator.SqlDdlGeneratorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TemplateDomainGeneratorsTest {

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
    private DomainTemplateRepository domainTemplateRepository;

    private SqlDdlGeneratorService sqlDdlGeneratorService;
    private SpringBootGeneratorService springBootGeneratorService;
    private PostmanGeneratorService postmanGeneratorService;
    private NormalizationValidationService normalizationValidationService;

    private TemplateDataSeeder seeder;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private UserProfile mockUser;

    @BeforeEach
    void setUp() {
        sqlDdlGeneratorService = new SqlDdlGeneratorService(
                projectRepository, classNodeRepository, relationshipRepository, userProfileRepository, auditLogService
        );

        springBootGeneratorService = new SpringBootGeneratorService(
                projectRepository, classNodeRepository, relationshipRepository, userProfileRepository, auditLogService
        );

        postmanGeneratorService = new PostmanGeneratorService(
                projectRepository, classNodeRepository, userProfileRepository, auditLogService
        );

        normalizationValidationService = new NormalizationValidationService(
                projectRepository, classNodeRepository, relationshipRepository, auditLogService
        );

        seeder = new TemplateDataSeeder(domainTemplateRepository);

        mockUser = UserProfile.builder()
                .id(UUID.randomUUID())
                .email("architect@casetool.com")
                .fullName("Arquitecto Senior")
                .role("ARQUITECTO")
                .build();

        lenient().when(userProfileRepository.findByEmailIgnoreCase("architect@casetool.com"))
                .thenReturn(Optional.of(mockUser));
    }

    @Test
    @DisplayName("Prueba General: Plantilla Académica (Educación) genera DDL SQL, Spring Boot 4 Capas y Postman v2.1")
    void testTemplateColegio_Generators_AllPass() throws IOException {
        testDomainTemplateScaffoldingAndGenerators("TEMPLATE_COLEGIO", List.of("Carrera", "Estudiante", "Docente", "Inscripcion", "Materia"));
    }

    @Test
    @DisplayName("Prueba General: Plantilla Hospitalaria (Salud) genera DDL SQL, Spring Boot 4 Capas y Postman v2.1")
    void testTemplateClinica_Generators_AllPass() throws IOException {
        testDomainTemplateScaffoldingAndGenerators("TEMPLATE_CLINICA", List.of("Paciente", "Especialidad", "Medico", "HistorialClinico", "ConsultaMedica"));
    }

    @Test
    @DisplayName("Prueba General: Plantilla Comercial (Finanzas) genera DDL SQL, Spring Boot 4 Capas y Postman v2.1")
    void testTemplateContabilidad_Generators_AllPass() throws IOException {
        testDomainTemplateScaffoldingAndGenerators("TEMPLATE_CONTABILIDAD", List.of("Cliente", "Factura", "Pago", "DetalleFactura", "Producto"));
    }

    @SuppressWarnings("unchecked")
    private void testDomainTemplateScaffoldingAndGenerators(String templateId, List<String> expectedClassNames) throws IOException {
        // 1. Obtener la plantilla desde el Seeder
        DomainTemplate template = seeder.buildCanonicalTemplates().stream()
                .filter(t -> t.getId().equals(templateId))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Plantilla no encontrada: " + templateId));

        UUID projectId = UUID.randomUUID();
        DiagramProject project = DiagramProject.builder()
                .id(projectId)
                .name(template.getName())
                .description(template.getDescription())
                .version("v1.0.0")
                .ownerId(mockUser.getId())
                .build();

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        // 2. Mapear nodos y relaciones del schema a entidades JPA
        Map<String, Object> schema = template.getInitialSchema();
        List<Map<String, Object>> rawNodes = (List<Map<String, Object>>) schema.get("nodes");
        List<Map<String, Object>> rawEdges = (List<Map<String, Object>>) schema.get("edges");

        Map<String, ClassNode> nodeMap = new HashMap<>();
        List<ClassNode> classNodes = new ArrayList<>();

        for (Map<String, Object> nm : rawNodes) {
            String tId = nm.get("id").toString();
            String name = nm.get("name").toString();
            List<Map<String, Object>> attrs = (List<Map<String, Object>>) nm.get("attributes");
            List<Map<String, Object>> meths = (List<Map<String, Object>>) nm.get("methods");

            ClassNode cn = ClassNode.builder()
                    .id(UUID.randomUUID())
                    .project(project)
                    .name(name)
                    .stereotype((String) nm.get("stereotype"))
                    .abstractClass(Boolean.TRUE.equals(nm.get("isAbstract")))
                    .width(280.0)
                    .height(220.0)
                    .attributes(attrs)
                    .methods(meths)
                    .build();

            nodeMap.put(tId, cn);
            classNodes.add(cn);
        }

        List<Relationship> relationships = new ArrayList<>();
        for (Map<String, Object> em : rawEdges) {
            String srcId = em.get("source").toString();
            String tgtId = em.get("target").toString();

            Relationship r = Relationship.builder()
                    .id(UUID.randomUUID())
                    .project(project)
                    .sourceClass(nodeMap.get(srcId))
                    .targetClass(nodeMap.get(tgtId))
                    .type((String) em.get("type"))
                    .sourceCardinality((String) em.get("sourceCardinality"))
                    .targetCardinality((String) em.get("targetCardinality"))
                    .label((String) em.get("label"))
                    .sourceRole((String) em.get("sourceRole"))
                    .targetRole((String) em.get("targetRole"))
                    .sourceHandle((String) em.get("sourceHandle"))
                    .targetHandle((String) em.get("targetHandle"))
                    .build();

            relationships.add(r);
        }

        when(classNodeRepository.findByProjectId(projectId)).thenReturn(classNodes);
        when(relationshipRepository.findByProjectId(projectId)).thenReturn(relationships);

        // --- A. VALIDACIÓN CU10: Normalización Relacional (1NF) ---
        NormalizationReportDto normReport = normalizationValidationService.validateProject(projectId, mockUser.getId(), null);
        assertNotNull(normReport);
        assertTrue(normReport.getScore() >= 80, "El score de normalización debe ser alto para una plantilla base (Score: " + normReport.getScore() + ")");
        assertEquals(0, normReport.getCriticalIssuesCount(), "Las plantillas canónicas no deben poseer incidencias críticas");

        // --- B. VALIDACIÓN CU14: Esquema DDL SQL PostgreSQL 17 ---
        GenerateSqlDdlRequest sqlReq = GenerateSqlDdlRequest.builder()
                .dropTables(true)
                .createIndexes(true)
                .includeComments(true)
                .includeForeignKeys(true)
                .build();

        SqlDdlResponse sqlResponse = sqlDdlGeneratorService.generateSqlDdl(
                projectId, sqlReq, "architect@casetool.com", "127.0.0.1", "JUnit"
        );
        assertNotNull(sqlResponse);
        assertNotNull(sqlResponse.getSql());
        String sql = sqlResponse.getSql();

        for (String expectedClass : expectedClassNames) {
            assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS " + expectedClass.toLowerCase()) ||
                       sql.contains("CREATE TABLE IF NOT EXISTS " + toSnakeCase(expectedClass)),
                    "El SQL debe contener la tabla para " + expectedClass);
            assertTrue(sql.contains("PRIMARY KEY"), "El SQL debe declarar PRIMARY KEY");
        }

        // --- C. VALIDACIÓN CU13: Backend Spring Boot 4 Capas en ZIP ---
        String artifactId = "domain-api";
        GenerateBackendRequest backendReq = GenerateBackendRequest.builder()
                .packageName("com.universidad.core")
                .artifactId(artifactId)
                .databaseType("h2_postgres")
                .includeSwagger(true)
                .build();

        byte[] zipBytes = springBootGeneratorService.generateSpringBootZip(
                projectId, backendReq, "architect@casetool.com", "127.0.0.1", "JUnit"
        );
        assertNotNull(zipBytes);
        assertTrue(zipBytes.length > 1000, "El ZIP generado debe tener contenido ejecutable");

        Set<String> zipEntries = new HashSet<>();
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                zipEntries.add(entry.getName());
            }
        }

        String rootDir = artifactId + "/";
        assertTrue(zipEntries.contains(rootDir + "pom.xml"), "El ZIP debe contener pom.xml");
        assertTrue(zipEntries.contains(rootDir + "src/main/resources/application.yml"), "El ZIP debe contener application.yml");

        for (String expectedClass : expectedClassNames) {
            String entityFile = rootDir + "src/main/java/com/universidad/core/entity/" + expectedClass + ".java";
            String repoFile = rootDir + "src/main/java/com/universidad/core/repository/" + expectedClass + "Repository.java";
            String serviceFile = rootDir + "src/main/java/com/universidad/core/service/" + expectedClass + "Service.java";
            String serviceImplFile = rootDir + "src/main/java/com/universidad/core/service/impl/" + expectedClass + "ServiceImpl.java";
            String controllerFile = rootDir + "src/main/java/com/universidad/core/controller/" + expectedClass + "Controller.java";
            String requestDto = rootDir + "src/main/java/com/universidad/core/dto/" + expectedClass + "RequestDto.java";
            String responseDto = rootDir + "src/main/java/com/universidad/core/dto/" + expectedClass + "ResponseDto.java";

            assertTrue(zipEntries.contains(entityFile), "Debe contener Entity: " + entityFile);
            assertTrue(zipEntries.contains(repoFile), "Debe contener Repository: " + repoFile);
            assertTrue(zipEntries.contains(serviceFile), "Debe contener Service: " + serviceFile);
            assertTrue(zipEntries.contains(serviceImplFile), "Debe contener ServiceImpl: " + serviceImplFile);
            assertTrue(zipEntries.contains(controllerFile), "Debe contener Controller: " + controllerFile);
            assertTrue(zipEntries.contains(requestDto), "Debe contener RequestDto: " + requestDto);
            assertTrue(zipEntries.contains(responseDto), "Debe contener ResponseDto: " + responseDto);
        }

        // --- D. VALIDACIÓN CU15: Colección de Pruebas Postman v2.1.0 ---
        GeneratePostmanRequest postmanReq = GeneratePostmanRequest.builder()
                .baseUrl("http://localhost:8081")
                .includeTests(true)
                .includeMockData(true)
                .build();

        PostmanResponse postmanResponse = postmanGeneratorService.generatePostmanCollection(
                projectId, postmanReq, "architect@casetool.com", "127.0.0.1", "JUnit"
        );
        assertNotNull(postmanResponse);
        assertNotNull(postmanResponse.getJson());
        assertTrue(postmanResponse.getJson().length() > 500);

        JsonNode postmanRoot = objectMapper.readTree(postmanResponse.getJson());
        assertEquals("https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
                postmanRoot.path("info").path("schema").asText());

        JsonNode itemArray = postmanRoot.path("item");
        assertEquals(expectedClassNames.size(), itemArray.size(),
                "Debe existir una carpeta por cada entidad en la colección Postman");
    }

    private String toSnakeCase(String str) {
        return str.replaceAll("([a-z])([A-Z]+)", "$1_$2").toLowerCase();
    }
}
