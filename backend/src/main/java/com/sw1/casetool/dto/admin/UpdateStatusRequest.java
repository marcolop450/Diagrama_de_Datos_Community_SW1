package com.sw1.casetool.dto.admin;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateStatusRequest {

    @NotNull(message = "El estado activo/inactivo es obligatorio")
    private Boolean isActive;
}
