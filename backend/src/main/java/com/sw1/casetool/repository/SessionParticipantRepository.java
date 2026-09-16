package com.sw1.casetool.repository;

import com.sw1.casetool.model.SessionParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Repository
public interface SessionParticipantRepository extends JpaRepository<SessionParticipant, UUID> {
    List<SessionParticipant> findBySessionId(UUID sessionId);
    List<SessionParticipant> findByUserId(UUID userId);

    @Modifying
    @Transactional
    void deleteBySessionIdAndUserId(UUID sessionId, UUID userId);

    @Modifying
    @Transactional
    void deleteBySessionId(UUID sessionId);
}

