package com.sw1.casetool.dto.user;

import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdatePreferencesRequest {

    private String theme; // "dark" or "light"
    private Boolean grid;
    private Boolean snapToGrid;
    private Integer autoSaveInterval;
    private Double defaultZoom;
    private String canvasTheme; // "dark", "light", "blue", "cream"
    private Boolean onboardingCompleted;
    private Map<String, Object> customSettings;
}
