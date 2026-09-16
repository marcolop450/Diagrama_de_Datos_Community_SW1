package com.sw1.casetool.dto.collab;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinSessionRequest {

    @NotBlank(message = "El código de sala es requerido")
    private String sessionCode;

    private String dni;

    private String fullName;
}
