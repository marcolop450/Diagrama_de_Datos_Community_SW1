package com.sw1.casetool.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "subscription_plans")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SubscriptionPlan {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private String id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "price_monthly", nullable = false)
    private BigDecimal priceMonthly;

    @Column(name = "max_projects")
    private Integer maxProjects;

    @Column(name = "max_classes_per_project")
    private Integer maxClassesPerProject;

    @Column(name = "allow_spring_boot_generation")
    private Boolean allowSpringBootGeneration;

    @Column(name = "allow_ddl_generation")
    private Boolean allowDdlGeneration;

    @Column(name = "allow_postman_generation")
    private Boolean allowPostmanGeneration;

    @Column(name = "allow_xmi_export")
    private Boolean allowXmiExport;

    @Column(name = "allow_voice_commands")
    private Boolean allowVoiceCommands;

    @Column(name = "allow_photo_ocr")
    private Boolean allowPhotoOcr;

    @Column(name = "allow_realtime_collaboration")
    private Boolean allowRealtimeCollaboration;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
