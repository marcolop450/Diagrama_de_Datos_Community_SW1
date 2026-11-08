package com.sw1.casetool.repository;

import com.sw1.casetool.model.SessionSnapshotFallback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionSnapshotFallbackRepository extends JpaRepository<SessionSnapshotFallback, UUID> {

    Optional<SessionSnapshotFallback> findTopBySessionCodeOrderByCreatedAtDesc(String sessionCode);

    List<SessionSnapshotFallback> findByProjectIdOrderByCreatedAtDesc(UUID projectId);

    void deleteBySessionCode(String sessionCode);
}
