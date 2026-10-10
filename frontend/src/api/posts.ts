import apiClient from './client';
import type { ProjectStep } from '../types';

export interface PostSummary {
  id: string;
  project_id: string;
  post_number: number;
  current_step: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Post extends PostSummary {
  selected_trend_id?: string | null;
  steps: ProjectStep[];
}

export interface PostCompletionResult {
  post: Post;
  project_status: string;
}

export interface TrendUsage {
  trend_id?: string | null;
  topic: string;
  post_id: string;
  post_number: number;
}

export interface TrendPostUsage {
  post_id: string;
  post_number: number;
}

export interface ProjectTrend {
  id: string;
  project_id: string;
  topic: string;
  description: string | null;
  score: number | null;
  source: string;
  first_generated_at: string | null;
  last_generated_at: string | null;
  used_by_posts: TrendPostUsage[];
}

export async function listPosts(projectId: string): Promise<PostSummary[]> {
  const { data } = await apiClient.get<PostSummary[]>(`/api/projects/${projectId}/posts`);
  return data;
}

export async function createPost(projectId: string): Promise<Post> {
  const { data } = await apiClient.post<Post>(`/api/projects/${projectId}/posts`);
  return data;
}

export async function getPost(postId: string): Promise<Post> {
  const { data } = await apiClient.get<Post>(`/api/posts/${postId}`);
  return data;
}

export async function navigatePost(
  postId: string,
  targetStep: string,
  skipCurrent = false,
): Promise<Post> {
  const { data } = await apiClient.post<Post>(`/api/posts/${postId}/navigate`, {
    target_step: targetStep,
    skip_current: skipCurrent,
  });
  return data;
}

export async function completePost(postId: string): Promise<PostCompletionResult> {
  const { data } = await apiClient.post<PostCompletionResult>(`/api/posts/${postId}/complete`);
  return data;
}

export async function getTrendUsage(projectId: string): Promise<TrendUsage[]> {
  const { data } = await apiClient.get<TrendUsage[]>(`/api/projects/${projectId}/trends/usage`);
  return data;
}

export async function getProjectTrends(projectId: string): Promise<ProjectTrend[]> {
  const { data } = await apiClient.get<ProjectTrend[]>(`/api/projects/${projectId}/trends`);
  return data;
}

export async function generateProjectTrends(projectId: string): Promise<ProjectTrend[]> {
  const { data } = await apiClient.post<ProjectTrend[]>(`/api/projects/${projectId}/trends/generate`);
  return data;
}

export async function selectPostTrend(postId: string, trendId: string | null): Promise<Post> {
  const { data } = await apiClient.put<Post>(`/api/posts/${postId}/trend`, { trend_id: trendId });
  return data;
}
