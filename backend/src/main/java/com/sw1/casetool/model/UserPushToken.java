package com.sw1.casetool.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_push_tokens", uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_device_token", columnNames = {"user_id", "push_token"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPushToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "push_token", nullable = false, length = 255)
    private String pushToken;

    @Column(name = "device_type", length = 50)
    @Builder.Default
    private String deviceType = "android";

    @Column(name = "device_name", length = 100)
    private String deviceName;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
