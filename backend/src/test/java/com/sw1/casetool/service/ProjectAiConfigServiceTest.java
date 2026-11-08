package com.sw1.casetool.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.ai.OllamaModelsResponse;
import com.sw1.casetool.dto.ai.ProjectAiConfigDto;
import com.sw1.casetool.dto.ai.ProjectAiTestRequest;
import com.sw1.casetool.dto.ai.ProjectAiTestResponse;
import com.sw1.casetool.model.ProjectAiConfig;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.ProjectAiConfigRepository;
import com.sw1.casetool.service.ai.ProjectAiConfigService;
import com.sw1.casetool.service.security.AesEncryptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectAiConfigServiceTest {

    @Mock
    private ProjectAiConfigRepository aiConfigRepository;

    @Mock
    private DiagramProjectRepository projectRepository;

    private AesEncryptionService aesEncryptionService;
    private ProjectAiConfigService aiConfigService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        aesEncryptionService = new AesEncryptionService("TEST-SECRET-AES-256-KEY-FOR-UNIT-TESTING-1234");
        aiConfigService = new ProjectAiConfigService(
                aiConfigRepository,
                projectRepository,
                aesEncryptionService,
                objectMapper
        );
    }

    @Test
    @DisplayName("CU15-T01: Cifrado y descifrado simétrico AES-256 GCM de credenciales")
    void testAesEncryptionDecryption() {
        String originalKey = "gsk_test1234567890abcdefghijklmnopqrstuvwxyz";
        String encrypted = aesEncryptionService.encrypt(originalKey);

        assertThat(encrypted).isNotNull();
        assertThat(encrypted).isNotEqualTo(originalKey);

        String decrypted = aesEncryptionService.decrypt(encrypted);
        assertThat(decrypted).isEqualTo(originalKey);
    }

    @Test
    @DisplayName("CU15-T02: Enmascaramiento de API Key para frontend (gsk_••••••••wxyz)")
    void testMaskApiKey() {
        String rawKey = "gsk_1234567890wxyz";
        String masked = aesEncryptionService.maskApiKey(rawKey);

        assertThat(masked).startsWith("gsk_");
        assertThat(masked).endsWith("wxyz");
        assertThat(masked).contains("••••••••");
    }

    @Test
    @DisplayName("CU15-T03: Obtener configuración por defecto para proyecto nuevo")
    void testGetDefaultConfigWhenNotPresent() {
        UUID projectId = UUID.randomUUID();
        when(aiConfigRepository.findByProjectId(projectId)).thenReturn(Optional.empty());

        ProjectAiConfigDto config = aiConfigService.getProjectAiConfig(projectId);

        assertThat(config).isNotNull();
        assertThat(config.getProvider()).isEqualTo("SYSTEM_DEFAULT");
        assertThat(config.isHasCustomApiKey()).isFalse();
    }

    @Test
    @DisplayName("CU15-T04: Guardar configuración de proyecto con API Key cifrada")
    void testSaveProjectAiConfigWithNewKey() {
        UUID projectId = UUID.randomUUID();
        when(aiConfigRepository.findByProjectId(projectId)).thenReturn(Optional.empty());
        when(aiConfigRepository.save(any(ProjectAiConfig.class))).thenAnswer(inv -> {
            ProjectAiConfig saved = inv.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        ProjectAiConfigDto input = ProjectAiConfigDto.builder()
                .provider("GROQ_CLOUD")
                .selectedModel("llama-3.3-70b-versatile")
                .apiKey("gsk_my_private_groq_api_key_secret_1234")
                .temperature(new BigDecimal("0.10"))
                .maxTokens(1024)
                .build();

        ProjectAiConfigDto result = aiConfigService.saveProjectAiConfig(projectId, input);

        assertThat(result).isNotNull();
        assertThat(result.getProvider()).isEqualTo("GROQ_CLOUD");
        assertThat(result.getSelectedModel()).isEqualTo("llama-3.3-70b-versatile");
        assertThat(result.isHasCustomApiKey()).isTrue();
        assertThat(result.getMaskedApiKey()).contains("••••••••");
        verify(aiConfigRepository, times(1)).save(any(ProjectAiConfig.class));
    }

    @Test
    @DisplayName("CU15-T05: No re-encriptar si el frontend envía la clave con asteriscos")
    void testSaveConfigPreservesKeyWhenMasked() {
        UUID projectId = UUID.randomUUID();
        String alreadyEncrypted = aesEncryptionService.encrypt("secret_existing_key_9999");

        ProjectAiConfig existing = ProjectAiConfig.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .provider("GROQ_CLOUD")
                .apiKeyEncrypted(alreadyEncrypted)
                .build();

        when(aiConfigRepository.findByProjectId(projectId)).thenReturn(Optional.of(existing));
        when(aiConfigRepository.save(any(ProjectAiConfig.class))).thenAnswer(inv -> inv.getArgument(0));

        ProjectAiConfigDto input = ProjectAiConfigDto.builder()
                .provider("GROQ_CLOUD")
                .apiKey("gsk_••••••••9999") // Clave enmascarada proveniente de UI
                .build();

        ProjectAiConfigDto result = aiConfigService.saveProjectAiConfig(projectId, input);

        assertThat(result.isHasCustomApiKey()).isTrue();
        assertThat(existing.getApiKeyEncrypted()).isEqualTo(alreadyEncrypted);
    }

    @Test
    @DisplayName("CU15-T06: Sandbox test con SYSTEM_DEFAULT retorna 200 OK y latencia")
    void testSandboxSystemDefault() {
        UUID projectId = UUID.randomUUID();
        ProjectAiTestRequest request = ProjectAiTestRequest.builder()
                .provider("SYSTEM_DEFAULT")
                .testPrompt("Hola mundo UML")
                .build();

        ProjectAiTestResponse response = aiConfigService.testAiConnection(projectId, request);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getHttpStatusCode()).isEqualTo(200);
        assertThat(response.getProviderUsed()).isEqualTo("SYSTEM_DEFAULT");
        assertThat(response.getLatencyMs()).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("CU15-T07: Detección Ollama valida endpoint vacío amigablemente")
    void testDetectOllamaEmptyEndpoint() {
        OllamaModelsResponse resp = aiConfigService.detectOllamaModels("");

        assertThat(resp.isSuccess()).isFalse();
        assertThat(resp.getErrorMessage()).contains("URL de tu servidor Ollama");
    }

    @Test
    @DisplayName("CU15-T08: Detección LM Studio valida endpoint vacío y sugiere puerto 1234")
    void testDetectLmStudioEmptyEndpoint() {
        OllamaModelsResponse resp = aiConfigService.detectLocalModels("LMSTUDIO", "");

        assertThat(resp.isSuccess()).isFalse();
        assertThat(resp.getErrorMessage()).contains("1234");
    }

    @Test
    @DisplayName("CU15-T09: Sandbox test con LMSTUDIO_LOCAL valida endpoint requerido")
    void testSandboxLmStudioRequiresEndpoint() {
        UUID projectId = UUID.randomUUID();
        ProjectAiTestRequest request = ProjectAiTestRequest.builder()
                .provider("LMSTUDIO_LOCAL")
                .ollamaEndpoint("")
                .testPrompt("Crear clase Factura")
                .build();

        ProjectAiTestResponse response = aiConfigService.testAiConnection(projectId, request);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getHttpStatusCode()).isEqualTo(400);
        assertThat(response.getErrorMessage()).contains("LM Studio");
    }

    @Test
    @DisplayName("CU15-T10: Sandbox test con proveedor externo sin API Key valida credencial requerida")
    void testSandboxExternalProviderRequiresApiKey() {
        UUID projectId = UUID.randomUUID();
        ProjectAiTestRequest request = ProjectAiTestRequest.builder()
                .provider("Meta")
                .selectedModel("Muse Spark 1.3")
                .apiKey("")
                .testPrompt("Crear clase Factura")
                .build();

        ProjectAiTestResponse response = aiConfigService.testAiConnection(projectId, request);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getHttpStatusCode()).isEqualTo(401);
        assertThat(response.getErrorMessage()).contains("Meta");
    }

    @Test
    @DisplayName("CU15-T11: Descubrimiento de modelos externos valida API Key requerida")
    void testDiscoverExternalModelsRequiresKey() {
        UUID projectId = UUID.randomUUID();
        OllamaModelsResponse resp = aiConfigService.discoverExternalModels(projectId, "Meta", "", "");

        assertThat(resp.isSuccess()).isFalse();
        assertThat(resp.getErrorMessage()).contains("API Key");
    }
}
