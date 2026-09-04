package com.sw1.casetool.dto.subscription;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentReceiptResponse {
    private UUID id;
    private String invoiceNumber;
    private String paypalOrderId;
    private String paypalPayerId;
    private String planId;
    private String planName;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;
    private String status;
    private Instant createdAt;
    private Instant subscriptionExpiresAt;
    private String userFullName;
    private String userEmail;
    private String username;
}
