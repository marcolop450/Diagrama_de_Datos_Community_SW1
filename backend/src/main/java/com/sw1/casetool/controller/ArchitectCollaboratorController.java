package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.architect.CollaboratorResponse;
import com.sw1.casetool.dto.architect.CreateCollaboratorRequest;
import com.sw1.casetool.service.ArchitectCollaboratorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/architect/collaborators")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ARQUITECTO', 'SUPER_ADMIN')")
@Tag(name = "Gestión de Colaboradores de Equipo", description = "Endpoints para que el Arquitecto de Software registre y gestione a los colaboradores de su equipo")
public class ArchitectCollaboratorController {

    private final ArchitectCollaboratorService collaboratorService;

    @GetMapping
    @Operation(summary = "Obtener lista de colaboradores pertenecientes al equipo del Arquitecto")
    public ResponseEntity<ApiResponse<List<CollaboratorResponse>>> getCollaborators(
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal String email
    ) {
        List<CollaboratorResponse> list = collaboratorService.getCollaborators(email, search);
        return ResponseEntity.ok(ApiResponse.success("Lista de colaboradores obtenida exitosamente", list));
    }

    @PostMapping
    @Operation(summary = "Registrar un nuevo colaborador en el equipo del Arquitecto")
    public ResponseEntity<ApiResponse<CollaboratorResponse>> createCollaborator(
            @Valid @RequestBody CreateCollaboratorRequest request,
            @AuthenticationPrincipal String email,
            HttpServletRequest servletRequest
    ) {
        String ip = extractIp(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        CollaboratorResponse created = collaboratorService.createCollaborator(
                request,
                email,
                ip,
                userAgent
        );
        return ResponseEntity.ok(ApiResponse.success("Colaborador registrado exitosamente en tu equipo", created));
    }

    @PatchMapping("/{collaboratorId}/toggle-status")
    @Operation(summary = "Alternar estado activo/inactivo del colaborador")
    public ResponseEntity<ApiResponse<CollaboratorResponse>> toggleStatus(
            @PathVariable UUID collaboratorId,
            @AuthenticationPrincipal String email,
            HttpServletRequest servletRequest
    ) {
        String ip = extractIp(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        CollaboratorResponse updated = collaboratorService.toggleCollaboratorStatus(
                collaboratorId,
                email,
                ip,
                userAgent
        );
        String msg = Boolean.TRUE.equals(updated.getIsActive())
                ? "Colaborador reactivado exitosamente"
                : "Colaborador suspendido temporalmente";
        return ResponseEntity.ok(ApiResponse.success(msg, updated));
    }

    private String extractIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
