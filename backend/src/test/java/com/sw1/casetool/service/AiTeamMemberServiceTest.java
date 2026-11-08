package com.sw1.casetool.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.ai.AiTeamResponseDto;
import com.sw1.casetool.dto.ai.UmlMutationDto;
import com.sw1.casetool.dto.ai.VoiceModelingRequest;
import com.sw1.casetool.dto.ai.VoiceModelingResponse;
import com.sw1.casetool.model.CollaborationSession;
import com.sw1.casetool.repository.AiPromptLogRepository;
import com.sw1.casetool.repository.CollaborationSessionRepository;
import com.sw1.casetool.service.ai.AiTeamMemberService;
import com.sw1.casetool.service.ai.CircuitBreakerAiService;
import com.sw1.casetool.service.ai.VoiceModelingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiTeamMemberServiceTest {

    @Mock
    private CircuitBreakerAiService circuitBreakerAiService;

    @Mock
    private VoiceModelingService voiceModelingService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private CollaborationSessionRepository sessionRepository;

    @Mock
    private AiPromptLogRepository aiPromptLogRepository;

    @Mock
    private com.sw1.casetool.repository.DiagramProjectRepository projectRepository;

    @Mock
    private com.sw1.casetool.repository.SessionParticipantRepository participantRepository;

    @Mock
    private com.sw1.casetool.repository.UserProfileRepository userProfileRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private AiTeamMemberService aiTeamMemberService;

    private final UUID sampleUserId = UUID.randomUUID();
    private final String sampleRoomCode = "SW1-902";

    @BeforeEach
    void setUp() {
        aiTeamMemberService = new AiTeamMemberService(
                circuitBreakerAiService,
                voiceModelingService,
                messagingTemplate,
                sessionRepository,
                aiPromptLogRepository,
                objectMapper,
                projectRepository,
                participantRepository,
                userProfileRepository
        );
    }

    @Test
    @DisplayName("CU14-T01: Consulta teórica sobre atributo derivado debe responder con fundamentación formal UML sin alterar el lienzo")
    void testTheoryQuestionDerivedAttribute() {
        // Arrange
        when(circuitBreakerAiService.executeChatTextCompletionDetailed(any(), any(), any())).thenReturn(null); // Simula fallback local

        // Act
        AiTeamResponseDto response = aiTeamMemberService.processTeamAiMessage(
                sampleRoomCode,
                sampleUserId,
                "Marco",
                "@ai ¿Qué es un atributo derivado y cómo se modela en UML?",
                Collections.emptyMap()
        );

        // Assert
        assertNotNull(response);
        assertEquals(AiTeamResponseDto.Intent.THEORY_EXPLANATION, response.getIntent());
        assertNull(response.getMutations(), "Una consulta teórica nunca debe emitir mutaciones al lienzo");
        assertTrue(response.getChatResponse().contains("Atributo Derivado"), "Debe contener el concepto de atributo derivado");
        assertTrue(response.getChatResponse().contains("/nombreAtributo"), "Debe detallar la notación estándar / en UML");
        assertTrue(response.getChatResponse().contains("@Transient"), "Debe incluir el mapeo hacia JPA/Hibernate");
    }

    @Test
    @DisplayName("CU14-T02: Consulta sobre Agregación vs Composición debe explicar la semántica todo-parte y ciclo de vida")
    void testTheoryQuestionAggregationVsComposition() {
        // Arrange
        when(circuitBreakerAiService.executeChatTextCompletionDetailed(any(), any(), any())).thenReturn(null);

        // Act
        AiTeamResponseDto response = aiTeamMemberService.processTeamAiMessage(
                sampleRoomCode,
                sampleUserId,
                "Pedro",
                "@ai cual es la diferencia entre agregacion y composicion?",
                Collections.emptyMap()
        );

        // Assert
        assertNotNull(response);
        assertEquals(AiTeamResponseDto.Intent.THEORY_EXPLANATION, response.getIntent());
        assertTrue(response.getChatResponse().contains("Agregación (Débil)"));
        assertTrue(response.getChatResponse().contains("Composición (Fuerte)"));
        assertTrue(response.getChatResponse().contains("rombo"));
    }

    @Test
    @DisplayName("CU14-T03: Inducción de sesión (Catch-Up) debe sintetizar las entidades y relaciones del grafo actual")
    void testCatchUpSummary() {
        // Arrange: Creamos un snapshot con 2 clases y 1 relación
        Map<String, Object> node1 = Map.of("id", "n-1", "data", Map.of("name", "Cliente"));
        Map<String, Object> node2 = Map.of("id", "n-2", "data", Map.of("name", "Pedido"));
        Map<String, Object> edge1 = Map.of("id", "e-1", "source", "n-1", "target", "n-2");

        Map<String, Object> snapshot = Map.of(
                "nodes", List.of(node1, node2),
                "edges", List.of(edge1)
        );

        // Act
        AiTeamResponseDto response = aiTeamMemberService.processTeamAiMessage(
                sampleRoomCode,
                sampleUserId,
                "Ana",
                "@ai resumen de la sesión colaborativa",
                snapshot
        );

        // Assert
        assertNotNull(response);
        assertEquals(AiTeamResponseDto.Intent.CATCH_UP_SUMMARY, response.getIntent());
        assertTrue(response.getChatResponse().contains("Cliente"));
        assertTrue(response.getChatResponse().contains("Pedido"));
        assertTrue(response.getChatResponse().contains("2"));
        assertNull(response.getMutations());
    }

    @Test
    @DisplayName("CU14-T04: Auditoría de consistencia debe detectar clases huérfanas e infracciones de clave primaria 1NF")
    void testConsistencyAuditWithOrphanAndNoPk() {
        // Arrange: Una clase sin {PK} y sin conexiones (huérfana)
        Map<String, Object> nodeOrphan = Map.of(
                "id", "n-orphan",
                "data", Map.of(
                        "name", "BitacoraTemporal",
                        "attributes", List.of(Map.of("name", "descripcion", "type", "String"))
                )
        );

        Map<String, Object> snapshot = Map.of(
                "nodes", List.of(nodeOrphan),
                "edges", Collections.emptyList()
        );

        // Act
        AiTeamResponseDto response = aiTeamMemberService.processTeamAiMessage(
                sampleRoomCode,
                sampleUserId,
                "Carlos",
                "@ai auditar inconsistencias del modelo",
                snapshot
        );

        // Assert
        assertNotNull(response);
        assertEquals(AiTeamResponseDto.Intent.CONSISTENCY_AUDIT, response.getIntent());
        assertTrue(response.getChatResponse().contains("huérfana"));
        assertTrue(response.getChatResponse().contains("Infracción 1NF"));
        assertTrue(response.getChatResponse().contains("BitacoraTemporal"));
    }

    @Test
    @DisplayName("CU14-T08: Auditoría debe detectar entidad con campo id sin bandera {PK} y proponer auto-reparación")
    void testAuditDetectsEntityWithIdFieldWithoutPkFlagAndOffersRepair() {
        // Arrange: Clase Pago tiene campo 'id' pero isPrimaryKey es false
        Map<String, Object> nodePago = Map.of(
                "id", "c-pago",
                "data", Map.of(
                        "name", "Pago",
                        "attributes", List.of(
                                Map.of("name", "id", "type", "Long", "isPrimaryKey", false, "isId", false),
                                Map.of("name", "monto", "type", "Double") // también smell de tipo
                        )
                )
        );

        Map<String, Object> snapshot = Map.of(
                "nodes", List.of(nodePago),
                "edges", Collections.emptyList()
        );

        // Act
        AiTeamResponseDto response = aiTeamMemberService.processTeamAiMessage(
                sampleRoomCode,
                sampleUserId,
                "Marco",
                "@ai auditar",
                snapshot
        );

        // Assert
        assertNotNull(response);
        assertEquals(AiTeamResponseDto.Intent.CONSISTENCY_AUDIT, response.getIntent());
        assertTrue(response.getChatResponse().contains("Infracción 1NF"));
        assertTrue(response.getChatResponse().contains("Pago"));
        assertTrue(response.getChatResponse().contains("Plan de Auto-Reparación Preparado"));
        assertTrue(response.getChatResponse().contains("@ai si"));
    }

    @Test
    @DisplayName("CU14-T09: Flujo conversacional '@ai si' aplica las correcciones guardadas en memoria")
    void testInteractiveRepairExecution() {
        // Arrange: Paso 1, auditar para cargar el plan en memoria
        Map<String, Object> nodePago = Map.of(
                "id", "c-pago",
                "data", Map.of(
                        "name", "Pago",
                        "attributes", List.of(
                                Map.of("name", "id", "type", "Long", "isPrimaryKey", false)
                        )
                )
        );

        Map<String, Object> snapshot = Map.of("nodes", List.of(nodePago), "edges", Collections.emptyList());
        aiTeamMemberService.processTeamAiMessage(sampleRoomCode, sampleUserId, "Marco", "@ai auditar", snapshot);

        // Act: Paso 2, confirmar reparación con "@ai si"
        AiTeamResponseDto repairResponse = aiTeamMemberService.processTeamAiMessage(
                sampleRoomCode,
                sampleUserId,
                "Marco",
                "@ai si",
                Collections.emptyMap()
        );

        // Assert
        assertNotNull(repairResponse);
        assertEquals(AiTeamResponseDto.Intent.APPLY_REPAIR, repairResponse.getIntent());
        assertNotNull(repairResponse.getMutations());
        assertFalse(repairResponse.getMutations().isEmpty());
        assertEquals("Pago", repairResponse.getMutations().get(0).getTargetClassName());
        assertTrue(repairResponse.getChatResponse().contains("Auto-Reparación de Inconsistencias Aplicada"));
    }

    @Test
    @DisplayName("CU14-T05: Modelado estructural por IA debe producir mutaciones con defensa 1NF y confirmación con Ctrl+Z")
    void testStructuralModelingMutation() {
        // Arrange
        UmlMutationDto mut = UmlMutationDto.builder()
                .action("CREATE_CLASS")
                .targetClassName("Factura")
                .classData(Map.of("name", "Factura", "attributes", List.of(
                        Map.of("name", "id", "type", "Long", "isPrimaryKey", true),
                        Map.of("name", "total", "type", "BigDecimal", "isPrimaryKey", false)
                )))
                .details("Clase 'Factura' creada con clave primaria 1NF {PK} id: Long.")
                .build();

        VoiceModelingResponse vmResp = VoiceModelingResponse.builder()
                .intent("CREATE_CLASS")
                .success(true)
                .mutations(List.of(mut))
                .providerUsed("LocalNlpParser")
                .build();

        when(voiceModelingService.processVoiceCommand(any(VoiceModelingRequest.class), any(), anyString(), anyString()))
                .thenReturn(vmResp);

        // Act
        AiTeamResponseDto response = aiTeamMemberService.processTeamAiMessage(
                sampleRoomCode,
                sampleUserId,
                "Marco",
                "@ai crear la tabla Factura con id Long y total BigDecimal",
                Collections.emptyMap()
        );

        // Assert
        assertNotNull(response);
        assertEquals(AiTeamResponseDto.Intent.STRUCTURAL_MUTATION, response.getIntent());
        assertNotNull(response.getMutations());
        assertEquals(1, response.getMutations().size());
        assertEquals("Factura", response.getMutations().get(0).getTargetClassName());
        assertTrue(response.getChatResponse().contains("Ctrl+Z"), "Debe informar la reversibilidad con Ctrl+Z");
    }

    @Test
    @DisplayName("CU14-T06: Preguntas fuera de alcance deben ser declinadas amablemente recordando el rol de co-desarrollador")
    void testOutOfScopeQuery() {
        // Act
        AiTeamResponseDto response = aiTeamMemberService.processTeamAiMessage(
                sampleRoomCode,
                sampleUserId,
                "Lucas",
                "@ai cuál es la mejor receta para cocinar pizza italiana?",
                Collections.emptyMap()
        );

        // Assert
        assertNotNull(response);
        assertEquals(AiTeamResponseDto.Intent.OUT_OF_SCOPE, response.getIntent());
        assertTrue(response.getChatResponse().contains("Asistente Co-Desarrollador de Software"));
        assertTrue(response.getChatResponse().contains("UML 2.5+"));
        assertNull(response.getMutations());
    }

    @Test
    @DisplayName("CU14-T07: Mención vacía @ai debe responder con guía de comandos didáctica")
    void testEmptyMentionGuidance() {
        // Act
        AiTeamResponseDto response = aiTeamMemberService.processTeamAiMessage(
                sampleRoomCode,
                sampleUserId,
                "Elena",
                "@ai",
                Collections.emptyMap()
        );

        // Assert
        assertNotNull(response);
        assertTrue(response.getChatResponse().contains("Consultoría teórica"));
        assertTrue(response.getChatResponse().contains("Modelado de clases"));
        assertTrue(response.getChatResponse().contains("@ai resumen"));
    }

    @Test
    @DisplayName("CU14-T10: Consulta conceptual sobre Base de Datos con acentos no debe ser rechazada como fuera de alcance")
    void testTheoryQuestionDatabase() {
        // Arrange
        when(circuitBreakerAiService.executeChatTextCompletionDetailed(any(), any(), any())).thenReturn(null); // Fallback local

        // Act
        AiTeamResponseDto response = aiTeamMemberService.processTeamAiMessage(
                sampleRoomCode,
                sampleUserId,
                "Arquitecto",
                "@ai ¿Qué es una Base de datos?",
                Collections.emptyMap()
        );

        // Assert
        assertNotNull(response);
        assertEquals(AiTeamResponseDto.Intent.THEORY_EXPLANATION, response.getIntent(), "Una consulta sobre Base de Datos debe ser clasificada como consultoría técnica");
        assertTrue(response.getChatResponse().contains("Base de Datos"));
        assertTrue(response.getChatResponse().contains("ACID"));
    }

    @Test
    @DisplayName("CU14-T11: Comando '@ai guardar el proyecto' debe reconocer PROJECT_ACTION con actionType SAVE_PROJECT sin alucinar código JPA")
    void testProjectActionSaveProject() {
        AiTeamResponseDto response = aiTeamMemberService.processTeamAiMessage(
                sampleRoomCode,
                sampleUserId,
                "Marco",
                "@ai guardar el proyecto",
                Collections.emptyMap()
        );

        assertNotNull(response);
        assertEquals(AiTeamResponseDto.Intent.PROJECT_ACTION, response.getIntent());
        assertEquals("SAVE_PROJECT", response.getActionType());
        assertTrue(response.getChatResponse().contains("Guardado Exitosamente"));
    }

    @Test
    @DisplayName("CU14-T12: Comando '@ai exportar backend' debe clasificar PROJECT_ACTION con format BACKEND_ZIP")
    void testProjectActionExportBackend() {
        AiTeamResponseDto response = aiTeamMemberService.processTeamAiMessage(
                sampleRoomCode,
                sampleUserId,
                "Marco",
                "@ai exportar backend spring boot",
                Collections.emptyMap()
        );

        assertNotNull(response);
        assertEquals(AiTeamResponseDto.Intent.PROJECT_ACTION, response.getIntent());
        assertEquals("EXPORT_BACKEND", response.getActionType());
        assertNotNull(response.getActionData());
        assertEquals("BACKEND_ZIP", response.getActionData().get("format"));
    }

    @Test
    @DisplayName("CU14-T13: Catch-Up (@ai resumen) debe reportar eventos cronológicos de la sesión y métricas 1NF")
    void testCatchUpSummaryWithRecordedEvents() {
        // Registrar eventos en la sesión
        aiTeamMemberService.recordSessionEvent(sampleRoomCode, "Marco", "NODE_CREATE", "Modeló la clase Venta");
        aiTeamMemberService.recordSessionEvent(sampleRoomCode, "Marco", "EDGE_CREATE", "Conectó Cliente -> Venta (1..*)");

        Map<String, Object> node = Map.of(
                "id", "node-1",
                "data", Map.of(
                        "name", "Cliente",
                        "stereotype", "entity",
                        "attributes", List.of(Map.of("name", "id", "type", "Long", "isPrimaryKey", true))
                )
        );
        Map<String, Object> snapshot = Map.of("nodes", List.of(node), "edges", Collections.emptyList());

        AiTeamResponseDto response = aiTeamMemberService.processTeamAiMessage(
                sampleRoomCode,
                sampleUserId,
                "Ana",
                "@ai resumen",
                snapshot
        );

        assertNotNull(response);
        assertEquals(AiTeamResponseDto.Intent.CATCH_UP_SUMMARY, response.getIntent());
        assertTrue(response.getChatResponse().contains("Puesta al Día de Sesión (Catch-Up)"));
        assertTrue(response.getChatResponse().contains("Actividad Realizada Durante Esta Sesión"));
        assertTrue(response.getChatResponse().contains("Modeló la clase Venta"));
        assertTrue(response.getChatResponse().contains("Cobertura 1NF"));
    }
}
