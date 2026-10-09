import apiClient from './client';

export interface SceneImageVariant {
  asset_url?: string;
  prompt_used?: string;
  enhancement?: string | null;
}

export interface Scene {
  id: string;
  project_id: string;
  scene_number: number;
  narration: string;
  visual_desc: string;
  duration_sec: number;
  image_url: string | null;
  image_history: SceneImageVariant[] | null;
  selected_history_index: number;
}

export interface SceneEditItem {
  scene_number: number;
  narration: string;
  visual_desc: string;
  duration_sec: number;
}

export async function listScenes(projectId: string): Promise<Scene[]> {
  const { data } = await apiClient.get<Scene[]>(`/api/projects/${projectId}/scenes`);
  return data;
}

export async function updateScenes(projectId: string, scenes: SceneEditItem[]): Promise<Scene[]> {
  const { data } = await apiClient.put<Scene[]>(`/api/projects/${projectId}/scenes`, { scenes });
  return data;
}

export async function generateAllSceneImages(projectId: string): Promise<Scene[]> {
  const { data } = await apiClient.post<Scene[]>(`/api/projects/${projectId}/scenes/generate-all`);
  return data;
}

export async function generateSceneImage(projectId: string, sceneId: string): Promise<Scene> {
  const { data } = await apiClient.post<Scene>(`/api/projects/${projectId}/scenes/${sceneId}/generate-image`);
  return data;
}

export async function retrySceneImage(projectId: string, sceneId: string, enhancement?: string): Promise<Scene> {
  const { data } = await apiClient.post<Scene>(`/api/projects/${projectId}/scenes/${sceneId}/retry`, {
    enhancement: enhancement || null,
  });
  return data;
}

export async function selectSceneVariant(projectId: string, sceneId: string, historyIndex: number): Promise<Scene> {
  const { data } = await apiClient.put<Scene>(`/api/projects/${projectId}/scenes/${sceneId}/select`, {
    history_index: historyIndex,
  });
  return data;
}
