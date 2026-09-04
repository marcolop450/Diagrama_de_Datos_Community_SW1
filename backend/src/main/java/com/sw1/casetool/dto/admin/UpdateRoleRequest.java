package com.sw1.casetool.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRoleRequest {

    @NotBlank(message = "El nuevo rol es obligatorio")
    @Pattern(regexp = "^(SUPER_ADMIN|ARQUITECTO|COLABORADOR)$", message = "El rol debe ser SUPER_ADMIN, ARQUITECTO o COLABORADOR")
    private String role;
}
