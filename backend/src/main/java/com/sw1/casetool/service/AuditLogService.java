package com.sw1.casetool.service;

import com.sw1.casetool.dto.audit.AuditLogResponse;
import com.sw1.casetool.dto.audit.AuditMetricsResponse;
import com.sw1.casetool.model.AuditLog;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.AuditLogRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserProfileRepository userProfileRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAction(
            UUID actorUserId,
            String actionType,
            String entityName,
            UUID entityId,
            String ipAddress,
            String userAgent,
            Map<String, Object> details
    ) {
        try {
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
        } catch (Exception e) {
            log.error("Error al persistir registro inmutable en audit_logs: {}", e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogs(
            String actionType,
            String search,
            Instant startDate,
            Instant endDate,
            Pageable pageable
    ) {
        Specification<AuditLog> spec = buildSpecification(actionType, search, startDate, endDate);
        Page<AuditLog> page = auditLogRepository.findAll(spec, pageable);

        List<AuditLogResponse> responses = enrichWithUserProfiles(page.getContent());
        return new PageImpl<>(responses, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getAllLogsForExport(
            String actionType,
            String search,
            Instant startDate,
            Instant endDate
    ) {
        Specification<AuditLog> spec = buildSpecification(actionType, search, startDate, endDate);
        List<AuditLog> logs = auditLogRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "timestamp"));
        return enrichWithUserProfiles(logs);
    }

    @Transactional(readOnly = true)
    public AuditMetricsResponse getAuditMetrics() {
        long totalEvents = auditLogRepository.count();
        long events24h = auditLogRepository.countByTimestampAfter(Instant.now().minus(24, ChronoUnit.HOURS));

        List<String> securityActions = List.of(
                "AUTH_LOGIN_FAILED", "USER_REGISTERED", "USER_ROLE_CHANGED",
                "USER_ACTIVATED", "USER_SUSPENDED", "USER_SELF_DELETED",
                "USER_LOGIN", "USER_STATUS_CHANGED", "AUTH_FAILURE"
        );
        long securityEvents = auditLogRepository.countByActionTypeIn(securityActions);

        List<String> projectActions = List.of("PROJECT_CREATED", "PROJECT_UPDATED", "PROJECT_DELETED", "PROJECT_CLONED");
        long projectEvents = auditLogRepository.countByActionTypeIn(projectActions);
        long activeUsers = userProfileRepository.countByIsActive(true);

        return AuditMetricsResponse.builder()
                .totalEvents(totalEvents)
                .events24h(events24h)
                .securityEvents(securityEvents)
                .projectEvents(projectEvents)
                .activeUsers(activeUsers)
                .build();
    }

    private Specification<AuditLog> buildSpecification(
            String actionType,
            String search,
            Instant startDate,
            Instant endDate
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (actionType != null && !actionType.isBlank() && !"ALL".equalsIgnoreCase(actionType)) {
                String normalized = actionType.trim();
                if ("USER_STATUS".equalsIgnoreCase(normalized) || "USER_STATUS_UPDATED".equalsIgnoreCase(normalized)) {
                    predicates.add(root.get("actionType").in("USER_ACTIVATED", "USER_SUSPENDED", "USER_SELF_DELETED", "USER_STATUS_CHANGED"));
                } else if ("USER_ROLE".equalsIgnoreCase(normalized) || "USER_ROLE_UPDATED".equalsIgnoreCase(normalized)) {
                    predicates.add(root.get("actionType").in("USER_ROLE_CHANGED", "USER_ROLE_UPDATED"));
                } else if ("AUTH_REGISTER".equalsIgnoreCase(normalized)) {
                    predicates.add(root.get("actionType").in("USER_REGISTERED", "AUTH_REGISTER"));
                } else {
                    predicates.add(cb.equal(root.get("actionType"), normalized));
                }
            }

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("timestamp"), startDate));
            }

            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("timestamp"), endDate));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate ipMatch = cb.like(cb.lower(root.get("ipAddress")), pattern);
                Predicate entityMatch = cb.like(cb.lower(root.get("entityName")), pattern);
                Predicate actionMatch = cb.like(cb.lower(root.get("actionType")), pattern);

                predicates.add(cb.or(ipMatch, entityMatch, actionMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private List<AuditLogResponse> enrichWithUserProfiles(List<AuditLog> logs) {
        if (logs == null || logs.isEmpty()) {
            return Collections.emptyList();
        }

        Set<UUID> userIds = logs.stream()
                .map(AuditLog::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, UserProfile> userProfileMap = new HashMap<>();
        if (!userIds.isEmpty()) {
            List<UserProfile> profiles = userProfileRepository.findAllById(userIds);
            for (UserProfile p : profiles) {
                userProfileMap.put(p.getUserId(), p);
            }
        }

        return logs.stream().map(log -> {
            UserProfile profile = log.getUserId() != null ? userProfileMap.get(log.getUserId()) : null;
            return AuditLogResponse.builder()
                    .id(log.getId())
                    .userId(log.getUserId())
                    .userEmail(profile != null ? profile.getEmail() : (log.getUserId() != null ? log.getUserId().toString() : "Sistema"))
                    .userFullName(profile != null ? profile.getFullName() : (log.getUserId() != null ? "Usuario" : "Proceso del Sistema"))
                    .userRole(profile != null ? profile.getRole() : "SISTEMA")
                    .actionType(log.getActionType())
                    .entityName(log.getEntityName())
                    .entityId(log.getEntityId())
                    .ipAddress(log.getIpAddress())
                    .userAgent(log.getUserAgent())
                    .details(log.getDetails())
                    .timestamp(log.getTimestamp())
                    .build();
        }).collect(Collectors.toList());
    }
}
