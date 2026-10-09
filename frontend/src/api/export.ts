import apiClient from './client';

export interface ExportResult {
  caption: string | null;
  hashtags: string[];
  image_url: string | null;
}

export async function exportProject(projectId: string): Promise<ExportResult> {
  const { data } = await apiClient.post<ExportResult>(`/api/projects/${projectId}/export`);
  return data;
}
