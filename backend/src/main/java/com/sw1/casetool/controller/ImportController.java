package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.importxmi.ImportXmiResponse;
import com.sw1.casetool.service.importxmi.XmiImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Importación de Modelo (CU12)", description = "Importación de modelos UML desde archivos OMG XMI 2.1 (ArchiTec, Enterprise Architect, StarUML)")
public class ImportController {

    private final XmiImportService xmiImportService;

    @PostMapping(value = "/import/xmi", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Crear nuevo proyecto e importar modelo desde archivo OMG XMI 2.1")
    public ResponseEntity<?> importAsNewProject(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "projectName", required = false) String projectName,
            @AuthenticationPrincipal String email,
            HttpServletRequest servletRequest
    ) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "No se ha proporcionado ningún archivo para importar."));
        }

        try (InputStream is = file.getInputStream()) {
            String ip = extractIp(servletRequest);
            String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

            ImportXmiResponse response = xmiImportService.importAsNewProject(
                    is,
                    projectName,
                    email,
                    ip,
                    userAgent
            );

            return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error(500, "Error interno al importar archivo XMI: " + e.getMessage()));
        }
    }

    @PostMapping(value = "/{projectId}/import/xmi", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Incorporar o reemplazar modelo en proyecto existente desde archivo OMG XMI 2.1")
    public ResponseEntity<?> importIntoExistingProject(
            @PathVariable UUID projectId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "replaceCurrent", defaultValue = "false") boolean replaceCurrent,
            @AuthenticationPrincipal String email,
            HttpServletRequest servletRequest
    ) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "No se ha proporcionado ningún archivo para importar."));
        }

        try (InputStream is = file.getInputStream()) {
            String ip = extractIp(servletRequest);
            String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

            ImportXmiResponse response = xmiImportService.importIntoExistingProject(
                    projectId,
                    is,
                    email,
                    ip,
                    userAgent,
                    replaceCurrent
            );

            return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error(500, "Error interno al importar archivo XMI: " + e.getMessage()));
        }
    }

    private String extractIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }
}
