package com.sw1.casetool.repository;

import com.sw1.casetool.model.Relationship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface RelationshipRepository extends JpaRepository<Relationship, UUID> {
    List<Relationship> findByProjectId(UUID projectId);
    List<Relationship> findBySourceClassIdOrTargetClassId(UUID sourceId, UUID targetId);
    long countByProjectId(UUID projectId);
}
