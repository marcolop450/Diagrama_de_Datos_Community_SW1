package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.export.ExportPdfRequest;
import com.sw1.casetool.service.export.ExportService;
import com.sw1.casetool.service.export.ExportService.ExportResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/export")
@RequiredArgsConstructor
@Tag(name = "Exportación de Modelo (CU11)", description = "Exportación en formatos OMG XMI 2.1, Excel (.xlsx) y Memoria Técnica PDF")
public class ExportController {

    private final ExportService exportService;

    @GetMapping("/xmi")
    @Operation(summary = "Exportar modelo a OMG XMI 2.1 (ArchiTec y StarUML)")
    public ResponseEntity<?> exportToXmi(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal String email,
            HttpServletRequest servletRequest
    ) {
        try {
            String ip = extractIp(servletRequest);
            String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

            ExportResult result = exportService.exportProjectXmi(projectId, email, ip, userAgent);

            return buildDownloadResponse(result);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error(500, "Error al exportar a XMI: " + e.getMessage()));
        }
    }

    @GetMapping("/excel")
    @Operation(summary = "Exportar diccionario de datos y relaciones a Excel (.xlsx)")
    public ResponseEntity<?> exportToExcel(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal String email,
            HttpServletRequest servletRequest
    ) {
        try {
            String ip = extractIp(servletRequest);
            String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

            ExportResult result = exportService.exportProjectExcel(projectId, email, ip, userAgent);

            return buildDownloadResponse(result);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error(500, "Error al exportar a Excel: " + e.getMessage()));
        }
    }

    @PostMapping("/pdf")
    @Operation(summary = "Exportar memoria técnica ejecutiva a PDF con diagrama embebido")
    public ResponseEntity<?> exportToPdf(
            @PathVariable UUID projectId,
            @RequestBody(required = false) ExportPdfRequest request,
            @AuthenticationPrincipal String email,
            HttpServletRequest servletRequest
    ) {
        try {
            String ip = extractIp(servletRequest);
            String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

            ExportResult result = exportService.exportProjectPdf(projectId, request, email, ip, userAgent);

            return buildDownloadResponse(result);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error(500, "Error al exportar a PDF: " + e.getMessage()));
        }
    }

    private ResponseEntity<byte[]> buildDownloadResponse(ExportResult result) {
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(result.filename(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(result.contentType()))
                .contentLength(result.content().length)
                .body(result.content());
    }

    private String extractIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
