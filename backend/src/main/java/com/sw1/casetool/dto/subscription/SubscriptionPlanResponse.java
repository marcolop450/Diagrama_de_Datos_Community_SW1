package com.sw1.casetool.dto.subscription;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionPlanResponse {
    private String id;
    private String name;
    private BigDecimal priceMonthly;
    private Integer maxProjects;
    private Integer maxClassesPerProject;
    private Boolean allowSpringBootGeneration;
    private Boolean allowDdlGeneration;
    private Boolean allowPostmanGeneration;
    private Boolean allowXmiExport;
    private Boolean allowVoiceCommands;
    private Boolean allowPhotoOcr;
    private Boolean allowRealtimeCollaboration;
}
