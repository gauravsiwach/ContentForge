export type ProjectType = 'image' | 'reel';
export type Platform = 'instagram' | 'facebook' | 'youtube';
export type ImageFormat = 'post_square' | 'post_portrait' | 'story' | 'thumbnail';
export type ReelFormat = 'reel' | 'short';
export type ProjectFormat = ImageFormat | ReelFormat;

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'needs_refresh';

export interface Project {
  id: string;
  type: ProjectType;
  category: string | null;
  platform: Platform | null;
  format: ProjectFormat | null;
  current_step: string;
  viral_dna_id: string | null;
  reel_mode: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectStep {
  id: string;
  project_id: string;
  step_name: string;
  step_order: number;
  status: StepStatus;
  selected_attempt_id: string | null;
  input_data: Record<string, unknown> | null;
}

export interface GenerationAttempt {
  id: string;
  step_id: string;
  attempt_number: number;
  enhancement: string | null;
  provider_used: string | null;
  prompt_used: string | null;
  output_data: Record<string, unknown> | null;
  is_selected: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  keywords: string[];
}

export const IMAGE_STEPS = [
  { name: 'category', label: 'Category', order: 1 },
  { name: 'viral_dna', label: 'Viral DNA', order: 2, optional: true },
  { name: 'trends', label: 'Trends', order: 3, optional: true },
  { name: 'caption', label: 'Content', order: 4 },
  { name: 'visuals', label: 'Image', order: 5 },
  { name: 'review', label: 'Review', order: 6 },
] as const;

export const REEL_STEPS = [
  { name: 'category', label: 'Category', order: 1 },
  { name: 'viral_dna', label: 'Viral DNA', order: 2, optional: true },
  { name: 'trends', label: 'Trends', order: 3, optional: true },
  { name: 'script', label: 'Script', order: 4 },
  { name: 'scene_images', label: 'Scenes', order: 5 },
  { name: 'audio', label: 'Audio', order: 6 },
  { name: 'assembly', label: 'Assembly', order: 7 },
  { name: 'review', label: 'Review', order: 8 },
] as const;

export type ImageStepName = (typeof IMAGE_STEPS)[number]['name'];
export type ReelStepName = (typeof REEL_STEPS)[number]['name'];
export type StepName = ImageStepName | ReelStepName;

export const getStepsForType = (type: ProjectType) =>
  type === 'image' ? IMAGE_STEPS : REEL_STEPS;
