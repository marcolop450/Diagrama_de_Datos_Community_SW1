package com.sw1.casetool.repository;

import com.sw1.casetool.model.DiagramHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface DiagramHistoryRepository extends JpaRepository<DiagramHistory, UUID> {
    List<DiagramHistory> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
}
