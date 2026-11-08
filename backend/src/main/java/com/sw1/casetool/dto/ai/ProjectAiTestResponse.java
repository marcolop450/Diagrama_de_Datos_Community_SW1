package com.sw1.casetool.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectAiTestResponse {
    private boolean success;
    private int httpStatusCode;
    private long latencyMs;
    private String providerUsed;
    private String modelUsed;
    private String rawResponse;
    private List<UmlMutationDto> parsedMutations;
    private String errorMessage;
    private boolean isUmlValid;
}
