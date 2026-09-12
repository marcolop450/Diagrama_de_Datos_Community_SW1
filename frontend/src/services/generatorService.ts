import { apiClient } from './api';

export interface GenerateBackendConfig {
  packageName?: string;
  groupId?: string;
  artifactId?: string;
  javaVersion?: string;
  databaseType?: string;
  includeMavenWrapper?: boolean;
  includeSwagger?: boolean;
}

export interface GenerationPreviewResponse {
  projectName: string;
  packageName: string;
  totalClasses: number;
  totalFiles: number;
  fileTree: string[];
}

export interface GenerateSqlDdlConfig {
  dropTables?: boolean;
  createIndexes?: boolean;
  includeComments?: boolean;
  includeForeignKeys?: boolean;
  schema?: string;
}

export interface SqlDdlResponse {
  projectName: string;
  fileName: string;
  sql: string;
  totalTables: number;
  totalColumns: number;
  totalForeignKeys: number;
  totalIndexes: number;
}

export const getBackendPreview = async (
  projectId: string,
  config: GenerateBackendConfig
): Promise<GenerationPreviewResponse> => {
  const response = await apiClient.post<{ success: boolean; data: GenerationPreviewResponse }>(
    `/projects/${projectId}/generate/backend/preview`,
    config
  );
  return response.data.data;
};

export const downloadBackendZip = async (
  projectId: string,
  projectName: string,
  config: GenerateBackendConfig
): Promise<void> => {
  const response = await apiClient.post(
    `/projects/${projectId}/generate/backend`,
    config,
    {
      responseType: 'blob',
    }
  );

  const cleanProjectName = (config.artifactId || projectName || 'backend')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');
  const filename = `${cleanProjectName}-backend.zip`;

  const blob = new Blob([response.data], { type: 'application/zip' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
};

export const generateSqlDdl = async (
  projectId: string,
  config?: GenerateSqlDdlConfig
): Promise<SqlDdlResponse> => {
  const response = await apiClient.post<{ success: boolean; data: SqlDdlResponse }>(
    `/projects/${projectId}/generate/sql-ddl`,
    config || {}
  );
  return response.data.data;
};

export const downloadSqlDdl = async (
  projectId: string,
  projectName: string,
  config?: GenerateSqlDdlConfig
): Promise<void> => {
  const response = await apiClient.post(
    `/projects/${projectId}/generate/sql-ddl/download`,
    config || {},
    {
      responseType: 'blob',
    }
  );

  const cleanProjectName = (projectName || 'esquema')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');
  const filename = `${cleanProjectName}-schema.sql`;

  const blob = new Blob([response.data], { type: 'application/sql' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
};
