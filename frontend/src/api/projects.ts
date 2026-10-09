import apiClient from './client';
import type { Project, Category } from '../types';

interface ProjectResponse extends Project {
  steps: {
    id: string;
    project_id: string;
    step_name: string;
    step_order: number;
    status: string;
    selected_attempt_id: string | null;
    input_data: Record<string, unknown> | null;
    attempts: unknown[];
  }[];
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

export async function createProject(type: 'image' | 'reel'): Promise<ProjectResponse> {
  const { data } = await apiClient.post<ProjectResponse>('/api/projects', { type });
  return data;
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const { data } = await apiClient.get<ProjectListItem[]>('/api/projects');
  return data;
}

export async function getProject(id: string): Promise<ProjectResponse> {
  const { data } = await apiClient.get<ProjectResponse>(`/api/projects/${id}`);
  return data;
}

export async function updateProject(
  id: string,
  updates: { category?: string; platform?: string; format?: string },
): Promise<ProjectResponse> {
  const { data } = await apiClient.put<ProjectResponse>(`/api/projects/${id}`, updates);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/api/projects/${id}`);
}

export async function navigateStep(
  projectId: string,
  targetStep: string,
  skipCurrent = false,
): Promise<ProjectResponse> {
  const { data } = await apiClient.post<ProjectResponse>(
    `/api/projects/${projectId}/navigate`,
    { target_step: targetStep, skip_current: skipCurrent },
  );
  return data;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<Category[]>('/api/categories');
  return data;
}
