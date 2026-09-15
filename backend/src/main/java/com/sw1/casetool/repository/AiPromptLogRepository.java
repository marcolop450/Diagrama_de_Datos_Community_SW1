package com.sw1.casetool.repository;

import com.sw1.casetool.model.AiPromptLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiPromptLogRepository extends JpaRepository<AiPromptLog, UUID> {
    List<AiPromptLog> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
    List<AiPromptLog> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<AiPromptLog> findTop50ByOrderByCreatedAtDesc();
}
