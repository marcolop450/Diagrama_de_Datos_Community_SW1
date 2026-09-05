package com.sw1.casetool.repository;

import com.sw1.casetool.model.ClassNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ClassNodeRepository extends JpaRepository<ClassNode, UUID> {
    List<ClassNode> findByProjectId(UUID projectId);
    long countByProjectId(UUID projectId);

    @Modifying
    @Query("DELETE FROM ClassNode c WHERE c.project.id = :projectId")
    void deleteByProjectId(@Param("projectId") UUID projectId);
}
