import apiClient from './client';
import type { Project, ProjectStep, Category } from '../types';

export interface ProjectWithSteps extends Project {
  steps: ProjectStep[];
}

interface ProjectListItem {
  id: string;
  type: 'image' | 'reel';
  category: string | null;
  platform: string | null;
  format: string | null;
  current_step: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function createProject(type: 'image' | 'reel'): Promise<ProjectWithSteps> {
  const { data } = await apiClient.post<ProjectWithSteps>('/api/projects', { type });
  return data;
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const { data } = await apiClient.get<ProjectListItem[]>('/api/projects');
  return data;
}

export async function getProject(id: string): Promise<ProjectWithSteps> {
  const { data } = await apiClient.get<ProjectWithSteps>(`/api/projects/${id}`);
  return data;
}

export async function completeProject(id: string): Promise<ProjectWithSteps> {
  const { data } = await apiClient.post<ProjectWithSteps>(`/api/projects/${id}/complete`);
  return data;
}

export async function updateProject(
  id: string,
  updates: { category?: string; platform?: string; format?: string },
): Promise<ProjectWithSteps> {
  const { data } = await apiClient.put<ProjectWithSteps>(`/api/projects/${id}`, updates);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/api/projects/${id}`);
}

export async function navigateStep(
  projectId: string,
  targetStep: string,
  skipCurrent = false,
): Promise<ProjectWithSteps> {
  const { data } = await apiClient.post<ProjectWithSteps>(
    `/api/projects/${projectId}/navigate`,
    { target_step: targetStep, skip_current: skipCurrent },
  );
  return data;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<Category[]>('/api/categories');
  return data;
}
