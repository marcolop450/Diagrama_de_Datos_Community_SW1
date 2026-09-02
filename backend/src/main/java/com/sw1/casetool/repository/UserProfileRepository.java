package com.sw1.casetool.repository;

import com.sw1.casetool.model.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {
    Optional<UserProfile> findByUserId(UUID userId);
    Optional<UserProfile> findByEmail(String email);
    Optional<UserProfile> findByUsername(String username);
    Optional<UserProfile> findByEmailIgnoreCase(String email);
    Optional<UserProfile> findByUsernameIgnoreCase(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByUsernameIgnoreCase(String username);
}
