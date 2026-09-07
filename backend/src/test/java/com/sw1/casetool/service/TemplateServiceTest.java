package com.sw1.casetool.service;

import com.sw1.casetool.dto.TemplateResponse;
import com.sw1.casetool.exception.ResourceNotFoundException;
import com.sw1.casetool.model.DomainTemplate;
import com.sw1.casetool.repository.DomainTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TemplateServiceTest {

    @Mock
    private DomainTemplateRepository templateRepository;

    @InjectMocks
    private TemplateService templateService;

    private DomainTemplate sampleTemplate;

    @BeforeEach
    void setUp() {
        Map<String, Object> schema = Map.of(
                "nodes", List.of(
                        Map.of("id", "c1", "name", "Estudiante"),
                        Map.of("id", "c2", "name", "Docente")
                ),
                "edges", List.of(
                        Map.of("id", "e1", "source", "c1", "target", "c2")
                )
        );

        sampleTemplate = DomainTemplate.builder()
                .id("TEMPLATE_COLEGIO")
                .name("Sistema Académico")
                .category("Educación")
                .description("Plantilla académica")
                .initialSchema(schema)
                .createdAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("CU07-T2: Listar todas las plantillas calcula conteo de nodos y aristas")
    void testGetAllTemplates_CalculatesCounts() {
        when(templateRepository.findAllByOrderByCategoryAscNameAsc())
                .thenReturn(List.of(sampleTemplate));

        List<TemplateResponse> responses = templateService.getAllTemplates();

        assertNotNull(responses);
        assertEquals(1, responses.size());
        TemplateResponse res = responses.get(0);
        assertEquals("TEMPLATE_COLEGIO", res.getId());
        assertEquals("Sistema Académico", res.getName());
        assertEquals(2, res.getNodeCount());
        assertEquals(1, res.getEdgeCount());
    }

    @Test
    @DisplayName("CU07-T3: Obtener plantilla por ID exitosamente")
    void testGetTemplateById_Success() {
        when(templateRepository.findById("TEMPLATE_COLEGIO"))
                .thenReturn(Optional.of(sampleTemplate));

        TemplateResponse res = templateService.getTemplateById("TEMPLATE_COLEGIO");

        assertNotNull(res);
        assertEquals("TEMPLATE_COLEGIO", res.getId());
        assertEquals(2, res.getNodeCount());
    }

    @Test
    @DisplayName("CU07-T4: Obtener plantilla inexistente arroja ResourceNotFoundException")
    void testGetTemplateById_NotFound() {
        when(templateRepository.findById("UNKNOWN"))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                templateService.getTemplateById("UNKNOWN")
        );
    }
}
