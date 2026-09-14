package com.sw1.casetool.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.generator.GeneratePostmanRequest;
import com.sw1.casetool.dto.generator.PostmanResponse;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.generator.PostmanGeneratorService;
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
class PostmanGeneratorServiceTest {

    @Mock
    private DiagramProjectRepository projectRepository;

    @Mock
    private ClassNodeRepository classNodeRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private PostmanGeneratorService postmanGeneratorService;

    private UUID projectId;
    private DiagramProject sampleProject;
    private ClassNode clienteNode;
    private ClassNode pedidoNode;
    private final ObjectMapper mapper = new ObjectMapper();

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
        clienteAttrs.add(cId);

        Map<String, Object> cNombre = new HashMap<>();
        cNombre.put("name", "nombre");
        cNombre.put("type", "String");
        clienteAttrs.add(cNombre);

        Map<String, Object> cEmail = new HashMap<>();
        cEmail.put("name", "email");
        cEmail.put("type", "String");
        clienteAttrs.add(cEmail);

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
        pedidoAttrs.add(pId);

        Map<String, Object> pTotal = new HashMap<>();
        pTotal.put("name", "total");
        pTotal.put("type", "BigDecimal");
        pedidoAttrs.add(pTotal);

        pedidoNode = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("Pedido")
                .attributes(pedidoAttrs)
                .build();
    }

    @Test
    @DisplayName("Debe generar colección Postman v2.1.0 completa con 5 operaciones CRUD por entidad")
    void testGeneratePostmanCollection_Success() throws Exception {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(Arrays.asList(clienteNode, pedidoNode));

        GeneratePostmanRequest request = GeneratePostmanRequest.builder()
                .baseUrl("http://localhost:8081")
                .includeTests(true)
                .includeMockData(true)
                .build();

        PostmanResponse response = postmanGeneratorService.generatePostmanCollection(
                projectId,
                request,
                "arquitecto@sw1.com",
                "127.0.0.1",
                "PostmanRuntime/7.36.0"
        );

        assertNotNull(response);
        assertEquals("Sistema Comercial", response.getProjectName());
        assertEquals("sistema-comercial-postman-collection.json", response.getFileName());
        assertEquals(2, response.getTotalFolders());
        assertEquals(10, response.getTotalRequests(), "2 entidades x 5 endpoints CRUD = 10 requests");
        assertTrue(response.getTotalTests() > 0, "Debe incluir aserciones pm.test automáticas");

        // Parse JSON to validate Postman v2.1 schema compliance
        JsonNode root = mapper.readTree(response.getJson());
        assertNotNull(root);

        // Info block
        assertTrue(root.has("info"));
        assertEquals("https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
                root.get("info").get("schema").asText());
        assertTrue(root.get("info").get("name").asText().contains("Sistema Comercial"));

        // Variables
        assertTrue(root.has("variable"));
        JsonNode varBaseUrl = root.get("variable").get(0);
        assertEquals("baseUrl", varBaseUrl.get("key").asText());
        assertEquals("http://localhost:8081", varBaseUrl.get("value").asText());

        // Folders
        assertTrue(root.has("item"));
        JsonNode items = root.get("item");
        assertEquals(2, items.size());

        JsonNode clienteFolder = items.get(0);
        assertEquals("Cliente", clienteFolder.get("name").asText());
        JsonNode clienteRequests = clienteFolder.get("item");
        assertEquals(5, clienteRequests.size(), "Debe contener 5 requests CRUD para Cliente");

        // Validate GET All
        JsonNode getAllReq = clienteRequests.get(0);
        assertTrue(getAllReq.get("name").asText().contains("GET All"));
        assertEquals("GET", getAllReq.get("request").get("method").asText());
        assertEquals("{{baseUrl}}/api/clientes", getAllReq.get("request").get("url").get("raw").asText());
        assertTrue(getAllReq.has("event"), "Debe incluir assertions automáticas");

        // Validate POST Create (Ejecuta después de GET All para poblar el ID)
        JsonNode postReq = clienteRequests.get(1);
        assertTrue(postReq.get("name").asText().contains("POST Create"));
        assertEquals("POST", postReq.get("request").get("method").asText());
        assertTrue(postReq.get("request").has("body"));
        String postBody = postReq.get("request").get("body").get("raw").asText();
        assertTrue(postBody.contains("nombre"));
        assertTrue(postBody.contains("email"));
        assertFalse(postBody.contains("\"id\""), "POST no debe enviar ID autoincremental en el body");

        // Validate GET by ID (Ejecuta después de POST Create para verificar existencia)
        JsonNode getByIdReq = clienteRequests.get(2);
        assertTrue(getByIdReq.get("name").asText().contains("GET by ID"));
        assertEquals("GET", getByIdReq.get("request").get("method").asText());

        // Verify Audit Log
        verify(auditLogService, times(1)).recordAction(
                any(),
                eq("POSTMAN_COLLECTION_GENERATED"),
                eq("diagram_projects"),
                eq(projectId),
                eq("127.0.0.1"),
                eq("PostmanRuntime/7.36.0"),
                any()
        );
    }

    @Test
    @DisplayName("Debe lanzar excepción E1 si el modelo no tiene clases definidas")
    void testGeneratePostmanCollection_EmptyModel_ThrowsE1() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(Collections.emptyList());

        GeneratePostmanRequest request = new GeneratePostmanRequest();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            postmanGeneratorService.generatePostmanCollection(projectId, request, "test@sw1.com", "127.0.0.1", "TestClient");
        });

        assertTrue(ex.getMessage().contains("sin clases definidas (Regla E1)"));
    }

    @Test
    @DisplayName("Debe generar colección sin tests cuando includeTests es falso")
    void testGeneratePostmanCollection_WithoutTests() throws Exception {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(Collections.singletonList(clienteNode));

        GeneratePostmanRequest request = GeneratePostmanRequest.builder()
                .includeTests(false)
                .build();

        PostmanResponse response = postmanGeneratorService.generatePostmanCollection(
                projectId,
                request,
                "test@sw1.com",
                "127.0.0.1",
                "TestClient"
        );

        assertEquals(0, response.getTotalTests());
        JsonNode root = mapper.readTree(response.getJson());
        JsonNode reqItem = root.get("item").get(0).get("item").get(0);
        assertFalse(reqItem.has("event"), "No debe incluir eventos de test cuando includeTests es falso");
    }

    @Test
    @DisplayName("Debe generar valores mock válidos para tipos LocalDate y campos de dominio académico (Inscripción, Docente)")
    void testGeneratePostmanCollection_AcademicDomainMockValues_ValidDateAndSpecialty() throws Exception {
        ClassNode inscripcionNode = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("Inscripcion")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isPrimaryKey", true),
                        Map.of("name", "fechaInscripcion", "type", "LocalDate"),
                        Map.of("name", "periodoAcademico", "type", "String"),
                        Map.of("name", "notaFinal", "type", "Double"),
                        Map.of("name", "estado", "type", "String")
                ))
                .build();

        ClassNode docenteNode = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("Docente")
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "isPrimaryKey", true),
                        Map.of("name", "registroDocente", "type", "String"),
                        Map.of("name", "especialidad", "type", "String")
                ))
                .build();

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(List.of(inscripcionNode, docenteNode));

        GeneratePostmanRequest request = GeneratePostmanRequest.builder()
                .includeTests(true)
                .includeMockData(true)
                .build();

        PostmanResponse response = postmanGeneratorService.generatePostmanCollection(
                projectId, request, "test@sw1.com", "127.0.0.1", "TestClient"
        );

        JsonNode root = mapper.readTree(response.getJson());

        // 1. Inscripcion POST Create Body
        JsonNode inscripcionFolder = root.get("item").get(0);
        JsonNode postInscripcion = inscripcionFolder.get("item").get(1); // 2nd item is POST Create
        String inscripcionRaw = postInscripcion.get("request").get("body").get("raw").asText();
        JsonNode inscripcionBody = mapper.readTree(inscripcionRaw);

        assertEquals("2026-09-12", inscripcionBody.get("fechaInscripcion").asText(),
                "fechaInscripcion de tipo LocalDate debe formatearse como YYYY-MM-DD");
        assertNotEquals("84729103", inscripcionBody.get("fechaInscripcion").asText(),
                "fechaInscripcion no debe contener número de CI");
        assertEquals("1/2026", inscripcionBody.get("periodoAcademico").asText());
        assertEquals("REGISTRADO", inscripcionBody.get("estado").asText());

        // 2. Docente POST Create Body
        JsonNode docenteFolder = root.get("item").get(1);
        JsonNode postDocente = docenteFolder.get("item").get(1);
        String docenteRaw = postDocente.get("request").get("body").get("raw").asText();
        JsonNode docenteBody = mapper.readTree(docenteRaw);

        assertNotEquals("84729103", docenteBody.get("especialidad").asText(),
                "especialidad no debe confundirse con CI");
        assertTrue(docenteBody.get("especialidad").asText().contains("Ingeniería"),
                "especialidad debe ser un texto de especialidad académica");
    }
}
