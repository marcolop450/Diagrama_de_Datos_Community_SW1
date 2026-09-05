package com.sw1.casetool.dto.audit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditMetricsResponse {
    private long totalEvents;
    private long events24h;
    private long securityEvents;
    private long projectEvents;
    private long activeUsers;
    private Map<String, Long> eventsByAction;

    // Aliases to ensure 100% compatibility with frontend KPI cards
    public long getTotalLogs() {
        return totalEvents;
    }

    public long getLogsLast24Hours() {
        return events24h;
    }

    public long getSecurityEventsCount() {
        return securityEvents;
    }

    public long getActiveAuditedUsers() {
        return activeUsers;
    }
}
