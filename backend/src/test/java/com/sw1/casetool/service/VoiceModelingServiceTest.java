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
}

