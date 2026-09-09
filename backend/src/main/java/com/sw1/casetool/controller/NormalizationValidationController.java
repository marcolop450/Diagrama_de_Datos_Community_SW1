package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.SyncDiagramRequest;
import com.sw1.casetool.dto.normalization.NormalizationReportDto;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.NormalizationValidationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Logical Normalization Validation (CU10)", description = "Motor de auditoría de diseño relacional (1NF, 2NF, 3NF según reglas de TOM y Codd)")
public class NormalizationValidationController {

    private final NormalizationValidationService normalizationValidationService;
    private final UserProfileRepository userProfileRepository;

    @PostMapping("/{projectId}/validate-normalization")
    @Operation(summary = "Auditar y certificar normalización relacional de un proyecto UML persistido (CU10)")
    public ResponseEntity<ApiResponse<NormalizationReportDto>> validateProjectNormalization(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal String userEmail,
            HttpServletRequest servletRequest
    ) {
        UUID actorId = null;
        if (userEmail != null) {
            actorId = userProfileRepository.findByEmailIgnoreCase(userEmail)
                    .map(UserProfile::getId)
                    .orElse(null);
        }

        NormalizationReportDto report = normalizationValidationService.validateProject(projectId, actorId, servletRequest);
        return ResponseEntity.ok(ApiResponse.success("Auditoría de normalización relacional ejecutada exitosamente", report));
    }

    @PostMapping("/validate-normalization-live")
    @Operation(summary = "Validar en vivo la normalización relacional del diagrama en memoria (CU10)")
    public ResponseEntity<ApiResponse<NormalizationReportDto>> validateLiveNormalization(
            @RequestBody SyncDiagramRequest diagramData
    ) {
        NormalizationReportDto report = normalizationValidationService.validateLiveDiagram(diagramData);
        return ResponseEntity.ok(ApiResponse.success("Validación reactiva de normalización completada", report));
    }
}
