package com.sw1.casetool.repository;

import com.sw1.casetool.model.CollaborationSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

@Repository
public interface CollaborationSessionRepository extends JpaRepository<CollaborationSession, UUID> {
    Optional<CollaborationSession> findBySessionCode(String code);
    List<CollaborationSession> findByProjectIdAndStatus(UUID projectId, String status);
}
