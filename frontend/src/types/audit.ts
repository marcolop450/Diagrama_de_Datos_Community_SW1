export interface AuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  userFullName?: string;
  userRole?: string;
  actionType: string;
  entityName?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any> | string;
  timestamp: string;
}

export interface AuditMetrics {
  totalLogs?: number;
  totalEvents?: number;
  logsLast24Hours?: number;
  events24h?: number;
  logsLast7Days?: number;
  securityEventsCount?: number;
  securityEvents?: number;
  projectEvents?: number;
  activeAuditedUsers?: number;
  activeUsers?: number;
}

export interface AuditPageResponse {
  content: AuditLog[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
  page?: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface AuditQueryParams {
  page?: number;
  size?: number;
  actionType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}