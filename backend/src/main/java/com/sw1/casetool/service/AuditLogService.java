package com.sw1.casetool.service;

import com.sw1.casetool.model.AuditLog;
import com.sw1.casetool.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void recordAction(
            UUID actorUserId,
            String actionType,
            String entityName,
            UUID entityId,
            String ipAddress,
            String userAgent,
            Map<String, Object> details
    ) {
        AuditLog log = AuditLog.builder()
                .id(UUID.randomUUID())
                .userId(actorUserId)
                .actionType(actionType)
                .entityName(entityName)
                .entityId(entityId)
                .ipAddress(ipAddress != null ? ipAddress : "127.0.0.1")
                .userAgent(userAgent != null ? userAgent : "CASE-Tool-Client")
                .details(details)
                .timestamp(Instant.now())
                .build();

        auditLogRepository.saveAndFlush(log);
    }
}
