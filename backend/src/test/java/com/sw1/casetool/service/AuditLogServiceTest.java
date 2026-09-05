package com.sw1.casetool.service;

import com.sw1.casetool.dto.audit.AuditLogResponse;
import com.sw1.casetool.dto.audit.AuditMetricsResponse;
import com.sw1.casetool.model.AuditLog;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.AuditLogRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @InjectMocks
    private AuditLogService auditLogService;

    private UUID testUserId;
    private UserProfile testProfile;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        testProfile = UserProfile.builder()
                .id(testUserId)
                .userId(testUserId)
                .email("admin@sw1.com")
                .fullName("Super Administrador")
                .role("SUPER_ADMIN")
                .build();
    }

    @Test
    void testRecordAction_PersistsImmutableLog() {
        Map<String, Object> details = Map.of("reason", "Security audit check");
        UUID entityId = UUID.randomUUID();

        auditLogService.recordAction(
                testUserId,
                "USER_LOGIN",
                "UserProfile",
                entityId,
                "192.168.1.100",
                "Mozilla/5.0",
                details
        );

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository, times(1)).saveAndFlush(captor.capture());

        AuditLog saved = captor.getValue();
        assertNotNull(saved);
        assertNotNull(saved.getId());
        assertEquals(testUserId, saved.getUserId());
        assertEquals("USER_LOGIN", saved.getActionType());
        assertEquals("UserProfile", saved.getEntityName());
        assertEquals(entityId, saved.getEntityId());
        assertEquals("192.168.1.100", saved.getIpAddress());
        assertEquals("Mozilla/5.0", saved.getUserAgent());
        assertEquals(details, saved.getDetails());
        assertNotNull(saved.getTimestamp());
    }

    @Test
    void testGetAuditLogs_Pagination20Items_EnrichesUsers() {
        AuditLog log1 = AuditLog.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .actionType("PROJECT_CREATED")
                .entityName("DiagramProject")
                .entityId(UUID.randomUUID())
                .ipAddress("127.0.0.1")
                .timestamp(Instant.now())
                .build();

        Pageable pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<AuditLog> mockPage = new PageImpl<>(List.of(log1), pageable, 1);

        when(auditLogRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(mockPage);
        when(userProfileRepository.findAllById(anyCollection())).thenReturn(List.of(testProfile));

        Page<AuditLogResponse> result = auditLogService.getAuditLogs(
                "PROJECT_CREATED",
                null,
                null,
                null,
                pageable
        );

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        AuditLogResponse item = result.getContent().get(0);
        assertEquals("admin@sw1.com", item.getUserEmail());
        assertEquals("Super Administrador", item.getUserFullName());
        assertEquals("SUPER_ADMIN", item.getUserRole());
        assertEquals("PROJECT_CREATED", item.getActionType());
    }

    @Test
    void testGetAuditMetrics_CalculatesCounters() {
        when(auditLogRepository.count()).thenReturn(150L);
        when(auditLogRepository.countByTimestampAfter(any(Instant.class))).thenReturn(25L);
        when(auditLogRepository.countByActionTypeIn(anyCollection())).thenReturn(40L, 80L);
        when(userProfileRepository.countByIsActive(true)).thenReturn(10L);

        AuditMetricsResponse metrics = auditLogService.getAuditMetrics();

        assertNotNull(metrics);
        assertEquals(150L, metrics.getTotalEvents());
        assertEquals(25L, metrics.getEvents24h());
        assertEquals(40L, metrics.getSecurityEvents());
        assertEquals(80L, metrics.getProjectEvents());
        assertEquals(10L, metrics.getActiveUsers());
        assertEquals(150L, metrics.getTotalLogs());
        assertEquals(25L, metrics.getLogsLast24Hours());
        assertEquals(40L, metrics.getSecurityEventsCount());
        assertEquals(10L, metrics.getActiveAuditedUsers());
    }

    @Test
    void testGetAllLogsForExport_ReturnsEnrichedList() {
        AuditLog log1 = AuditLog.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .actionType("PROJECT_DELETED")
                .entityName("DiagramProject")
                .ipAddress("10.0.0.1")
                .timestamp(Instant.now())
                .build();

        when(auditLogRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(log1));
        when(userProfileRepository.findAllById(anyCollection())).thenReturn(List.of(testProfile));

        List<AuditLogResponse> result = auditLogService.getAllLogsForExport(
                null, null, null, null
        );

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("PROJECT_DELETED", result.get(0).getActionType());
        assertEquals("admin@sw1.com", result.get(0).getUserEmail());
    }
}
