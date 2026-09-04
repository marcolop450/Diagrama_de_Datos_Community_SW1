package com.sw1.casetool.repository;

import com.sw1.casetool.model.PaymentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentLogRepository extends JpaRepository<PaymentLog, UUID> {
    List<PaymentLog> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<PaymentLog> findByPaypalOrderId(String paypalOrderId);
    long countByUserId(UUID userId);
}
