package ${basePackage}.controller;

import ${basePackage}.dto.ApiResponse;
import ${basePackage}.dto.${className}RequestDto;
import ${basePackage}.dto.${className}ResponseDto;
import ${basePackage}.exception.ResourceNotFoundException;
import ${basePackage}.service.${className}Service;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

<#if idType == "UUID">
import java.util.UUID;
</#if>
<#if includeSwagger!true>
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
</#if>

/**
 * Controlador REST para la gestión de ${className}
 */
@RestController
@RequestMapping("/api/${endpointSlug}")
@RequiredArgsConstructor
<#if includeSwagger!true>
@Tag(name = "${className}", description = "API REST de operaciones CRUD para ${className}")
</#if>
public class ${className}Controller {

    private final ${className}Service service;

    @GetMapping
<#if includeSwagger!true>
    @Operation(summary = "Obtener todas las instancias de ${className}")
</#if>
    public ResponseEntity<ApiResponse<List<${className}ResponseDto>>> getAll() {
        List<${className}ResponseDto> list = service.findAll();
        return ResponseEntity.ok(ApiResponse.success("Listado de ${className} obtenido correctamente", list));
    }

    @GetMapping("/{id}")
<#if includeSwagger!true>
    @Operation(summary = "Obtener ${className} por su identificador")
</#if>
    public ResponseEntity<ApiResponse<${className}ResponseDto>> getById(@PathVariable ${idType} id) {
        return service.findById(id)
                .map(dto -> ResponseEntity.ok(ApiResponse.success("${className} encontrado", dto)))
                .orElseThrow(() -> new ResourceNotFoundException("${className} no encontrado con ID: " + id));
    }

    @PostMapping
<#if includeSwagger!true>
    @Operation(summary = "Crear un nuevo registro de ${className}")
</#if>
    public ResponseEntity<ApiResponse<${className}ResponseDto>> create(@Valid @RequestBody ${className}RequestDto request) {
        ${className}ResponseDto created = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("${className} creado exitosamente", created));
    }

    @PutMapping("/{id}")
<#if includeSwagger!true>
    @Operation(summary = "Actualizar un registro existente de ${className}")
</#if>
    public ResponseEntity<ApiResponse<${className}ResponseDto>> update(
            @PathVariable ${idType} id,
            @Valid @RequestBody ${className}RequestDto request
    ) {
        ${className}ResponseDto updated = service.update(id, request);
        return ResponseEntity.ok(ApiResponse.success("${className} actualizado exitosamente", updated));
    }

    @DeleteMapping("/{id}")
<#if includeSwagger!true>
    @Operation(summary = "Eliminar un registro de ${className}")
</#if>
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable ${idType} id) {
        service.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("${className} eliminado exitosamente", null));
    }
}
