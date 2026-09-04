package com.sw1.casetool.dto.subscription;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionStatusResponse {
    private String planId;
    private String planName;
    private boolean active;
    private Instant subscriptionExpiresAt;
    private long daysRemaining;
    private boolean canCancel;
    private boolean allowSpringBootGeneration;
    private boolean allowDdlGeneration;
    private boolean allowPostmanGeneration;
    private boolean allowXmiExport;
}
