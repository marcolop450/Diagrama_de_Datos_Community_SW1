package com.sw1.casetool.dto.normalization;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NormalizationIssueDto {
    private String id;
    private NormalForm normalForm;
    private NormalizationSeverity severity;
    private String ruleId;
    private String targetType; // "CLASS" or "RELATIONSHIP"
    private String targetId;
    private String targetName;
    private String attributeName;
    private String message;
    private String recommendation;
    private boolean quickFixAvailable;
    private String quickFixAction;
}
