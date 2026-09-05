package com.sw1.casetool.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateProjectRequest {
    @NotBlank(message = "El nombre del proyecto no puede estar vacío")
    @Size(min = 3, max = 120, message = "El nombre del proyecto debe tener entre 3 y 120 caracteres")
    private String name;

    @Size(max = 2000, message = "La descripción no puede exceder 2000 caracteres")
    private String description;

    @Builder.Default
    private String version = "v1.0.0";

    private List<String> tags;

    private UUID ownerId;

    private Map<String, Object> metadata;
}
