import apiClient from './client';

export interface ViralDnaProfile {
  id: string;
  project_id: string;
  source_type: 'auto' | 'manual';
  source_urls: string[] | null;
  category: string | null;
  dna_data: {
    colors?: string[];
    style?: string;
    mood?: string;
    cta?: string;
    hooks?: string[];
    composition?: string;
    text_overlay?: boolean;
    face_visible?: boolean;
    [key: string]: unknown;
  };
}

export async function autoDiscoverDna(projectId: string, category?: string): Promise<ViralDnaProfile> {
  const { data } = await apiClient.post<ViralDnaProfile>(`/api/projects/${projectId}/viral-dna/auto`, {
    category: category || null,
  });
  return data;
}

export async function manualAnalyzeDna(projectId: string, url: string): Promise<ViralDnaProfile> {
  const { data } = await apiClient.post<ViralDnaProfile>(`/api/projects/${projectId}/viral-dna/manual`, { url });
  return data;
}

export async function getDna(projectId: string): Promise<ViralDnaProfile | null> {
  try {
    const { data } = await apiClient.get<ViralDnaProfile>(`/api/projects/${projectId}/viral-dna`);
    return data;
  } catch {
    return null;
  }
}

export async function updateDna(projectId: string, dnaData: Record<string, unknown>): Promise<ViralDnaProfile> {
  const { data } = await apiClient.put<ViralDnaProfile>(`/api/projects/${projectId}/viral-dna`, {
    dna_data: dnaData,
  });
  return data;
}
