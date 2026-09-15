package com.sw1.casetool.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.ai.UmlMutationDto;
import com.sw1.casetool.dto.ai.VoiceModelingResponse;
import com.sw1.casetool.model.AiPromptLog;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.AiPromptLogRepository;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.ai.CircuitBreakerAiService;
import com.sw1.casetool.service.ai.VoiceModelingService;
import com.sw1.casetool.service.ai.WhiteboardVisionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WhiteboardVisionServiceTest {

    @Mock
    private CircuitBreakerAiService circuitBreakerAiService;

    @Mock
    private VoiceModelingService voiceModelingService;

    @Mock
    private AiPromptLogRepository aiPromptLogRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private DiagramProjectRepository diagramProjectRepository;

    @Mock
    private ClassNodeRepository classNodeRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private WhiteboardVisionService whiteboardVisionService;

    @BeforeEach
    void setUp() {
        whiteboardVisionService = new WhiteboardVisionService(
                circuitBreakerAiService,
                voiceModelingService,
                aiPromptLogRepository,
                auditLogService,
                userProfileRepository,
                diagramProjectRepository,
                classNodeRepository,
                objectMapper
        );
    }

    @Test
    @DisplayName("CU17: Digitalizacion de pizarra exitosa con 1NF Defense y Auto-Layout Jerarquico")
    void testDigitizeWhiteboard_Success() {
        UUID projectId = UUID.randomUUID();
        DiagramProject project = DiagramProject.builder()
                .id(projectId)
                .name("Sistema Hospitalario")
                .build();
        when(diagramProjectRepository.findById(projectId)).thenReturn(Optional.of(project));

        UserProfile user = UserProfile.builder()
                .id(UUID.randomUUID())
                .email("architect@casetool.com")
                .build();
        when(userProfileRepository.findByEmail("architect@casetool.com")).thenReturn(Optional.of(user));

        // Mock mutaciones detectadas por IA
        Map<String, Object> attrNombre = new HashMap<>();
        attrNombre.put("name", "nombreCompleto");
        attrNombre.put("type", "String");
        attrNombre.put("visibility", "-");

        List<Map<String, Object>> attrsList = new ArrayList<>();
        attrsList.add(attrNombre);

        Map<String, Object> pacienteData = new HashMap<>();
        pacienteData.put("name", "Paciente");
        pacienteData.put("attributes", attrsList);
        pacienteData.put("methods", new ArrayList<>());

        UmlMutationDto mutClass1 = UmlMutationDto.builder()
                .action("CREATE_CLASS")
                .targetClassName("Paciente")
                .classData(pacienteData)
                .build();

        Map<String, Object> consultaData = new HashMap<>();
        consultaData.put("name", "ConsultaMedica");
        consultaData.put("attributes", new ArrayList<>());
        consultaData.put("methods", new ArrayList<>());

        UmlMutationDto mutClass2 = UmlMutationDto.builder()
                .action("CREATE_CLASS")
                .targetClassName("ConsultaMedica")
                .classData(consultaData)
                .build();

        Map<String, Object> relData = new HashMap<>();
        relData.put("sourceClass", "Paciente");
        relData.put("targetClass", "ConsultaMedica");
        relData.put("type", "ASSOCIATION");
        relData.put("sourceCardinality", "1");
        relData.put("targetCardinality", "0..*");
        relData.put("label", "agenda");

        UmlMutationDto mutRel = UmlMutationDto.builder()
                .action("CREATE_RELATIONSHIP")
                .relationshipData(relData)
                .build();

        VoiceModelingResponse aiResponse = new VoiceModelingResponse();
        aiResponse.setSuccess(true);
        aiResponse.setIntent("DIGITIZE_WHITEBOARD");
        aiResponse.setProviderUsed("gemini-3.6-flash");
        aiResponse.setLatencyMs(850);
        aiResponse.setMessage("Se detectaron 2 clases y 1 relacion");
        aiResponse.setMutations(new ArrayList<>(List.of(mutClass1, mutClass2, mutRel)));

        when(circuitBreakerAiService.processVisionPrompt(any(), any(), any())).thenReturn(aiResponse);

        // Simulamos la ejecucion del normalizador canonico de VoiceModelingService
        doAnswer(invocation -> {
            VoiceModelingResponse resp = invocation.getArgument(0);
            for (UmlMutationDto m : resp.getMutations()) {
                if ("CREATE_CLASS".equalsIgnoreCase(m.getAction()) && m.getClassData() != null) {
                    List<Map<String, Object>> attrs = (List<Map<String, Object>>) m.getClassData().get("attributes");
                    boolean hasPk = attrs.stream().anyMatch(a -> "id".equalsIgnoreCase((String) a.get("name")));
                    if (!hasPk) {
                        Map<String, Object> pk = new HashMap<>();
                        pk.put("name", "id");
                        pk.put("type", "Long");
                        pk.put("isPrimaryKey", true);
                        attrs.add(0, pk);
                    }
                }
            }
            return null;
        }).when(voiceModelingService).postProcessMutations(any());

        MockMultipartFile imageFile = new MockMultipartFile(
                "file",
                "whiteboard_sketch.jpg",
                "image/jpeg",
                new byte[]{1, 2, 3, 4, 5}
        );

        VoiceModelingResponse result = whiteboardVisionService.digitizeWhiteboardImage(
                imageFile,
                projectId,
                false,
                "architect@casetool.com",
                "127.0.0.1",
                "Mozilla/5.0"
        );

        assertNotNull(result);
        assertTrue(result.isSuccess());
        assertEquals("DIGITIZE_WHITEBOARD", result.getIntent());
        assertEquals(3, result.getMutations().size());

        // Verificacion de Auto-Layout: Las clases deben tener coordenadas x, y asignadas
        UmlMutationDto resPaciente = result.getMutations().get(0);
        assertNotNull(resPaciente.getClassData().get("position"));
        assertNotNull(resPaciente.getClassData().get("x"));
        assertNotNull(resPaciente.getClassData().get("y"));

        // Verificacion de 1NF Defense: Paciente debe tener la clave primaria id inyectada
        List<Map<String, Object>> pacienteResultAttrs = (List<Map<String, Object>>) resPaciente.getClassData().get("attributes");
        assertEquals("id", pacienteResultAttrs.get(0).get("name"));
        assertEquals(true, pacienteResultAttrs.get(0).get("isPrimaryKey"));

        // Verificacion de telemetria inmutable en ai_prompt_logs
        ArgumentCaptor<AiPromptLog> logCaptor = ArgumentCaptor.forClass(AiPromptLog.class);
        verify(aiPromptLogRepository).save(logCaptor.capture());
        AiPromptLog savedLog = logCaptor.getValue();
        assertEquals("VISION_PHOTO_OCR", savedLog.getModality());
        assertEquals("DIGITIZE_WHITEBOARD", savedLog.getInterpretedIntent());
        assertEquals("gemini-3.6-flash", savedLog.getModelVersion());
        assertTrue(savedLog.getRawPrompt().contains("whiteboard_sketch.jpg"));

        // Verificacion de auditoria inmutable
        verify(auditLogService).recordAction(
                eq(user.getId()),
                eq("AI_VISION_WHITEBOARD_DIGITIZE"),
                eq("ai_prompt_logs"),
                eq(projectId),
                eq("127.0.0.1"),
                eq("Mozilla/5.0"),
                anyMap()
        );
    }

    @Test
    @DisplayName("CU17: Archivo vacio o nulo arroja excepcion controlada (Regla E1)")
    void testDigitizeWhiteboard_EmptyFile_ThrowsException() {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file",
                "empty.jpg",
                "image/jpeg",
                new byte[0]
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            whiteboardVisionService.digitizeWhiteboardImage(
                    emptyFile,
                    UUID.randomUUID(),
                    false,
                    "test@casetool.com",
                    "127.0.0.1",
                    "Mozilla/5.0"
            );
        });

        assertTrue(ex.getMessage().contains("no puede estar vacio"));
    }

    @Test
    @DisplayName("CU17: Formato de archivo no soportado arroja excepcion controlada")
    void testDigitizeWhiteboard_InvalidFormat_ThrowsException() {
        MockMultipartFile pdfFile = new MockMultipartFile(
                "file",
                "documento.pdf",
                "application/pdf",
                new byte[]{1, 2, 3}
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            whiteboardVisionService.digitizeWhiteboardImage(
                    pdfFile,
                    UUID.randomUUID(),
                    false,
                    "test@casetool.com",
                    "127.0.0.1",
                    "Mozilla/5.0"
            );
        });

        assertTrue(ex.getMessage().contains("Formato no compatible"));
    }
}