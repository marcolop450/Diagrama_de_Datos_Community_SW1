package com.sw1.casetool.dto.subscription;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePayPalOrderResponse {
    private String orderId;
    private String status;
    private String planId;
    private BigDecimal amount;
    private String currency;
}
