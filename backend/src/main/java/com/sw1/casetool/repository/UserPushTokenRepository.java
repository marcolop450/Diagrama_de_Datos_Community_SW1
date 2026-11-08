package com.sw1.casetool.repository;

import com.sw1.casetool.model.UserPushToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserPushTokenRepository extends JpaRepository<UserPushToken, UUID> {
    List<UserPushToken> findByUserIdAndIsActiveTrue(UUID userId);
    List<UserPushToken> findByUserIdInAndIsActiveTrue(List<UUID> userIds);
    Optional<UserPushToken> findByUserIdAndPushToken(UUID userId, String pushToken);
    List<UserPushToken> findByIsActiveTrue();
}
