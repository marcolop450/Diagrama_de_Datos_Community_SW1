package com.sw1.casetool.repository.nosql;

import com.sw1.casetool.model.nosql.CollabSessionSnapshotDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CollabSessionSnapshotRepository extends MongoRepository<CollabSessionSnapshotDocument, String> {

    Optional<CollabSessionSnapshotDocument> findTopBySessionCodeOrderBySavedAtDesc(String sessionCode);

    List<CollabSessionSnapshotDocument> findByProjectIdOrderBySavedAtDesc(String projectId);

    Optional<CollabSessionSnapshotDocument> findBySessionCodeAndStatus(String sessionCode, String status);

    void deleteBySessionCode(String sessionCode);
}
