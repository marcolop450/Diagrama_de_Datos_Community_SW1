package com.sw1.casetool.dto.collab;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StartSessionRequest {

    @NotNull(message = "El ID del proyecto es requerido para iniciar la sesión colaborativa")
    private UUID projectId;
}
