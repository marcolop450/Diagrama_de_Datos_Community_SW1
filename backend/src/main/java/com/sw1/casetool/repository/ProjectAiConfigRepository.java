package com.sw1.casetool.repository;

import com.sw1.casetool.model.ProjectAiConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectAiConfigRepository extends JpaRepository<ProjectAiConfig, UUID> {
    Optional<ProjectAiConfig> findByProjectId(UUID projectId);
    boolean existsByProjectId(UUID projectId);
    void deleteByProjectId(UUID projectId);
}
