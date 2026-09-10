package com.sw1.casetool.service.export;

import com.sw1.casetool.dto.export.ExportPdfRequest;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExportService {

    private final DiagramProjectRepository projectRepository;
    private final ClassNodeRepository classNodeRepository;
    private final RelationshipRepository relationshipRepository;
    private final UserProfileRepository userProfileRepository;
    private final AuditLogService auditLogService;

    private final XmiExportService xmiExportService;
    private final ExcelExportService excelExportService;
    private final PdfExportService pdfExportService;

    @Transactional(readOnly = true)
    public ExportResult exportProjectXmi(UUID projectId, String userEmail, String ip, String userAgent) {
        DiagramProject project = getProjectAndValidate(projectId);
        List<ClassNode> classes = getClassesAndValidate(projectId);
        List<Relationship> relationships = relationshipRepository.findByProjectId(projectId);

        byte[] content = xmiExportService.exportToXmi(project, classes, relationships);
        String filename = buildFilename(project.getName(), project.getVersion(), "xmi");

        recordAudit(project, userEmail, "XMI", filename, classes.size(), relationships.size(), ip, userAgent);

        return new ExportResult(content, filename, "application/xml");
    }

    @Transactional(readOnly = true)
    public ExportResult exportProjectExcel(UUID projectId, String userEmail, String ip, String userAgent) {
        DiagramProject project = getProjectAndValidate(projectId);
        List<ClassNode> classes = getClassesAndValidate(projectId);
        List<Relationship> relationships = relationshipRepository.findByProjectId(projectId);

        byte[] content = excelExportService.exportToExcel(project, classes, relationships);
        String filename = buildFilename(project.getName() + "_Diccionario", project.getVersion(), "xlsx");

        recordAudit(project, userEmail, "EXCEL", filename, classes.size(), relationships.size(), ip, userAgent);

        return new ExportResult(content, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    @Transactional(readOnly = true)
    public ExportResult exportProjectPdf(UUID projectId, ExportPdfRequest request, String userEmail, String ip, String userAgent) {
        DiagramProject project = getProjectAndValidate(projectId);
        List<ClassNode> classes = getClassesAndValidate(projectId);
        List<Relationship> relationships = relationshipRepository.findByProjectId(projectId);

        byte[] content = pdfExportService.exportToPdf(project, classes, relationships, request);
        String filename = buildFilename(project.getName() + "_Memoria_Tecnica", project.getVersion(), "pdf");

        recordAudit(project, userEmail, "PDF", filename, classes.size(), relationships.size(), ip, userAgent);

        return new ExportResult(content, filename, "application/pdf");
    }

    private DiagramProject getProjectAndValidate(UUID projectId) {
        return projectRepository.findByIdAndIsDeletedFalse(projectId)
                .orElseThrow(() -> new NoSuchElementException("Proyecto no encontrado o ha sido eliminado"));
    }

    private List<ClassNode> getClassesAndValidate(UUID projectId) {
        List<ClassNode> classes = classNodeRepository.findByProjectId(projectId);
        if (classes == null || classes.isEmpty()) {
            throw new IllegalStateException("No hay elementos para exportar. El modelo actual no contiene ninguna clase definida.");
        }
        return classes;
    }

    private void recordAudit(DiagramProject project, String userEmail, String format, String filename, int classCount, int relCount, String ip, String userAgent) {
        UUID actorId = null;
        if (userEmail != null) {
            Optional<UserProfile> userOpt = userProfileRepository.findByEmailIgnoreCase(userEmail);
            if (userOpt.isPresent()) {
                actorId = userOpt.get().getUserId() != null ? userOpt.get().getUserId() : userOpt.get().getId();
            }
        }

        Map<String, Object> details = new HashMap<>();
        details.put("format", format);
        details.put("filename", filename);
        details.put("classCount", classCount);
        details.put("relationshipCount", relCount);
        details.put("projectName", project.getName());
        details.put("projectVersion", project.getVersion());

        auditLogService.recordAction(
                actorId != null ? actorId : project.getOwnerId(),
                "PROJECT_EXPORTED",
                "diagram_projects",
                project.getId(),
                ip,
                userAgent,
                details
        );
    }

    public static String buildFilename(String name, String version, String ext) {
        String cleanName = name != null ? name.trim().replaceAll("[^a-zA-Z0-9_-]", "_") : "Modelo";
        String cleanVersion = version != null ? version.trim().replaceAll("[^a-zA-Z0-9_.-]", "") : "1.0.0";
        return cleanName + "_v" + cleanVersion + "." + ext;
    }

    public record ExportResult(byte[] content, String filename, String contentType) {}
}
