package com.sw1.casetool.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CloneProjectRequest {
    @NotBlank(message = "El nombre del proyecto clonado no puede estar vacío")
    @Size(min = 3, max = 120, message = "El nombre del clon debe tener entre 3 y 120 caracteres")
    private String newName;
}
