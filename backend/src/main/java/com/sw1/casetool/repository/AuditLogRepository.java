package com.sw1.casetool.repository;

import com.sw1.casetool.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {
    List<AuditLog> findByUserIdOrderByTimestampDesc(UUID userId);
    List<AuditLog> findTop50ByOrderByTimestampDesc();
    long countByTimestampAfter(Instant instant);
    long countByActionTypeIn(Collection<String> actionTypes);
    List<AuditLog> findAllByOrderByTimestampDesc();
}
