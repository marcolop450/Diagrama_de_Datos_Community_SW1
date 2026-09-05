package com.sw1.casetool.repository;

import com.sw1.casetool.model.ClassNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ClassNodeRepository extends JpaRepository<ClassNode, UUID> {
    List<ClassNode> findByProjectId(UUID projectId);
    long countByProjectId(UUID projectId);
}
