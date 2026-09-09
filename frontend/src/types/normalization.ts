export type NormalForm = '1NF' | '2NF' | '3NF';
export type NormalizationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface NormalizationIssue {
  id: string;
  normalForm: NormalForm;
  severity: NormalizationSeverity;
  ruleId: string;
  targetType: 'CLASS' | 'RELATIONSHIP';
  targetId?: string | null;
  targetName: string;
  attributeName?: string | null;
  message: string;
  recommendation: string;
  quickFixAvailable: boolean;
  quickFixAction?: string | null;
}

export interface NormalizationReport {
  score: number; // 0 - 100
  status: 'COMPLIANT' | 'WARNINGS' | 'NON_COMPLIANT';
  totalEntities: number;
  totalRelationships: number;
  criticalIssuesCount: number;
  warningIssuesCount: number;
  infoIssuesCount: number;
  nf1IssuesCount: number;
  nf2IssuesCount: number;
  nf3IssuesCount: number;
  issues: NormalizationIssue[];
}
