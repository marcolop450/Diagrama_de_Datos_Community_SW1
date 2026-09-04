package com.sw1.casetool.dto.subscription;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CapturePayPalOrderRequest {
    @NotBlank(message = "El orderId es obligatorio")
    private String orderId;

    private String payerId;

    @NotBlank(message = "El planId es obligatorio")
    private String planId;
}
