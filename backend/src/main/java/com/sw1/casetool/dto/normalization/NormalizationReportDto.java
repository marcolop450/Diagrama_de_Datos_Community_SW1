package com.sw1.casetool.dto.normalization;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NormalizationReportDto {
    private int score; // 0 to 100
    private String status; // "COMPLIANT", "WARNINGS", "NON_COMPLIANT"
    private int totalEntities;
    private int totalRelationships;
    private int criticalIssuesCount;
    private int warningIssuesCount;
    private int infoIssuesCount;
    private int nf1IssuesCount;
    private int nf2IssuesCount;
    private int nf3IssuesCount;
    private List<NormalizationIssueDto> issues;
}
