export interface DiagramHistoryEntry {
  id: string;
  projectId: string;
  projectName: string;
  userId: string;
  userFullName: string;
  userEmail?: string;
  userRole?: string;
  userAvatarUrl?: string;
  actionType: string;
  actionLabelSpanish: string;
  entityType: string;
  entityId?: string;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  createdAt: string;
}

export type HistoryFilterCategory = 'ALL' | 'PROJECT' | 'NODE' | 'RELATIONSHIP';
