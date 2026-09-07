package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.TemplateResponse;
import com.sw1.casetool.service.TemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
@Tag(name = "Domain Templates API", description = "Endpoints para consultar catálogo de plantillas base de dominio UML (CU07)")
public class TemplateController {

    private final TemplateService templateService;

    @GetMapping
    @Operation(summary = "Listar catálogo de plantillas base de dominio disponibles")
    public ResponseEntity<ApiResponse<List<TemplateResponse>>> getAllTemplates() {
        List<TemplateResponse> templates = templateService.getAllTemplates();
        return ResponseEntity.ok(ApiResponse.success("Catálogo de plantillas obtenido exitosamente", templates));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener detalle y esquema inicial de una plantilla base por ID")
    public ResponseEntity<ApiResponse<TemplateResponse>> getTemplateById(@PathVariable String id) {
        TemplateResponse template = templateService.getTemplateById(id);
        return ResponseEntity.ok(ApiResponse.success("Plantilla obtenida exitosamente", template));
    }
}
