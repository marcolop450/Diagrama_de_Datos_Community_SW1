package com.sw1.casetool.repository;

import com.sw1.casetool.model.DiagramProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DiagramProjectRepository extends JpaRepository<DiagramProject, UUID> {
    List<DiagramProject> findByOwnerIdAndIsDeletedFalseOrderByUpdatedAtDesc(UUID ownerId);

    List<DiagramProject> findAllByIsDeletedFalseOrderByUpdatedAtDesc();

    Optional<DiagramProject> findByIdAndIsDeletedFalse(UUID id);

    long countByOwnerIdAndIsDeletedFalse(UUID ownerId);

    long countByIsDeletedFalse();

    List<DiagramProject> findByOwnerIdAndIsDeletedTrueOrderByUpdatedAtDesc(UUID ownerId);

    List<DiagramProject> findAllByIsDeletedTrueOrderByUpdatedAtDesc();

    Optional<DiagramProject> findByIdAndIsDeletedTrue(UUID id);

    long countByOwnerIdAndIsDeletedTrue(UUID ownerId);

    long countByIsDeletedTrue();
}
