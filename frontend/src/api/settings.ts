import apiClient from './client';

export interface ProviderSettings {
  id: string;
  task_type: string;
  mode: string;
  provider: string;
  api_key: string | null;
  model: string | null;
  base_url: string | null;
  extra_config: Record<string, unknown> | null;
}

export interface ProviderUpdate {
  mode?: string;
  provider?: string;
  api_key?: string;
  model?: string | null;
  base_url?: string | null;
}

export interface TestResult {
  success: boolean;
  message: string;
}

export async function listProviders(): Promise<ProviderSettings[]> {
  const { data } = await apiClient.get<ProviderSettings[]>('/api/settings/providers');
  return data;
}

export async function updateProvider(taskType: string, update: ProviderUpdate): Promise<ProviderSettings> {
  const { data } = await apiClient.put<ProviderSettings>(`/api/settings/providers/${taskType}`, update);
  return data;
}

export async function testProvider(taskType: string): Promise<TestResult> {
  const { data } = await apiClient.post<TestResult>(`/api/settings/providers/${taskType}/test`);
  return data;
}
