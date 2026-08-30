package com.sw1.casetool.repository;

import com.sw1.casetool.model.DiagramProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface DiagramProjectRepository extends JpaRepository<DiagramProject, UUID> {
    List<DiagramProject> findByOwnerId(UUID ownerId);
    List<DiagramProject> findByNameContainingIgnoreCase(String name);
}
