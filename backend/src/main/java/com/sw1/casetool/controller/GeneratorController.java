package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.generator.GenerateBackendRequest;
import com.sw1.casetool.dto.generator.GenerateSqlDdlRequest;
import com.sw1.casetool.dto.generator.GenerationPreviewResponse;
import com.sw1.casetool.dto.generator.SqlDdlResponse;
import com.sw1.casetool.service.generator.SpringBootGeneratorService;
import com.sw1.casetool.service.generator.SqlDdlGeneratorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/generate")
@RequiredArgsConstructor
@Tag(name = "Generador CASE (CU13 & CU14)", description = "Generación de backend Spring Boot y Esquemas DDL SQL PostgreSQL 17")
public class GeneratorController {

    private final SpringBootGeneratorService generatorService;
    private final SqlDdlGeneratorService sqlDdlGeneratorService;

    @PostMapping("/backend/preview")
    @Operation(summary = "Obtener vista previa de la estructura de archivos que generará el backend")
    public ResponseEntity<ApiResponse<GenerationPreviewResponse>> getPreview(
            @PathVariable UUID projectId,
            @RequestBody(required = false) GenerateBackendRequest request
    ) {
        GenerateBackendRequest finalReq = request != null ? request : new GenerateBackendRequest();
        GenerationPreviewResponse preview = generatorService.getGenerationPreview(projectId, finalReq);
        return ResponseEntity.ok(ApiResponse.success("Vista previa de arquitectura generada exitosamente", preview));
    }

    @PostMapping(value = "/backend", produces = "application/zip")
    @Operation(summary = "Generar y descargar backend Spring Boot completo (4 Capas) empaquetado en ZIP")
    public ResponseEntity<byte[]> generateBackendZip(
            @PathVariable UUID projectId,
            @RequestBody(required = false) GenerateBackendRequest request,
            @AuthenticationPrincipal String email,
            HttpServletRequest servletRequest
    ) {
        GenerateBackendRequest finalReq = request != null ? request : new GenerateBackendRequest();
        String ip = extractIp(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        byte[] zipBytes = generatorService.generateSpringBootZip(
                projectId,
                finalReq,
                email,
                ip,
                userAgent
        );

        String filename = (finalReq.getArtifactId() != null && !finalReq.getArtifactId().isBlank())
                ? finalReq.getArtifactId().trim() + "-backend.zip"
                : "backend-springboot.zip";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(zipBytes);
    }

    @PostMapping("/sql-ddl")
    @Operation(summary = "Generar esquema DDL SQL (PostgreSQL 17 / Supabase) con tablas, PKs, FKs e índices")
    public ResponseEntity<ApiResponse<SqlDdlResponse>> generateSqlDdl(
            @PathVariable UUID projectId,
            @RequestBody(required = false) GenerateSqlDdlRequest request,
            @AuthenticationPrincipal String email,
            HttpServletRequest servletRequest
    ) {
        GenerateSqlDdlRequest finalReq = request != null ? request : new GenerateSqlDdlRequest();
        String ip = extractIp(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        SqlDdlResponse response = sqlDdlGeneratorService.generateSqlDdl(
                projectId,
                finalReq,
                email,
                ip,
                userAgent
        );

        return ResponseEntity.ok(ApiResponse.success("Esquema DDL SQL PostgreSQL 17 generado exitosamente", response));
    }

    @PostMapping(value = "/sql-ddl/download", produces = "application/sql")
    @Operation(summary = "Descargar archivo .sql de esquema DDL para PostgreSQL 17 / Supabase")
    public ResponseEntity<byte[]> downloadSqlDdl(
            @PathVariable UUID projectId,
            @RequestBody(required = false) GenerateSqlDdlRequest request,
            @AuthenticationPrincipal String email,
            HttpServletRequest servletRequest
    ) {
        GenerateSqlDdlRequest finalReq = request != null ? request : new GenerateSqlDdlRequest();
        String ip = extractIp(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        SqlDdlResponse response = sqlDdlGeneratorService.generateSqlDdl(
                projectId,
                finalReq,
                email,
                ip,
                userAgent
        );

        byte[] sqlBytes = response.getSql().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String filename = response.getFileName() != null ? response.getFileName() : "schema.sql";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/sql"))
                .body(sqlBytes);
    }

    private String extractIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }
}
