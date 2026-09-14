package com.sw1.casetool.dto.generator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeneratePostmanRequest {

    @Builder.Default
    private String baseUrl = "http://localhost:8081";

    @Builder.Default
    private boolean includeTests = true;

    @Builder.Default
    private boolean includeMockData = true;

    @Builder.Default
    private String authType = "none"; // "none" o "bearer"
}
