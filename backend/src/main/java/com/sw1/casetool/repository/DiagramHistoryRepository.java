package com.sw1.casetool.repository;

import com.sw1.casetool.model.DiagramHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DiagramHistoryRepository extends JpaRepository<DiagramHistory, UUID> {

    @Query("SELECT h FROM DiagramHistory h WHERE h.project.id = :projectId ORDER BY h.createdAt DESC")
    List<DiagramHistory> findByProjectIdOrderByCreatedAtDesc(@Param("projectId") UUID projectId);

    @Query("SELECT COUNT(h) FROM DiagramHistory h WHERE h.project.id = :projectId")
    long countByProjectId(@Param("projectId") UUID projectId);

    @Modifying
    @Query("DELETE FROM DiagramHistory h WHERE h.project.id = :projectId")
    void deleteByProjectId(@Param("projectId") UUID projectId);
}
