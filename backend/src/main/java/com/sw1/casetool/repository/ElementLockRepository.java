package com.sw1.casetool.repository;

import com.sw1.casetool.model.ElementLock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ElementLockRepository extends JpaRepository<ElementLock, UUID> {

    List<ElementLock> findBySessionId(UUID sessionId);

    Optional<ElementLock> findBySessionIdAndElementId(UUID sessionId, UUID elementId);

    @Modifying
    @Query("DELETE FROM ElementLock el WHERE el.session.id = :sessionId AND el.elementId = :elementId")
    void deleteBySessionIdAndElementId(@Param("sessionId") UUID sessionId, @Param("elementId") UUID elementId);

    @Modifying
    @Query("DELETE FROM ElementLock el WHERE el.session.id = :sessionId AND el.lockedBy = :lockedBy")
    void deleteBySessionIdAndLockedBy(@Param("sessionId") UUID sessionId, @Param("lockedBy") UUID lockedBy);

    @Modifying
    @Query("DELETE FROM ElementLock el WHERE el.session.id = :sessionId")
    void deleteBySessionId(@Param("sessionId") UUID sessionId);

    @Modifying
    @Query("DELETE FROM ElementLock el WHERE el.expiresAt < :now")
    void deleteExpiredLocks(@Param("now") Instant now);
}
