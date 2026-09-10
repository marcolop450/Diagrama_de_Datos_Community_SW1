package com.sw1.casetool.service;

import com.sw1.casetool.dto.export.ExportPdfRequest;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.export.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExportServiceTest {

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

    @Spy
    private XmiExportService xmiExportService = new XmiExportService();

    @Spy
    private ExcelExportService excelExportService = new ExcelExportService();

    @Spy
    private PdfExportService pdfExportService = new PdfExportService();

    @InjectMocks
    private ExportService exportService;

    private DiagramProject sampleProject;
    private List<ClassNode> sampleClasses;
    private List<Relationship> sampleRelationships;
    private UUID projectId;

    @BeforeEach
    void setUp() {
        projectId = UUID.randomUUID();
        sampleProject = DiagramProject.builder()
                .id(projectId)
                .name("Sistema de Gestion Clinica")
                .version("1.2.0")
                .description("Modelo para administracion hospitalaria")
                .ownerId(UUID.randomUUID())
                .isDeleted(false)
                .build();

        UUID patientId = UUID.randomUUID();
        ClassNode patient = ClassNode.builder()
                .id(patientId)
                .name("Paciente")
                .stereotype("Entity")
                .abstractClass(false)
                .attributes(List.of(
                        Map.of("name", "id", "type", "Long", "visibility", "-", "isId", true),
                        Map.of("name", "nombre", "type", "String", "visibility", "-", "isNotNull", true),
                        Map.of("name", "dni", "type", "String", "visibility", "-", "isNullable", true)
                ))
                .methods(List.of(
                        Map.of("name", "getNombreCompleto", "returnType", "String", "visibility", "+")
                ))
                .build();

        UUID recordId = UUID.randomUUID();
        ClassNode medicalRecord = ClassNode.builder()
                .id(recordId)
                .name("HistorialClinico")
                .stereotype("Entity")
                .abstractClass(false)
                .attributes(List.of(
                        Map.of("name", "id", "type", "UUID", "visibility", "-", "isPrimaryKey", true),
                        Map.of("name", "pacienteId", "type", "Long", "visibility", "-", "isNotNull", true),
                        Map.of("name", "fechaApertura", "type", "LocalDate", "visibility", "-")
                ))
                .build();

        sampleClasses = List.of(patient, medicalRecord);

        Relationship rel = Relationship.builder()
                .id(UUID.randomUUID())
                .sourceClass(patient)
                .targetClass(medicalRecord)
                .type("composition")
                .sourceCardinality("1")
                .targetCardinality("1")
                .sourceRole("paciente")
                .targetRole("historial")
                .label("posee")
                .build();

        sampleRelationships = List.of(rel);
    }

    @Test
    @DisplayName("Debe exportar modelo a OMG XMI 2.1 con XML canónico bien formado")
    void testExportProjectXmi_Success() {
        when(projectRepository.findByIdAndIsDeletedFalse(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(sampleClasses);
        when(relationshipRepository.findByProjectId(projectId)).thenReturn(sampleRelationships);

        ExportService.ExportResult result = exportService.exportProjectXmi(projectId, "arquitecto@sw1.com", "127.0.0.1", "JUnit-Client");

        assertNotNull(result);
        assertNotNull(result.content());
        assertTrue(result.content().length > 0);
        assertEquals("application/xml", result.contentType());
        assertTrue(result.filename().endsWith(".xmi"));

        String xml = new String(result.content(), StandardCharsets.UTF_8);
        assertTrue(xml.contains("<xmi:XMI"));
        assertTrue(xml.contains("uml:Model"));
        assertTrue(xml.contains("name=\"Paciente\""));
        assertTrue(xml.contains("name=\"HistorialClinico\""));
        assertTrue(xml.contains("name=\"getNombreCompleto\""));
        assertTrue(xml.contains("aggregation=\"composite\""));

        verify(auditLogService, times(1)).recordAction(any(), eq("PROJECT_EXPORTED"), eq("diagram_projects"), eq(projectId), anyString(), anyString(), anyMap());
    }

    @Test
    @DisplayName("Debe exportar diccionario de datos y matriz de relaciones a Excel (.xlsx) con 3 hojas")
    void testExportProjectExcel_Success() throws Exception {
        when(projectRepository.findByIdAndIsDeletedFalse(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(sampleClasses);
        when(relationshipRepository.findByProjectId(projectId)).thenReturn(sampleRelationships);

        ExportService.ExportResult result = exportService.exportProjectExcel(projectId, "arquitecto@sw1.com", "127.0.0.1", "JUnit-Client");

        assertNotNull(result);
        assertNotNull(result.content());
        assertTrue(result.content().length > 0);
        assertEquals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", result.contentType());
        assertTrue(result.filename().endsWith(".xlsx"));

        // Verify with POI parser
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(result.content()))) {
            assertEquals(3, workbook.getNumberOfSheets());
            assertEquals("Resumen Ejecutivo", workbook.getSheetAt(0).getSheetName());
            assertEquals("Diccionario de Datos", workbook.getSheetAt(1).getSheetName());
            assertEquals("Relaciones y Cardinalidades", workbook.getSheetAt(2).getSheetName());

            // Check content in dictionary sheet
            var dictSheet = workbook.getSheetAt(1);
            assertTrue(dictSheet.getLastRowNum() >= 6);
            String bannerText = dictSheet.getRow(0).getCell(0).getStringCellValue();
            assertTrue(bannerText.contains("TABLA / ENTIDAD: PACIENTE"));
            // First attribute row is at index 2 (row 0 is entity banner, row 1 is table column headers)
            assertEquals("id", dictSheet.getRow(2).getCell(1).getStringCellValue());
            assertEquals("SÍ {PK}", dictSheet.getRow(2).getCell(6).getStringCellValue());
            assertEquals("NOT NULL", dictSheet.getRow(2).getCell(7).getStringCellValue());
        }

        verify(auditLogService, times(1)).recordAction(any(), eq("PROJECT_EXPORTED"), eq("diagram_projects"), eq(projectId), anyString(), anyString(), anyMap());
    }

    @Test
    @DisplayName("Debe exportar memoria técnica ejecutiva a PDF válido con cabecera %PDF-")
    void testExportProjectPdf_Success() {
        when(projectRepository.findByIdAndIsDeletedFalse(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(sampleClasses);
        when(relationshipRepository.findByProjectId(projectId)).thenReturn(sampleRelationships);

        ExportPdfRequest request = ExportPdfRequest.builder()
                .includeDictionary(true)
                .includeRelationships(true)
                .build();

        ExportService.ExportResult result = exportService.exportProjectPdf(projectId, request, "arquitecto@sw1.com", "127.0.0.1", "JUnit-Client");

        assertNotNull(result);
        assertNotNull(result.content());
        assertTrue(result.content().length > 0);
        assertEquals("application/pdf", result.contentType());
        assertTrue(result.filename().endsWith(".pdf"));

        // Validate PDF magic bytes
        String header = new String(result.content(), 0, 5, StandardCharsets.US_ASCII);
        assertEquals("%PDF-", header);

        verify(auditLogService, times(1)).recordAction(any(), eq("PROJECT_EXPORTED"), eq("diagram_projects"), eq(projectId), anyString(), anyString(), anyMap());
    }

    @Test
    @DisplayName("Debe exportar memoria técnica ejecutiva a PDF con captura gráfica rasterizada")
    void testExportProjectPdf_WithImage_Success() {
        when(projectRepository.findByIdAndIsDeletedFalse(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(sampleClasses);
        when(relationshipRepository.findByProjectId(projectId)).thenReturn(sampleRelationships);

        String sampleBase64Png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        ExportPdfRequest request = ExportPdfRequest.builder()
                .imageBase64(sampleBase64Png)
                .includeDictionary(true)
                .includeRelationships(true)
                .build();

        ExportService.ExportResult result = exportService.exportProjectPdf(projectId, request, "arquitecto@sw1.com", "127.0.0.1", "JUnit-Client");

        assertNotNull(result);
        assertNotNull(result.content());
        assertTrue(result.content().length > 0);
        assertEquals("application/pdf", result.contentType());
        String header = new String(result.content(), 0, 5, StandardCharsets.US_ASCII);
        assertEquals("%PDF-", header);
    }

    @Test
    @DisplayName("Debe arrojar IllegalStateException (E1: Modelo Vacío) si el proyecto no tiene clases")
    void testExportProject_EmptyModelThrowsException() {
        when(projectRepository.findByIdAndIsDeletedFalse(projectId)).thenReturn(Optional.of(sampleProject));
        when(classNodeRepository.findByProjectId(projectId)).thenReturn(Collections.emptyList());

        assertThrows(IllegalStateException.class, () ->
                exportService.exportProjectXmi(projectId, "arquitecto@sw1.com", "127.0.0.1", "JUnit-Client")
        );

        assertThrows(IllegalStateException.class, () ->
                exportService.exportProjectExcel(projectId, "arquitecto@sw1.com", "127.0.0.1", "JUnit-Client")
        );

        assertThrows(IllegalStateException.class, () ->
                exportService.exportProjectPdf(projectId, null, "arquitecto@sw1.com", "127.0.0.1", "JUnit-Client")
        );
    }

    @Test
    @DisplayName("Debe arrojar NoSuchElementException si el proyecto no existe o está eliminado")
    void testExportProject_NotFoundThrowsException() {
        UUID nonExistentId = UUID.randomUUID();
        when(projectRepository.findByIdAndIsDeletedFalse(nonExistentId)).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class, () ->
                exportService.exportProjectXmi(nonExistentId, "arquitecto@sw1.com", "127.0.0.1", "JUnit-Client")
        );
    }
}
