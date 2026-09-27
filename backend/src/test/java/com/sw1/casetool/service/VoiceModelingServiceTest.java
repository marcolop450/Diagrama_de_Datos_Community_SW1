package com.sw1.casetool.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.ai.UmlMutationDto;
import com.sw1.casetool.dto.ai.VoiceModelingRequest;
import com.sw1.casetool.dto.ai.VoiceModelingResponse;
import com.sw1.casetool.model.AiPromptLog;
import com.sw1.casetool.repository.AiPromptLogRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.ai.CircuitBreakerAiService;
import com.sw1.casetool.service.ai.LocalNlpParser;
import com.sw1.casetool.service.ai.VoiceModelingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VoiceModelingServiceTest {

    private LocalNlpParser localNlpParser;
    private CircuitBreakerAiService circuitBreakerAiService;
    private VoiceModelingService voiceModelingService;

    @Mock
    private AiPromptLogRepository aiPromptLogRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private UserProfileRepository userProfileRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        localNlpParser = new LocalNlpParser();
        circuitBreakerAiService = new CircuitBreakerAiService(localNlpParser, objectMapper);
        voiceModelingService = new VoiceModelingService(
                circuitBreakerAiService,
                aiPromptLogRepository,
                auditLogService,
                userProfileRepository,
                objectMapper
        );
    }

    @Test
    @DisplayName("Local PLN: Crear clase con atributos tipados y defensa 1NF")
    void testLocalNlp_CreateClassWithAttributes() {
        String prompt = "Crear clase Factura con atributos total de tipo BigDecimal y fecha de tipo LocalDate";
        VoiceModelingResponse response = localNlpParser.parse(prompt, Collections.emptyList());

        assertTrue(response.isSuccess());
        assertEquals("CREATE_CLASS", response.getIntent());
        assertNotNull(response.getMutations());
        assertEquals(1, response.getMutations().size());

        UmlMutationDto mut = response.getMutations().get(0);
        assertEquals("CREATE_CLASS", mut.getAction());
        assertEquals("Factura", mut.getTargetClassName());

        Map<String, Object> classData = mut.getClassData();
        assertEquals("Factura", classData.get("name"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> attrs = (List<Map<String, Object>>) classData.get("attributes");
        assertNotNull(attrs);
        // Debe tener 3 atributos: id (PK 1NF inyectada) + total + fecha
        assertEquals(3, attrs.size());

        // Verificar PK sintetizada
        assertEquals("id", attrs.get(0).get("name"));
        assertTrue(Boolean.TRUE.equals(attrs.get(0).get("isPrimaryKey")));

        // Verificar total
        assertEquals("total", attrs.get(1).get("name"));
        assertEquals("BigDecimal", attrs.get(1).get("type"));

        // Verificar fecha
        assertEquals("fecha", attrs.get(2).get("name"));
        assertEquals("LocalDate", attrs.get(2).get("type"));
    }

    @Test
    @DisplayName("Local PLN: Agregar atributo a clase existente")
    void testLocalNlp_AddAttribute() {
        String prompt = "Agregar atributo telefono de tipo String a la clase Cliente";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Cliente"));

        assertTrue(response.isSuccess());
        assertEquals("ADD_ATTRIBUTES", response.getIntent());

        UmlMutationDto mut = response.getMutations().get(0);
        assertEquals("Cliente", mut.getTargetClassName());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> attrs = (List<Map<String, Object>>) mut.getClassData().get("attributes");
        assertEquals("telefono", attrs.get(0).get("name"));
        assertEquals("String", attrs.get(0).get("type"));
    }

    @Test
    @DisplayName("Local PLN: Conectar relación entre clases con multiplicidades")
    void testLocalNlp_ConnectRelationship() {
        String prompt = "Conectar Factura con Cliente de muchos a uno";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Factura", "Cliente"));

        assertTrue(response.isSuccess());
        assertEquals("CREATE_RELATIONSHIP", response.getIntent());

        UmlMutationDto mut = response.getMutations().get(0);
        Map<String, Object> rData = mut.getRelationshipData();
        assertEquals("Factura", rData.get("sourceClass"));
        assertEquals("Cliente", rData.get("targetClass"));
        assertEquals("ASSOCIATION", rData.get("type"));
        assertEquals("*", rData.get("sourceCardinality"));
        assertEquals("1", rData.get("targetCardinality"));
    }

    @Test
    @DisplayName("Local PLN: Generalización / Herencia")
    void testLocalNlp_Inheritance() {
        String prompt = "Estudiante hereda de Persona";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Estudiante", "Persona"));

        assertTrue(response.isSuccess());
        assertEquals("CREATE_RELATIONSHIP", response.getIntent());

        UmlMutationDto mut = response.getMutations().get(0);
        Map<String, Object> rData = mut.getRelationshipData();
        assertEquals("Estudiante", rData.get("sourceClass"));
        assertEquals("Persona", rData.get("targetClass"));
        assertEquals("GENERALIZATION", rData.get("type"));
    }

    @Test
    @DisplayName("Local PLN: Modificar modificador a clase abstracta")
    void testLocalNlp_MakeClassAbstract() {
        String prompt = "Hacer la clase Persona abstracta";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Persona"));

        assertTrue(response.isSuccess());
        assertEquals("UPDATE_CLASS", response.getIntent());

        UmlMutationDto mut = response.getMutations().get(0);
        assertEquals("Persona", mut.getTargetClassName());
        assertTrue(Boolean.TRUE.equals(mut.getClassData().get("isAbstract")));
    }

    @Test
    @DisplayName("VoiceModelingService: Procesamiento end-to-end con auditoría y log de IA")
    void testProcessVoiceCommand_Success() {
        UUID projId = UUID.randomUUID();
        VoiceModelingRequest request = VoiceModelingRequest.builder()
                .projectId(projId)
                .transcript("Crear clase Medico con atributos nombre String y especialidad String")
                .currentClasses(Collections.emptyList())
                .build();

        when(aiPromptLogRepository.save(any(AiPromptLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VoiceModelingResponse response = voiceModelingService.processVoiceCommand(
                request,
                "arquitecto@sw1.com",
                "192.168.1.50",
                "Mozilla/5.0"
        );

        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertEquals("CREATE_CLASS", response.getIntent());

        // Verificar que se guardó en ai_prompt_logs
        verify(aiPromptLogRepository, times(1)).save(any(AiPromptLog.class));

        // Verificar que se registró en audit_logs
        verify(auditLogService, times(1)).recordAction(
                any(),
                eq("VOICE_MODELING_EXECUTED"),
                eq("ai_prompt_logs"),
                eq(projId),
                eq("192.168.1.50"),
                eq("Mozilla/5.0"),
                any()
        );
    }

    @Test
    @DisplayName("VoiceModelingService: Transcripción vacía arroja excepción (Regla E1)")
    void testProcessVoiceCommand_EmptyTranscript_ThrowsException() {
        VoiceModelingRequest request = VoiceModelingRequest.builder()
                .transcript("   ")
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                voiceModelingService.processVoiceCommand(request, "user@test.com", "127.0.0.1", "Agent")
        );
    }

    @Test
    @DisplayName("Local PLN: Comando compuesto crear tabla y conectar con otra (Prompt Usuario)")
    void testLocalNlp_CompoundCreateAndConnect_UserPrompt() {
        String prompt = "generame una tabla llamado gatos conectado con la tabla estudiante";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Estudiante"));

        assertTrue(response.isSuccess());
        assertEquals("CREATE_CLASS_AND_RELATIONSHIP", response.getIntent());
        assertNotNull(response.getMutations());
        assertEquals(2, response.getMutations().size());

        // Mutación 1: Crear Clase Gatos
        UmlMutationDto mutClass = response.getMutations().get(0);
        assertEquals("CREATE_CLASS", mutClass.getAction());
        assertEquals("Gatos", mutClass.getTargetClassName());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> attrs = (List<Map<String, Object>>) mutClass.getClassData().get("attributes");
        assertNotNull(attrs);
        assertEquals(1, attrs.size());
        assertEquals("id", attrs.get(0).get("name"));
        assertTrue(Boolean.TRUE.equals(attrs.get(0).get("isPrimaryKey")));

        // Mutación 2: Conectar Relación con Estudiante
        UmlMutationDto mutRel = response.getMutations().get(1);
        assertEquals("CREATE_RELATIONSHIP", mutRel.getAction());
        Map<String, Object> rData = mutRel.getRelationshipData();
        assertEquals("Gatos", rData.get("sourceClass"));
        assertEquals("Estudiante", rData.get("targetClass"));
        assertEquals("ASSOCIATION", rData.get("type"));
        assertEquals("1", rData.get("sourceCardinality"));
        assertEquals("*", rData.get("targetCardinality"));
    }

    @Test
    @DisplayName("Local PLN: Modificar tabla existente agregando múltiples campos")
    void testLocalNlp_ModifyClassAddAttributes() {
        String prompt = "modificar la tabla estudiante agregando los campos telefono String y direccion String";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Estudiante"));

        assertTrue(response.isSuccess());
        assertEquals("ADD_ATTRIBUTES", response.getIntent());
        assertNotNull(response.getMutations());
        assertEquals(1, response.getMutations().size());

        UmlMutationDto mut = response.getMutations().get(0);
        assertEquals("ADD_ATTRIBUTES", mut.getAction());
        assertEquals("Estudiante", mut.getTargetClassName());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> attrs = (List<Map<String, Object>>) mut.getClassData().get("attributes");
        assertNotNull(attrs);
        assertEquals(2, attrs.size());
        assertEquals("telefono", attrs.get(0).get("name"));
        assertEquals("String", attrs.get(0).get("type"));
        assertEquals("direccion", attrs.get(1).get("name"));
        assertEquals("String", attrs.get(1).get("type"));
    }

    @Test
    @DisplayName("Local PLN: Crear tabla con id, nombre y fecha conectado a estudiante sin stop words")
    void testLocalNlp_CompoundWithExplicitAttributes() {
        String prompt = "generame una tabla llamado gatos con id, nombre y fecha conectado con la tabla estudiante";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Estudiante"));

        assertTrue(response.isSuccess());
        assertEquals("CREATE_CLASS_AND_RELATIONSHIP", response.getIntent());
        assertNotNull(response.getMutations());
        assertEquals(2, response.getMutations().size());

        UmlMutationDto mutClass = response.getMutations().get(0);
        assertEquals("CREATE_CLASS", mutClass.getAction());
        assertEquals("Gatos", mutClass.getTargetClassName());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> attrs = (List<Map<String, Object>>) mutClass.getClassData().get("attributes");
        assertNotNull(attrs);
        assertEquals(3, attrs.size());

        // id
        assertEquals("id", attrs.get(0).get("name"));
        assertEquals("Long", attrs.get(0).get("type"));
        assertTrue(Boolean.TRUE.equals(attrs.get(0).get("isPrimaryKey")));

        // nombre
        assertEquals("nombre", attrs.get(1).get("name"));
        assertEquals("String", attrs.get(1).get("type"));

        // fecha -> deducido inteligentemente como LocalDate
        assertEquals("fecha", attrs.get(2).get("name"));
        assertEquals("LocalDate", attrs.get(2).get("type"));

        // Verificar que ninguna stop-word ("que", "de", "con", "la") se convirtió en atributo
        for (Map<String, Object> attr : attrs) {
            String name = (String) attr.get("name");
            assertNotEquals("que", name);
            assertNotEquals("de", name);
            assertNotEquals("con", name);
            assertNotEquals("la", name);
        }

        // Relación
        UmlMutationDto mutRel = response.getMutations().get(1);
        assertEquals("CREATE_RELATIONSHIP", mutRel.getAction());
        Map<String, Object> rData = mutRel.getRelationshipData();
        assertEquals("Gatos", rData.get("sourceClass"));
        assertEquals("Estudiante", rData.get("targetClass"));
    }

    @Test
    @DisplayName("Local PLN: Conectar relación con verbo imperativo y multiplicidad uno a uno")
    void testLocalNlp_ConnectImperativeOneToOne() {
        String prompt = "conecta la tabla estudiante con la tabla docente de uno a uno";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Estudiante", "Docente"));

        assertTrue(response.isSuccess());
        assertEquals("CREATE_RELATIONSHIP", response.getIntent());
        assertNotNull(response.getMutations());
        assertEquals(1, response.getMutations().size());

        UmlMutationDto mut = response.getMutations().get(0);
        Map<String, Object> rData = mut.getRelationshipData();
        assertEquals("Estudiante", rData.get("sourceClass"));
        assertEquals("Docente", rData.get("targetClass"));
        assertEquals("ASSOCIATION", rData.get("type"));
        assertEquals("1", rData.get("sourceCardinality"));
        assertEquals("1", rData.get("targetCardinality"));
    }

    @Test
    @DisplayName("Local PLN: Comando compuesto iniciando con 'la clase' y atributos al final")
    void testLocalNlp_CompoundWithoutExplicitCreateVerb_WithTrailingAttributes() {
        String prompt = "la clase gato y conecta con la clase estudiante clase gato tendrá id, nombre y apellido";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Estudiante"));

        assertTrue(response.isSuccess());
        assertEquals("CREATE_CLASS_AND_RELATIONSHIP", response.getIntent());
        assertNotNull(response.getMutations());
        assertEquals(2, response.getMutations().size());

        UmlMutationDto mutClass = response.getMutations().get(0);
        assertEquals("CREATE_CLASS", mutClass.getAction());
        assertEquals("Gato", mutClass.getTargetClassName());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> attrs = (List<Map<String, Object>>) mutClass.getClassData().get("attributes");
        assertNotNull(attrs);
        assertTrue(attrs.size() >= 3);
        assertEquals("id", attrs.get(0).get("name"));
        assertTrue(Boolean.TRUE.equals(attrs.get(0).get("isPrimaryKey")));

        UmlMutationDto mutRel = response.getMutations().get(1);
        assertEquals("CREATE_RELATIONSHIP", mutRel.getAction());
        Map<String, Object> rData = mutRel.getRelationshipData();
        assertEquals("Gato", rData.get("sourceClass"));
        assertEquals("Estudiante", rData.get("targetClass"));
    }

    @Test
    @DisplayName("Local PLN: Relación Muchos a Muchos descompone directamente en tabla intermedia (Opción B)")
    void testLocalNlp_ManyToMany_DecomposesToIntermediateTable() {
        String prompt = "conectar Estudiante con Materia de muchos a muchos";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Estudiante", "Materia"));

        assertTrue(response.isSuccess());
        assertEquals("CREATE_CLASS_AND_RELATIONSHIP", response.getIntent());
        assertNotNull(response.getMutations());
        assertEquals(3, response.getMutations().size());

        // Mutación 0: Clase Intermedia EstudianteMateria
        UmlMutationDto mutClass = response.getMutations().get(0);
        assertEquals("CREATE_CLASS", mutClass.getAction());
        assertEquals("EstudianteMateria", mutClass.getTargetClassName());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> attrs = (List<Map<String, Object>>) mutClass.getClassData().get("attributes");
        assertNotNull(attrs);
        assertEquals(3, attrs.size());
        assertEquals("id", attrs.get(0).get("name"));
        assertTrue(Boolean.TRUE.equals(attrs.get(0).get("isPrimaryKey")));
        assertEquals("estudiante_id", attrs.get(1).get("name"));
        assertTrue(Boolean.TRUE.equals(attrs.get(1).get("isForeignKey")));
        assertEquals("materia_id", attrs.get(2).get("name"));
        assertTrue(Boolean.TRUE.equals(attrs.get(2).get("isForeignKey")));

        // Mutaciones 1 y 2: Relaciones 1 a *
        UmlMutationDto rel1 = response.getMutations().get(1);
        assertEquals("CREATE_RELATIONSHIP", rel1.getAction());
        assertEquals("Estudiante", rel1.getRelationshipData().get("sourceClass"));
        assertEquals("EstudianteMateria", rel1.getRelationshipData().get("targetClass"));
        assertEquals("1", rel1.getRelationshipData().get("sourceCardinality"));
        assertEquals("*", rel1.getRelationshipData().get("targetCardinality"));

        UmlMutationDto rel2 = response.getMutations().get(2);
        assertEquals("CREATE_RELATIONSHIP", rel2.getAction());
        assertEquals("Materia", rel2.getRelationshipData().get("sourceClass"));
        assertEquals("EstudianteMateria", rel2.getRelationshipData().get("targetClass"));
        assertEquals("1", rel2.getRelationshipData().get("sourceCardinality"));
        assertEquals("*", rel2.getRelationshipData().get("targetCardinality"));
    }

    @Test
    @DisplayName("Local PLN: Relación Muchos a Muchos con tabla intermedia personalizada")
    void testLocalNlp_ManyToMany_CustomIntermediateTableName() {
        String prompt = "relacionar Estudiante con Materia con tabla intermedia Inscripcion con atributos fecha LocalDate";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Estudiante", "Materia"));

        assertTrue(response.isSuccess());
        assertEquals("CREATE_CLASS_AND_RELATIONSHIP", response.getIntent());
        assertNotNull(response.getMutations());
        assertEquals(3, response.getMutations().size());

        UmlMutationDto mutClass = response.getMutations().get(0);
        assertEquals("Inscripcion", mutClass.getTargetClassName());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> attrs = (List<Map<String, Object>>) mutClass.getClassData().get("attributes");
        assertTrue(attrs.stream().anyMatch(a -> "fecha".equals(a.get("name")) && "LocalDate".equals(a.get("type"))));
    }

    @Test
    @DisplayName("Local PLN: Eliminar relación entre dos clases")
    void testLocalNlp_DeleteRelationship() {
        String prompt = "eliminar relacion entre Estudiante y Materia";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Estudiante", "Materia"));

        assertTrue(response.isSuccess());
        assertEquals("DELETE_RELATIONSHIP", response.getIntent());
        assertEquals(1, response.getMutations().size());
        UmlMutationDto mut = response.getMutations().get(0);
        assertEquals("DELETE_RELATIONSHIP", mut.getAction());
        assertEquals("Estudiante", mut.getRelationshipData().get("sourceClass"));
        assertEquals("Materia", mut.getRelationshipData().get("targetClass"));
    }

    @Test
    @DisplayName("Local PLN: Eliminar atributo de clase")
    void testLocalNlp_DeleteAttribute() {
        String prompt = "eliminar atributo telefono de la clase Cliente";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Cliente"));

        assertTrue(response.isSuccess());
        assertEquals("DELETE_ATTRIBUTE", response.getIntent());
        assertEquals(1, response.getMutations().size());
        UmlMutationDto mut = response.getMutations().get(0);
        assertEquals("DELETE_ATTRIBUTE", mut.getAction());
        assertEquals("Cliente", mut.getTargetClassName());
        assertEquals("telefono", mut.getDetails());
    }

    @Test
    @DisplayName("Local PLN: Eliminar método de clase")
    void testLocalNlp_DeleteMethod() {
        String prompt = "eliminar metodo calcularTotal de la clase Factura";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Factura"));

        assertTrue(response.isSuccess());
        assertEquals("DELETE_METHOD", response.getIntent());
        assertEquals(1, response.getMutations().size());
        UmlMutationDto mut = response.getMutations().get(0);
        assertEquals("DELETE_METHOD", mut.getAction());
        assertEquals("Factura", mut.getTargetClassName());
        assertEquals("calcularTotal", mut.getDetails());
    }

    @Test
    @DisplayName("Local PLN: Renombrar clase")
    void testLocalNlp_RenameClass() {
        String prompt = "renombrar clase Factura a Recibo";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Factura"));

        assertTrue(response.isSuccess());
        assertEquals("RENAME_CLASS", response.getIntent());
        assertEquals(1, response.getMutations().size());
        UmlMutationDto mut = response.getMutations().get(0);
        assertEquals("RENAME_CLASS", mut.getAction());
        assertEquals("Factura", mut.getTargetClassName());
        assertEquals("Recibo", mut.getDetails());
    }

    @Test
    @DisplayName("Local PLN: Modificar tipo de atributo")
    void testLocalNlp_UpdateAttributeType() {
        String prompt = "modificar atributo total en Factura a tipo Double";
        VoiceModelingResponse response = localNlpParser.parse(prompt, List.of("Factura"));

        assertTrue(response.isSuccess());
        assertEquals("UPDATE_ATTRIBUTE", response.getIntent());
        assertEquals(1, response.getMutations().size());
        UmlMutationDto mut = response.getMutations().get(0);
        assertEquals("UPDATE_ATTRIBUTE", mut.getAction());
        assertEquals("Factura", mut.getTargetClassName());
    }

    @Test
    @DisplayName("VoiceModelingService.postProcessMutations: Decompone relación M:N cruda de LLM en tabla intermedia")
    void testPostProcessMutations_DecomposesRawManyToManyFromLlm() {
        Map<String, Object> rData = new HashMap<>();
        rData.put("sourceClass", "Venta");
        rData.put("targetClass", "Producto");
        rData.put("type", "ASSOCIATION");
        rData.put("sourceCardinality", "*");
        rData.put("targetCardinality", "*");
        rData.put("label", "Detalle");

        UmlMutationDto rawRelMut = UmlMutationDto.builder()
                .action("CREATE_RELATIONSHIP")
                .relationshipData(rData)
                .build();

        VoiceModelingResponse resp = new VoiceModelingResponse();
        resp.setMutations(new ArrayList<>(List.of(rawRelMut)));

        voiceModelingService.postProcessMutations(resp);

        assertNotNull(resp.getMutations());
        assertEquals(3, resp.getMutations().size());

        UmlMutationDto mutClass = resp.getMutations().get(0);
        assertEquals("CREATE_CLASS", mutClass.getAction());
        assertEquals("Detalle", mutClass.getTargetClassName());

        UmlMutationDto rel1 = resp.getMutations().get(1);
        assertEquals("CREATE_RELATIONSHIP", rel1.getAction());
        assertEquals("Venta", rel1.getRelationshipData().get("sourceClass"));
        assertEquals("Detalle", rel1.getRelationshipData().get("targetClass"));

        UmlMutationDto rel2 = resp.getMutations().get(2);
        assertEquals("CREATE_RELATIONSHIP", rel2.getAction());
        assertEquals("Producto", rel2.getRelationshipData().get("sourceClass"));
        assertEquals("Detalle", rel2.getRelationshipData().get("targetClass"));
    }
}

