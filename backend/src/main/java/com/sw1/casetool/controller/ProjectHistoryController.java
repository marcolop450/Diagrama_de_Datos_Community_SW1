package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.history.DiagramHistoryResponse;
import com.sw1.casetool.service.DiagramHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Project History & Traceability (CU05)", description = "Historial cronológico de cambios, trazabilidad por colaborador y control de auditoría de diagramas UML")
public class ProjectHistoryController {

    private final DiagramHistoryService diagramHistoryService;

    @GetMapping("/{projectId}/history")
    @Operation(summary = "Consultar el historial cronológico y trazabilidad de mutaciones de un proyecto UML (CU05)")
    public ResponseEntity<ApiResponse<List<DiagramHistoryResponse>>> getProjectHistory(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal String userEmail
    ) {
        List<DiagramHistoryResponse> history = diagramHistoryService.getProjectHistory(projectId, userEmail);
        return ResponseEntity.ok(ApiResponse.success("Historial y trazabilidad del proyecto obtenidos", history));
    }
}
