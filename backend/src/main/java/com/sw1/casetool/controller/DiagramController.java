package com.sw1.casetool.controller;

import com.sw1.casetool.dto.*;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.service.DiagramService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Diagram Project API", description = "Endpoints for managing projects and diagrams")
public class DiagramController {

    private final DiagramService diagramService;

    @PostMapping
    @Operation(summary = "Create a new project")
    public ResponseEntity<ApiResponse<DiagramProject>> createProject(@Valid @RequestBody CreateProjectRequest request) {
        return new ResponseEntity<>(new ApiResponse<>(true, "Project created", diagramService.createProject(request)), HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "Get projects by owner ID")
    public ResponseEntity<ApiResponse<List<DiagramProject>>> getProjectsByOwner(@RequestParam(required = false) UUID ownerId) {
        if (ownerId == null) {
            return ResponseEntity.ok(new ApiResponse<>(true, "All projects", diagramService.getProjectsByOwner(null))); // Need to implement get all if needed, but per requirements by ownerId
        }
        return ResponseEntity.ok(new ApiResponse<>(true, "Projects found", diagramService.getProjectsByOwner(ownerId)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a project by ID")
    public ResponseEntity<ApiResponse<DiagramProject>> getProject(@PathVariable UUID id) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Project found", diagramService.getProject(id)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a project")
    public ResponseEntity<ApiResponse<DiagramProject>> updateProject(@PathVariable UUID id, @Valid @RequestBody UpdateProjectRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Project updated", diagramService.updateProject(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a project")
    public ResponseEntity<ApiResponse<Void>> deleteProject(@PathVariable UUID id) {
        diagramService.deleteProject(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Project deleted", null));
    }

    // --- Class Nodes ---

    @PostMapping("/{projectId}/classes")
    @Operation(summary = "Add a class node")
    public ResponseEntity<ApiResponse<ClassNode>> addClassNode(@PathVariable UUID projectId, @Valid @RequestBody ClassNodeRequest request) {
        return new ResponseEntity<>(new ApiResponse<>(true, "Class node added", diagramService.addClassNode(projectId, request)), HttpStatus.CREATED);
    }

    @GetMapping("/{projectId}/classes")
    @Operation(summary = "Get all class nodes for a project")
    public ResponseEntity<ApiResponse<List<ClassNode>>> getClassNodes(@PathVariable UUID projectId) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Class nodes found", diagramService.getClassNodesByProject(projectId)));
    }

    @PutMapping("/{projectId}/classes/{classId}")
    @Operation(summary = "Update a class node")
    public ResponseEntity<ApiResponse<ClassNode>> updateClassNode(@PathVariable UUID projectId, @PathVariable UUID classId, @Valid @RequestBody ClassNodeRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Class node updated", diagramService.updateClassNode(projectId, classId, request)));
    }

    @DeleteMapping("/{projectId}/classes/{classId}")
    @Operation(summary = "Delete a class node")
    public ResponseEntity<ApiResponse<Void>> deleteClassNode(@PathVariable UUID projectId, @PathVariable UUID classId) {
        diagramService.deleteClassNode(projectId, classId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Class node deleted", null));
    }

    // --- Relationships ---

    @PostMapping("/{projectId}/relationships")
    @Operation(summary = "Add a relationship")
    public ResponseEntity<ApiResponse<Relationship>> addRelationship(@PathVariable UUID projectId, @Valid @RequestBody RelationshipRequest request) {
        return new ResponseEntity<>(new ApiResponse<>(true, "Relationship added", diagramService.addRelationship(projectId, request)), HttpStatus.CREATED);
    }

    @GetMapping("/{projectId}/relationships")
    @Operation(summary = "Get all relationships for a project")
    public ResponseEntity<ApiResponse<List<Relationship>>> getRelationships(@PathVariable UUID projectId) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Relationships found", diagramService.getRelationshipsByProject(projectId)));
    }

    @PutMapping("/{projectId}/relationships/{relId}")
    @Operation(summary = "Update a relationship")
    public ResponseEntity<ApiResponse<Relationship>> updateRelationship(@PathVariable UUID projectId, @PathVariable UUID relId, @Valid @RequestBody RelationshipRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Relationship updated", diagramService.updateRelationship(projectId, relId, request)));
    }

    @DeleteMapping("/{projectId}/relationships/{relId}")
    @Operation(summary = "Delete a relationship")
    public ResponseEntity<ApiResponse<Void>> deleteRelationship(@PathVariable UUID projectId, @PathVariable UUID relId) {
        diagramService.deleteRelationship(projectId, relId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Relationship deleted", null));
    }

    // --- Full Diagram ---

    @GetMapping("/{projectId}/full-diagram")
    @Operation(summary = "Get full diagram (project, nodes, relationships)")
    public ResponseEntity<ApiResponse<FullDiagramResponse>> getFullDiagram(@PathVariable UUID projectId) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Full diagram found", diagramService.getFullDiagram(projectId)));
    }
}
