package com.sw1.casetool.controller;

import com.sw1.casetool.dto.*;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.service.DiagramService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Diagram Project API", description = "Endpoints para la gestión del ciclo de vida de proyectos CASE y modelos UML")
public class DiagramController {

    private final DiagramService diagramService;

    // --- Ciclo de Vida del Proyecto (CU03) ---

    @PostMapping
    @Operation(summary = "Crear un nuevo proyecto con metadatos (CU03)")
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal String userEmail,
            HttpServletRequest servletRequest
    ) {
        String ip = servletRequest.getRemoteAddr();
        String userAgent = servletRequest.getHeader("User-Agent");

        ProjectResponse response = diagramService.createProject(request, userEmail, ip, userAgent);
        return new ResponseEntity<>(ApiResponse.success("Proyecto creado exitosamente", response), HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "Listar proyectos del usuario con filtros de búsqueda y tags (CU03)")
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> getProjects(
            @AuthenticationPrincipal String userEmail,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String tag
    ) {
        List<ProjectResponse> projects = diagramService.getProjects(userEmail, search, tag);
        return ResponseEntity.ok(ApiResponse.success("Lista de proyectos obtenida", projects));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener detalles y metadatos de un proyecto (CU03)")
    public ResponseEntity<ApiResponse<ProjectResponse>> getProject(@PathVariable UUID id) {
        ProjectResponse response = diagramService.getProjectResponse(id);
        return ResponseEntity.ok(ApiResponse.success("Proyecto encontrado", response));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar metadatos, versión o tags de un proyecto (CU03)")
    public ResponseEntity<ApiResponse<ProjectResponse>> updateProject(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateProjectRequest request,
            @AuthenticationPrincipal String userEmail,
            HttpServletRequest servletRequest
    ) {
        String ip = servletRequest.getRemoteAddr();
        String userAgent = servletRequest.getHeader("User-Agent");

        ProjectResponse updated = diagramService.updateProject(id, request, userEmail, ip, userAgent);
        return ResponseEntity.ok(ApiResponse.success("Proyecto actualizado exitosamente", updated));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminación lógica segura de un proyecto (CU03)")
    public ResponseEntity<ApiResponse<Void>> deleteProject(
            @PathVariable UUID id,
            @AuthenticationPrincipal String userEmail,
            HttpServletRequest servletRequest
    ) {
        String ip = servletRequest.getRemoteAddr();
        String userAgent = servletRequest.getHeader("User-Agent");

        diagramService.deleteProject(id, userEmail, ip, userAgent);
        return ResponseEntity.ok(ApiResponse.success("Proyecto eliminado exitosamente", null));
    }

    @PostMapping("/{id}/clone")
    @Operation(summary = "Clonación profunda atómica de un proyecto UML (CU03)")
    public ResponseEntity<ApiResponse<ProjectResponse>> cloneProject(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) CloneProjectRequest request,
            @AuthenticationPrincipal String userEmail,
            HttpServletRequest servletRequest
    ) {
        String ip = servletRequest.getRemoteAddr();
        String userAgent = servletRequest.getHeader("User-Agent");

        CloneProjectRequest cloneRequest = request != null ? request : new CloneProjectRequest();
        ProjectResponse cloned = diagramService.cloneProject(id, cloneRequest, userEmail, ip, userAgent);
        return new ResponseEntity<>(ApiResponse.success("Proyecto clonado exitosamente", cloned), HttpStatus.CREATED);
    }

    // --- Nodos de Clases UML ---

    @PostMapping("/{projectId}/classes")
    @Operation(summary = "Agregar un nodo de clase al diagrama")
    public ResponseEntity<ApiResponse<ClassNode>> addClassNode(
            @PathVariable UUID projectId,
            @Valid @RequestBody ClassNodeRequest request
    ) {
        return new ResponseEntity<>(ApiResponse.success("Clase agregada exitosamente", diagramService.addClassNode(projectId, request)), HttpStatus.CREATED);
    }

    @GetMapping("/{projectId}/classes")
    @Operation(summary = "Obtener todos los nodos de clases de un proyecto")
    public ResponseEntity<ApiResponse<List<ClassNode>>> getClassNodes(@PathVariable UUID projectId) {
        return ResponseEntity.ok(ApiResponse.success("Clases encontradas", diagramService.getClassNodesByProject(projectId)));
    }

    @PutMapping("/{projectId}/classes/{classId}")
    @Operation(summary = "Actualizar un nodo de clase")
    public ResponseEntity<ApiResponse<ClassNode>> updateClassNode(
            @PathVariable UUID projectId,
            @PathVariable UUID classId,
            @Valid @RequestBody ClassNodeRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Clase actualizada exitosamente", diagramService.updateClassNode(projectId, classId, request)));
    }

    @DeleteMapping("/{projectId}/classes/{classId}")
    @Operation(summary = "Eliminar un nodo de clase")
    public ResponseEntity<ApiResponse<Void>> deleteClassNode(
            @PathVariable UUID projectId,
            @PathVariable UUID classId
    ) {
        diagramService.deleteClassNode(projectId, classId);
        return ResponseEntity.ok(ApiResponse.success("Clase eliminada exitosamente", null));
    }

    // --- Relaciones UML ---

    @PostMapping("/{projectId}/relationships")
    @Operation(summary = "Agregar una relación entre clases")
    public ResponseEntity<ApiResponse<Relationship>> addRelationship(
            @PathVariable UUID projectId,
            @Valid @RequestBody RelationshipRequest request
    ) {
        return new ResponseEntity<>(ApiResponse.success("Relación agregada exitosamente", diagramService.addRelationship(projectId, request)), HttpStatus.CREATED);
    }

    @GetMapping("/{projectId}/relationships")
    @Operation(summary = "Obtener todas las relaciones de un proyecto")
    public ResponseEntity<ApiResponse<List<Relationship>>> getRelationships(@PathVariable UUID projectId) {
        return ResponseEntity.ok(ApiResponse.success("Relaciones encontradas", diagramService.getRelationshipsByProject(projectId)));
    }

    @PutMapping("/{projectId}/relationships/{relId}")
    @Operation(summary = "Actualizar una relación")
    public ResponseEntity<ApiResponse<Relationship>> updateRelationship(
            @PathVariable UUID projectId,
            @PathVariable UUID relId,
            @Valid @RequestBody RelationshipRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Relación actualizada exitosamente", diagramService.updateRelationship(projectId, relId, request)));
    }

    @DeleteMapping("/{projectId}/relationships/{relId}")
    @Operation(summary = "Eliminar una relación")
    public ResponseEntity<ApiResponse<Void>> deleteRelationship(
            @PathVariable UUID projectId,
            @PathVariable UUID relId
    ) {
        diagramService.deleteRelationship(projectId, relId);
        return ResponseEntity.ok(ApiResponse.success("Relación eliminada exitosamente", null));
    }

    // --- Diagrama Completo ---

    @GetMapping("/{projectId}/full-diagram")
    @Operation(summary = "Obtener diagrama completo (proyecto, nodos y relaciones)")
    public ResponseEntity<ApiResponse<FullDiagramResponse>> getFullDiagram(@PathVariable UUID projectId) {
        return ResponseEntity.ok(ApiResponse.success("Diagrama completo obtenido", diagramService.getFullDiagram(projectId)));
    }
}
