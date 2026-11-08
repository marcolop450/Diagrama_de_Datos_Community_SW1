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
public class AiTeamResponseDto {

    public enum Intent {
        THEORY_EXPLANATION,
        STRUCTURAL_MUTATION,
        CATCH_UP_SUMMARY,
        CONSISTENCY_AUDIT,
        APPLY_REPAIR,
        PROJECT_ACTION,
        OUT_OF_SCOPE
    }

    private Intent intent;
    private String chatResponse;
    private List<UmlMutationDto> mutations;
    private String actionSummary;
    private String requesterName;
    private String providerUsed;
    private String actionType;
    private java.util.Map<String, Object> actionData;
}
