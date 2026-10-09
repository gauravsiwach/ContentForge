import apiClient from './client';
import type { GenerationAttempt } from '../types';

export interface GenerationProgressUpdate {
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number | null;
  message: string;
  error?: string;
  attempt?: GenerationAttempt;
}

type ProgressListener = (update: GenerationProgressUpdate) => void;

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function waitForGeneration(
  startRequest: () => Promise<{ data: GenerationAttempt | { job_id: string; status: string; progress: number | null; message: string } }>,
  onProgress?: ProgressListener,
): Promise<GenerationAttempt> {
  const { data: started } = await startRequest();
  if (!('job_id' in started)) return started;

  while (true) {
    const { data: job } = await apiClient.get<GenerationProgressUpdate & { job_id: string }>(
      `/api/steps/generation-jobs/${started.job_id}`,
    );
    onProgress?.(job);
    if (job.status === 'completed' && job.attempt) return job.attempt;
    if (job.status === 'failed') throw new Error(job.error || job.message || 'Generation failed');
    await delay(800);
  }
}

export async function generateStep(
  stepId: string,
  onProgress?: ProgressListener,
): Promise<GenerationAttempt> {
  return waitForGeneration(
    () => apiClient.post(`/api/steps/${stepId}/generate`, {}),
    onProgress,
  );
}

export async function retryStep(
  stepId: string,
  enhancement?: string,
  onProgress?: ProgressListener,
): Promise<GenerationAttempt> {
  return waitForGeneration(
    () => apiClient.post(`/api/steps/${stepId}/retry`, { enhancement: enhancement || null }),
    onProgress,
  );
}

export async function selectAttempt(stepId: string, attemptId: string): Promise<GenerationAttempt> {
  const { data } = await apiClient.put<GenerationAttempt>(`/api/steps/${stepId}/select`, {
    attempt_id: attemptId,
  });
  return data;
}

export async function listAttempts(stepId: string): Promise<GenerationAttempt[]> {
  const { data } = await apiClient.get<GenerationAttempt[]>(`/api/steps/${stepId}/attempts`);
  return data;
}

export async function updateStepData(
  stepId: string,
  inputData: Record<string, unknown>,
): Promise<{ id: string; input_data: Record<string, unknown> | null }> {
  const { data } = await apiClient.put(`/api/steps/${stepId}`, { input_data: inputData });
  return data;
}
