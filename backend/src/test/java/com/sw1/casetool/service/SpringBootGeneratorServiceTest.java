package com.sw1.casetool.service;

import com.sw1.casetool.dto.generator.GenerateBackendRequest;
import com.sw1.casetool.dto.generator.GenerationPreviewResponse;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.generator.SpringBootGeneratorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SpringBootGeneratorServiceTest {

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
    private SpringBootGeneratorService generatorService;

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
                .name("Sistema de Gestión Comercial")
                .version("v1.0.0")
                .build();

        // 1. Cliente Node
        List<Map<String, Object>> clienteAttrs = new ArrayList<>();
        Map<String, Object> idAttr = new HashMap<>();
        idAttr.put("name", "id");
        idAttr.put("type", "Long");
        idAttr.put("isPrimaryKey", true);
        idAttr.put("isNotNull", true);
        clienteAttrs.add(idAttr);

        Map<String, Object> nombreAttr = new HashMap<>();
        nombreAttr.put("name", "nombre");
        nombreAttr.put("type", "String");
        nombreAttr.put("isPrimaryKey", false);
        nombreAttr.put("isNotNull", true);
        clienteAttrs.add(nombreAttr);

        clienteNode = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("Cliente")
                .attributes(clienteAttrs)
                .build();

        // 2. Pedido Node
        List<Map<String, Object>> pedidoAttrs = new ArrayList<>();
        Map<String, Object> pIdAttr = new HashMap<>();
        pIdAttr.put("name", "id");
        pIdAttr.put("type", "Long");
        pIdAttr.put("isPrimaryKey", true);
        pIdAttr.put("isNotNull", true);
        pedidoAttrs.add(pIdAttr);

        Map<String, Object> totalAttr = new HashMap<>();
        totalAttr.put("name", "total");
        totalAttr.put("type", "BigDecimal");
        totalAttr.put("isPrimaryKey", false);
        totalAttr.put("isNotNull", true);
        pedidoAttrs.add(totalAttr);

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

        // 4. Producto Node (Solo PK para validar que RequestDto no duplique constructores)
        List<Map<String, Object>> prodAttrs = new ArrayList<>();
        Map<String, Object> prodIdAttr = new HashMap<>();
        prodIdAttr.put("name", "id");
        prodIdAttr.put("type", "Long");
        prodIdAttr.put("isPrimaryKey", true);
        prodIdAttr.put("isNotNull", true);
        prodAttrs.add(prodIdAttr);

        ClassNode productoNode = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("Producto")
                .attributes(prodAttrs)
                .build();
    }

    @Test
    @DisplayName("Debe generar proyecto backend Spring Boot en ZIP con arquitectura completa en 4 capas")
    void testGenerateSpringBootZip_Success() throws Exception {
        ClassNode productoNode = ClassNode.builder()
                .id(UUID.randomUUID())
                .project(sampleProject)
                .name("Producto")
                .attributes(Collections.singletonList(Map.of("name", "id", "type", "Long", "isPrimaryKey", true, "isNotNull", true)))
                .build();

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(Arrays.asList(clienteNode, pedidoNode, productoNode));
        when(relationshipRepository.findByProjectId(projectId)).thenReturn(Collections.singletonList(relClientePedido));

        GenerateBackendRequest request = GenerateBackendRequest.builder()
                .packageName("com.empresa.comercial")
                .groupId("com.empresa")
                .artifactId("comercial-api")
                .javaVersion("21")
                .includeSwagger(true)
                .includeMavenWrapper(false)
                .build();

        byte[] zipBytes = generatorService.generateSpringBootZip(
                projectId,
                request,
                "arquitecto@sw1.com",
                "127.0.0.1",
                "Mozilla/5.0"
        );

        assertNotNull(zipBytes);
        assertTrue(zipBytes.length > 0, "El ZIP generado no debe estar vacío");

        // Inspect ZIP structure and file contents
        Map<String, String> filesInZip = new HashMap<>();
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (!entry.isDirectory()) {
                    ByteArrayOutputStream contentStream = new ByteArrayOutputStream();
                    zis.transferTo(contentStream);
                    filesInZip.put(entry.getName(), contentStream.toString(StandardCharsets.UTF_8));
                }
                zis.closeEntry();
            }
        }

        // Verify root files
        assertTrue(filesInZip.containsKey("comercial-api/pom.xml"), "Debe contener pom.xml");
        assertTrue(filesInZip.containsKey("comercial-api/README.md"), "Debe contener README.md");
        assertTrue(filesInZip.containsKey("comercial-api/src/main/resources/application.yml"), "Debe contener application.yml");
        assertTrue(filesInZip.containsKey("comercial-api/src/main/java/com/empresa/comercial/Application.java"), "Debe contener Application.java");
        assertTrue(filesInZip.containsKey("comercial-api/src/main/java/com/empresa/comercial/config/H2ConsoleConfig.java"), "Debe contener H2ConsoleConfig.java");

        // Verify Entity files
        String clienteEntity = filesInZip.get("comercial-api/src/main/java/com/empresa/comercial/entity/Cliente.java");
        assertNotNull(clienteEntity, "Debe contener la entidad Cliente.java");
        assertTrue(clienteEntity.contains("@Entity"), "Debe tener anotación @Entity");
        assertTrue(clienteEntity.contains("@Table(name = \"cliente\")"), "Debe mapear a tabla cliente");
        assertTrue(clienteEntity.contains("private Long id;"), "Debe contener atributo id");
        assertTrue(clienteEntity.contains("private String nombre;"), "Debe contener atributo nombre");
        assertTrue(clienteEntity.contains("@OneToMany"), "Debe contener relación @OneToMany hacia Pedido");

        String pedidoEntity = filesInZip.get("comercial-api/src/main/java/com/empresa/comercial/entity/Pedido.java");
        assertNotNull(pedidoEntity, "Debe contener la entidad Pedido.java");
        assertTrue(pedidoEntity.contains("@ManyToOne"), "Debe contener relación @ManyToOne hacia Cliente");

        // Verify Repository files
        assertTrue(filesInZip.containsKey("comercial-api/src/main/java/com/empresa/comercial/repository/ClienteRepository.java"));
        String clienteRepo = filesInZip.get("comercial-api/src/main/java/com/empresa/comercial/repository/ClienteRepository.java");
        assertTrue(clienteRepo.contains("JpaRepository<Cliente, Long>"), "Debe extender JpaRepository con ID Long");

        // Verify Service Interface and Implementation
        assertTrue(filesInZip.containsKey("comercial-api/src/main/java/com/empresa/comercial/service/ClienteService.java"));
        assertTrue(filesInZip.containsKey("comercial-api/src/main/java/com/empresa/comercial/service/impl/ClienteServiceImpl.java"));
        String clienteServiceImpl = filesInZip.get("comercial-api/src/main/java/com/empresa/comercial/service/impl/ClienteServiceImpl.java");
        assertTrue(clienteServiceImpl.contains("@Service"), "Debe tener anotación @Service");
        assertTrue(clienteServiceImpl.contains("@Transactional"), "Debe tener anotación @Transactional");

        // Verify Controller
        assertTrue(filesInZip.containsKey("comercial-api/src/main/java/com/empresa/comercial/controller/ClienteController.java"));
        String clienteController = filesInZip.get("comercial-api/src/main/java/com/empresa/comercial/controller/ClienteController.java");
        assertTrue(clienteController.contains("@RestController"), "Debe tener anotación @RestController");
        assertTrue(clienteController.contains("@RequestMapping(\"/api/clientes\")"), "Debe mapear a endpoint /api/clientes");

        // Verify DTOs
        assertTrue(filesInZip.containsKey("comercial-api/src/main/java/com/empresa/comercial/dto/ClienteRequestDto.java"));
        assertTrue(filesInZip.containsKey("comercial-api/src/main/java/com/empresa/comercial/dto/ClienteResponseDto.java"));

        // Verify pom.xml contents
        String pomXml = filesInZip.get("comercial-api/pom.xml");
        assertTrue(pomXml.contains("<artifactId>spring-boot-starter-data-jpa</artifactId>"));
        assertTrue(pomXml.contains("<artifactId>postgresql</artifactId>"));
        assertTrue(pomXml.contains("<artifactId>h2</artifactId>"));
        assertTrue(pomXml.contains("<java.version>21</java.version>"));
        assertTrue(pomXml.contains("<artifactId>maven-compiler-plugin</artifactId>"));
        assertTrue(pomXml.contains("<artifactId>lombok</artifactId>"));

        // Verify ProductoRequestDto handles empty non-pk without duplicate constructors
        String prodRequestDto = filesInZip.get("comercial-api/src/main/java/com/empresa/comercial/dto/ProductoRequestDto.java");
        assertNotNull(prodRequestDto);
        assertFalse(prodRequestDto.contains("@AllArgsConstructor"), "No debe tener @AllArgsConstructor para evitar constructores duplicados con 0 campos");
        assertTrue(prodRequestDto.contains("@NoArgsConstructor"));

        // Exportar a target/e2e-test para verificar compilación con javac real
        java.nio.file.Path e2eDir = java.nio.file.Paths.get("target/e2e-test");
        for (Map.Entry<String, String> entry : filesInZip.entrySet()) {
            java.nio.file.Path p = e2eDir.resolve(entry.getKey());
            java.nio.file.Files.createDirectories(p.getParent());
            java.nio.file.Files.writeString(p, entry.getValue(), StandardCharsets.UTF_8);
        }

        // Verify Inmutable Audit
        verify(auditLogService, times(1)).recordAction(
                any(),
                eq("BACKEND_GENERATED"),
                eq("diagram_projects"),
                eq(projectId),
                eq("127.0.0.1"),
                eq("Mozilla/5.0"),
                any()
        );
    }

    @Test
    @DisplayName("Debe lanzar excepción E1 si el modelo no tiene clases definidas")
    void testGenerateSpringBootZip_EmptyModel_ThrowsE1() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(Collections.emptyList());

        GenerateBackendRequest request = new GenerateBackendRequest();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            generatorService.generateSpringBootZip(projectId, request, "test@sw1.com", "127.0.0.1", "TestClient");
        });

        assertTrue(ex.getMessage().contains("sin clases definidas (Regla E1)"));
    }

    @Test
    @DisplayName("Debe generar vista previa del árbol de archivos correctamente")
    void testGetGenerationPreview_Success() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(Arrays.asList(clienteNode, pedidoNode));

        GenerateBackendRequest request = GenerateBackendRequest.builder()
                .packageName("com.ejemplo")
                .includeMavenWrapper(true)
                .build();

        GenerationPreviewResponse preview = generatorService.getGenerationPreview(projectId, request);

        assertNotNull(preview);
        assertEquals("Sistema de Gestión Comercial", preview.getProjectName());
        assertEquals("com.ejemplo", preview.getPackageName());
        assertEquals(2, preview.getTotalClasses());
        assertTrue(preview.getTotalFiles() > 15);
        assertTrue(preview.getFileTree().contains("pom.xml"));
        assertTrue(preview.getFileTree().contains("src/main/java/com/ejemplo/entity/Cliente.java"));
        assertTrue(preview.getFileTree().contains("mvnw"));
    }
}
