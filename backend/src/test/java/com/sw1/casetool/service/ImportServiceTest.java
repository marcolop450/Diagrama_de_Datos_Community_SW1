package com.sw1.casetool.service;

import com.sw1.casetool.dto.importxmi.ImportXmiResponse;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.importxmi.LayoutEngineUtil;
import com.sw1.casetool.service.importxmi.XmiImportService;
import com.sw1.casetool.service.importxmi.XmiImportService.ParsedXmiModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportServiceTest {

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
    private XmiImportService xmiImportService;

    private static final String SAMPLE_XMI = """
            <?xml version="1.0" encoding="UTF-8"?>
            <xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
              <uml:Model xmi:id="model_1" name="Sistema de Facturación">
                <packagedElement xmi:type="uml:Class" xmi:id="class_cliente" name="Cliente" isAbstract="false">
                  <ownedComment xmi:type="uml:Comment">
                    <body>stereotype:entity</body>
                  </ownedComment>
                  <ownedAttribute xmi:type="uml:Property" xmi:id="attr_1" name="id" visibility="private" isStatic="false">
                    <type xmi:type="uml:PrimitiveType" name="Long"/>
                    <ownedComment xmi:type="uml:Comment">
                      <body>PK</body>
                    </ownedComment>
                  </ownedAttribute>
                  <ownedAttribute xmi:type="uml:Property" xmi:id="attr_2" name="nombre" visibility="private" isStatic="false">
                    <type xmi:type="uml:PrimitiveType" name="String"/>
                  </ownedAttribute>
                  <ownedOperation xmi:type="uml:Operation" xmi:id="op_1" name="getNombre" visibility="public" isStatic="false" isAbstract="false">
                    <ownedParameter xmi:type="uml:Parameter" name="return" direction="return">
                      <type xmi:type="uml:PrimitiveType" name="String"/>
                    </ownedParameter>
                  </ownedOperation>
                </packagedElement>
                
                <packagedElement xmi:type="uml:Class" xmi:id="class_factura" name="Factura" isAbstract="false">
                  <ownedAttribute xmi:type="uml:Property" xmi:id="attr_3" name="id" visibility="private">
                    <type xmi:type="uml:PrimitiveType" name="Long"/>
                    <ownedComment xmi:type="uml:Comment">
                      <body>PRIMARY KEY</body>
                    </ownedComment>
                  </ownedAttribute>
                  <ownedAttribute xmi:type="uml:Property" xmi:id="attr_4" name="numero" visibility="public">
                    <type xmi:type="uml:PrimitiveType" name="String"/>
                  </ownedAttribute>
                </packagedElement>
                
                <packagedElement xmi:type="uml:Association" xmi:id="assoc_1" name="realiza">
                  <ownedEnd xmi:type="uml:Property" xmi:id="end_1" type="class_cliente" name="emisor">
                    <lowerValue xmi:type="uml:LiteralInteger" value="1"/>
                    <upperValue xmi:type="uml:LiteralInteger" value="1"/>
                  </ownedEnd>
                  <ownedEnd xmi:type="uml:Property" xmi:id="end_2" type="class_factura" name="facturas">
                    <lowerValue xmi:type="uml:LiteralInteger" value="0"/>
                    <upperValue xmi:type="uml:LiteralUnlimitedNatural" value="*"/>
                  </ownedEnd>
                </packagedElement>
              </uml:Model>
            </xmi:XMI>
            """;

    @Test
    @DisplayName("Debe parsear XMI canónico OMG 2.1 extrayendo clases, atributos, métodos y asociaciones")
    void testParseXmi_ValidOMG21_Success() {
        InputStream is = new ByteArrayInputStream(SAMPLE_XMI.getBytes(StandardCharsets.UTF_8));
        ParsedXmiModel model = xmiImportService.parseXmi(is);

        assertNotNull(model);
        assertEquals("Sistema de Facturación", model.modelName);
        assertEquals(2, model.classes.size());

        // Verify Cliente
        XmiImportService.RawClass cliente = model.classes.stream()
                .filter(c -> c.name.equals("Cliente")).findFirst().orElse(null);
        assertNotNull(cliente);
        assertEquals("entity", cliente.stereotype);
        assertFalse(cliente.isAbstract);
        assertEquals(2, cliente.attributes.size());
        assertEquals(1, cliente.methods.size());

        // Verify Cliente.id is PK and NOT NULL
        Map<String, Object> idAttr = cliente.attributes.stream()
                .filter(a -> "id".equals(a.get("name"))).findFirst().orElse(null);
        assertNotNull(idAttr);
        assertEquals("Long", idAttr.get("type"));
        assertEquals(true, idAttr.get("isPrimaryKey"));
        assertEquals(true, idAttr.get("isNotNull"));

        // Verify Relationships
        assertEquals(1, model.relationships.size());
        XmiImportService.RawRelationship rel = model.relationships.get(0);
        assertEquals("association", rel.type);
        assertEquals("class_cliente", rel.sourceXmiId);
        assertEquals("class_factura", rel.targetXmiId);
        assertEquals("1", rel.sourceCardinality);
        assertEquals("*", rel.targetCardinality);
        assertEquals("emisor", rel.sourceRole);
        assertEquals("facturas", rel.targetRole);

        // Verify Auto-Layout computed positions
        assertTrue(cliente.posX >= 0);
        assertTrue(cliente.posY >= 0);
    }

    @Test
    @DisplayName("Debe importar XMI como nuevo proyecto persistiendo entidades y registrando auditoría inmutable")
    void testImportAsNewProject_Success() {
        InputStream is = new ByteArrayInputStream(SAMPLE_XMI.getBytes(StandardCharsets.UTF_8));
        UUID userId = UUID.randomUUID();
        UserProfile user = UserProfile.builder().id(userId).email("arquitecto@sw1.com").build();

        when(userProfileRepository.findByEmail("arquitecto@sw1.com")).thenReturn(Optional.of(user));
        when(projectRepository.save(any(DiagramProject.class))).thenAnswer(invocation -> {
            DiagramProject p = invocation.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });
        when(classNodeRepository.save(any(ClassNode.class))).thenAnswer(invocation -> {
            ClassNode c = invocation.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        ImportXmiResponse response = xmiImportService.importAsNewProject(
                is,
                "Proyecto Importado",
                "arquitecto@sw1.com",
                "127.0.0.1",
                "Test-Client"
        );

        assertNotNull(response);
        assertNotNull(response.getProjectId());
        assertEquals("Proyecto Importado", response.getProjectName());
        assertEquals(2, response.getClassesCount());
        assertEquals(1, response.getRelationshipsCount());

        verify(projectRepository, times(1)).save(any(DiagramProject.class));
        verify(classNodeRepository, times(2)).save(any(ClassNode.class));
        verify(relationshipRepository, times(1)).save(any(Relationship.class));
        verify(auditLogService, times(1)).recordAction(
                eq(userId),
                eq("PROJECT_IMPORTED"),
                eq("diagram_projects"),
                eq(response.getProjectId()),
                eq("127.0.0.1"),
                eq("Test-Client"),
                any()
        );
    }

    @Test
    @DisplayName("Debe importar XMI en proyecto existente con reemplazo limpio (replaceCurrent=true)")
    void testImportIntoExistingProject_Success_WithReplace() {
        InputStream is = new ByteArrayInputStream(SAMPLE_XMI.getBytes(StandardCharsets.UTF_8));
        UUID projectId = UUID.randomUUID();
        DiagramProject existingProject = DiagramProject.builder().id(projectId).name("Proyecto Existente").build();

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(existingProject));
        when(classNodeRepository.save(any(ClassNode.class))).thenAnswer(invocation -> {
            ClassNode c = invocation.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        ImportXmiResponse response = xmiImportService.importIntoExistingProject(
                projectId,
                is,
                "arquitecto@sw1.com",
                "127.0.0.1",
                "Test-Client",
                true
        );

        assertNotNull(response);
        assertEquals(projectId, response.getProjectId());
        verify(relationshipRepository, times(1)).deleteByProjectId(projectId);
        verify(classNodeRepository, times(1)).deleteByProjectId(projectId);
        verify(classNodeRepository, times(2)).save(any(ClassNode.class));
        verify(relationshipRepository, times(1)).save(any(Relationship.class));
    }

    @Test
    @DisplayName("Debe lanzar excepción E1 si el archivo XMI está mal formado o corrupto")
    void testParseXmi_CorruptXml_ThrowsE1() {
        InputStream is = new ByteArrayInputStream("<not-valid-xml-content>".getBytes(StandardCharsets.UTF_8));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            xmiImportService.parseXmi(is);
        });

        assertTrue(ex.getMessage().contains("no tiene un formato XML/XMI válido"));
    }

    @Test
    @DisplayName("Debe lanzar excepción E1 si el archivo XMI no contiene clases")
    void testParseXmi_EmptyModel_ThrowsE1() {
        String emptyXmi = """
                <?xml version="1.0" encoding="UTF-8"?>
                <xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
                  <uml:Model xmi:id="model_empty" name="Modelo Vacio"/>
                </xmi:XMI>
                """;
        InputStream is = new ByteArrayInputStream(emptyXmi.getBytes(StandardCharsets.UTF_8));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            xmiImportService.parseXmi(is);
        });

        assertTrue(ex.getMessage().contains("no contiene clases o entidades"));
    }

    @Test
    @DisplayName("Debe calcular auto-layout por capas (Topological Layering) sin solapamiento de coordenadas")
    void testLayoutEngine_TopologicalLayering() {
        List<String> classes = Arrays.asList("A", "B", "C");
        List<LayoutEngineUtil.EdgeDefinition> edges = Arrays.asList(
                new LayoutEngineUtil.EdgeDefinition("A", "B"),
                new LayoutEngineUtil.EdgeDefinition("B", "C")
        );

        Map<String, LayoutEngineUtil.NodePosition> layout = LayoutEngineUtil.computeLayout(classes, edges, null);

        assertNotNull(layout);
        assertEquals(3, layout.size());

        // A is root (layer 0), B is layer 1, C is layer 2
        assertTrue(layout.get("A").y < layout.get("B").y);
        assertTrue(layout.get("B").y < layout.get("C").y);
    }

    @Test
    @DisplayName("Debe lanzar excepción si un usuario sin privilegios intenta importar en proyecto ajeno")
    void testImportIntoExistingProject_NonOwner_ThrowsDenied() {
        InputStream is = new ByteArrayInputStream(SAMPLE_XMI.getBytes(StandardCharsets.UTF_8));
        UUID projectId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID attackerId = UUID.randomUUID();

        DiagramProject existingProject = DiagramProject.builder()
                .id(projectId)
                .name("Proyecto Privado")
                .ownerId(ownerId)
                .build();

        UserProfile attacker = UserProfile.builder()
                .id(attackerId)
                .email("hacker@sw1.com")
                .role("COLABORADOR")
                .build();

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(existingProject));
        when(userProfileRepository.findByEmail("hacker@sw1.com")).thenReturn(Optional.of(attacker));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            xmiImportService.importIntoExistingProject(
                    projectId,
                    is,
                    "hacker@sw1.com",
                    "127.0.0.1",
                    "Test-Client",
                    true
            );
        });

        assertTrue(ex.getMessage().contains("No tienes privilegios"));
    }

    @Test
    @DisplayName("Debe manejar defensivamente multiplicidades con valores no numéricos sin arrojar NumberFormatException")
    void testParseXmi_NonNumericLowerValue_HandledGracefully() {
        String xmiWithNonNumeric = """
                <?xml version="1.0" encoding="UTF-8"?>
                <xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
                  <uml:Model xmi:id="model_nonnum" name="Modelo Robustez">
                    <packagedElement xmi:type="uml:Class" xmi:id="c1" name="Item">
                      <ownedAttribute xmi:type="uml:Property" xmi:id="a1" name="codigo">
                        <lowerValue xmi:type="uml:LiteralString" value="n"/>
                      </ownedAttribute>
                    </packagedElement>
                  </uml:Model>
                </xmi:XMI>
                """;

        InputStream is = new ByteArrayInputStream(xmiWithNonNumeric.getBytes(StandardCharsets.UTF_8));
        assertDoesNotThrow(() -> {
            ParsedXmiModel parsed = xmiImportService.parseXmi(is);
            assertNotNull(parsed);
            assertEquals(1, parsed.classes.size());
        });
    }
}
