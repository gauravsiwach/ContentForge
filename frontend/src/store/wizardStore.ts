import { create } from 'zustand';
import type { Project, ProjectType, StepStatus, Platform, ProjectFormat } from '../types';
import { getStepsForType } from '../types';
import { createProject, getProject, updateProject, navigateStep } from '../api/projects';

interface StepState {
  name: string;
  label: string;
  order: number;
  status: StepStatus;
  optional?: boolean;
}

interface DbStep {
  id: string;
  step_name: string;
  step_order: number;
  status: string;
}

export interface PreviewData {
  overlay_text?: string;
  feed_caption?: string;
  hashtags?: string[];
  image_url?: string;
}

export interface ImageGenerationProgress {
  stepId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number | null;
  message: string;
  error?: string;
  attemptId?: string;
}

interface AttemptUpdate {
  stepId: string;
  revision: number;
}

interface WizardState {
  project: Project | null;
  projectType: ProjectType | null;
  currentStepIndex: number;
  steps: StepState[];
  dbSteps: DbStep[];
  previewData: PreviewData;
  imageGenerationProgress: ImageGenerationProgress | null;
  attemptUpdate: AttemptUpdate | null;
  isLoading: boolean;

  // Actions
  initWizardFromApi: (type: ProjectType) => Promise<string | null>;
  loadProjectFromApi: (id: string) => Promise<boolean>;
  setCurrentStep: (index: number, previousStatus?: 'completed' | 'skipped') => void;
  goNext: (skipCurrent?: boolean) => void;
  goBack: () => void;
  navigateToStep: (index: number) => Promise<void>;
  completeStep: (index: number) => void;
  markNeedsRefresh: (fromIndex: number) => void;
  setPreviewData: (data: Partial<PreviewData>) => void;
  setImageGenerationProgress: (progress: ImageGenerationProgress | null) => void;
  notifyAttemptUpdated: (stepId: string) => void;
  setProject: (project: Project) => void;
  setCategory: (category: string) => void;
  setPlatform: (platform: Platform) => void;
  setFormat: (format: ProjectFormat) => void;
  saveProjectUpdates: () => Promise<void>;
  reset: () => void;
}

function buildStepsFromApi(
  apiSteps: { step_name: string; step_order: number; status: string }[],
  projectType: ProjectType,
): StepState[] {
  const stepDefs = getStepsForType(projectType);
  return stepDefs.map((def) => {
    const apiStep = apiSteps.find((s) => s.step_name === def.name);
    return {
      name: def.name,
      label: def.label,
      order: def.order,
      status: (apiStep?.status || 'pending') as StepStatus,
      optional: 'optional' in def ? def.optional : undefined,
    };
  });
}

const useWizardStore = create<WizardState>((set, get) => ({
  project: null,
  projectType: null,
  currentStepIndex: 0,
  steps: [],
  dbSteps: [],
  previewData: {},
  imageGenerationProgress: null,
  attemptUpdate: null,
  isLoading: false,

  initWizardFromApi: async (type) => {
    set({ isLoading: true });
    try {
      const response = await createProject(type);
      const steps = buildStepsFromApi(response.steps, type);
      set({
        projectType: type,
        currentStepIndex: 0,
        steps,
        dbSteps: response.steps,
        project: {
          id: response.id,
          type: response.type as ProjectType,
          category: response.category,
          platform: response.platform as Platform | null,
          format: response.format as ProjectFormat | null,
          current_step: response.current_step,
          viral_dna_id: response.viral_dna_id,
          reel_mode: response.reel_mode,
          status: response.status,
          created_at: response.created_at,
          updated_at: response.updated_at,
        },
        isLoading: false,
      });
      return response.id;
    } catch (err) {
      console.error('Failed to create project:', err);
      set({ isLoading: false });
      return null;
    }
  },

  loadProjectFromApi: async (id) => {
    set({ isLoading: true });
    try {
      const response = await getProject(id);
      const type = response.type as ProjectType;
      const steps = buildStepsFromApi(response.steps, type);
      const currentIndex = steps.findIndex((s) => s.name === response.current_step);
      set({
        projectType: type,
        currentStepIndex: currentIndex >= 0 ? currentIndex : 0,
        steps,
        dbSteps: response.steps,
        project: {
          id: response.id,
          type,
          category: response.category,
          platform: response.platform as Platform | null,
          format: response.format as ProjectFormat | null,
          current_step: response.current_step,
          viral_dna_id: response.viral_dna_id,
          reel_mode: response.reel_mode,
          status: response.status,
          created_at: response.created_at,
          updated_at: response.updated_at,
        },
        isLoading: false,
      });
      return true;
    } catch (err) {
      console.error('Failed to load project:', err);
      set({ isLoading: false });
      return false;
    }
  },

  setCurrentStep: (index, previousStatus = 'completed') => {
    const { steps, currentStepIndex, project } = get();
    if (index < 0 || index >= steps.length) return;

    const movingBack = index < currentStepIndex;
    const updatedSteps = steps.map((step, i) => {
      if (movingBack && i > index && step.status === 'completed') {
        return { ...step, status: 'needs_refresh' as StepStatus };
      }
      if (i === currentStepIndex && index === currentStepIndex + 1) {
        return { ...step, status: previousStatus };
      }
      if (i === index) return { ...step, status: 'in_progress' as StepStatus };
      return step;
    });
    set({
      currentStepIndex: index,
      steps: updatedSteps,
      project: project ? { ...project, current_step: steps[index].name } : null,
    });
  },

  navigateToStep: async (index) => {
    const { project, steps } = get();
    if (!project || index < 0 || index >= steps.length) return;

    const targetStepName = steps[index].name;
    try {
      const response = await navigateStep(project.id, targetStepName);
      const updatedSteps = buildStepsFromApi(response.steps, project.type as ProjectType);
      const newIndex = updatedSteps.findIndex((s) => s.name === response.current_step);
      set({
        currentStepIndex: newIndex >= 0 ? newIndex : index,
        steps: updatedSteps,
        dbSteps: response.steps,
        project: { ...project, current_step: response.current_step },
      });
    } catch (err) {
      // Fallback to local navigation if BE fails
      console.error('Navigate API failed, using local fallback:', err);
      get().setCurrentStep(index);
    }
  },

  goNext: (skipCurrent = false) => {
    const { currentStepIndex, steps, project } = get();
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const nextStep = steps[nextIndex];
      // Keep the UI consistent immediately, even if the API request fails.
      get().setCurrentStep(nextIndex, skipCurrent ? 'skipped' : 'completed');
      if (project) {
        navigateStep(project.id, nextStep.name, skipCurrent).then((response) => {
          const updatedSteps = buildStepsFromApi(response.steps, project.type as ProjectType);
          const newIndex = updatedSteps.findIndex((s) => s.name === response.current_step);
          set({
            currentStepIndex: newIndex >= 0 ? newIndex : nextIndex,
            steps: updatedSteps,
            dbSteps: response.steps,
            project: { ...project, current_step: response.current_step },
          });
        }).catch((err) => {
          console.error('Navigate API failed on goNext:', err);
        });
      }
    }
  },

  goBack: () => {
    const { currentStepIndex, project, steps } = get();
    if (currentStepIndex > 0) {
      const prevStep = steps[currentStepIndex - 1];
      if (project) {
        navigateStep(project.id, prevStep.name).then((response) => {
          const updatedSteps = buildStepsFromApi(response.steps, project.type as ProjectType);
          const newIndex = updatedSteps.findIndex((s) => s.name === response.current_step);
          set({
            currentStepIndex: newIndex >= 0 ? newIndex : currentStepIndex - 1,
            steps: updatedSteps,
            project: { ...project, current_step: response.current_step },
          });
        }).catch((err) => {
          console.error('Navigate API failed on goBack:', err);
        });
      }
      // Optimistic local update
      get().setCurrentStep(currentStepIndex - 1);
    }
  },

  completeStep: (index) => {
    set((state) => ({
      steps: state.steps.map((s, i) =>
        i === index ? { ...s, status: 'completed' } : s
      ),
    }));
  },

  markNeedsRefresh: (fromIndex) => {
    set((state) => ({
      steps: state.steps.map((s, i) =>
        i > fromIndex && s.status === 'completed'
          ? { ...s, status: 'needs_refresh' }
          : s
      ),
    }));
  },

  setPreviewData: (data) =>
    set((state) => ({ previewData: { ...state.previewData, ...data } })),

  setImageGenerationProgress: (progress) => set({ imageGenerationProgress: progress }),

  notifyAttemptUpdated: (stepId) =>
    set((state) => ({
      attemptUpdate: {
        stepId,
        revision: (state.attemptUpdate?.revision ?? 0) + 1,
      },
    })),

  setProject: (project) => set({ project }),

  setCategory: (category) => {
    set((state) => ({
      project: state.project ? { ...state.project, category } : null,
      steps: state.steps.map((step) =>
        step.name === 'category' ? { ...step, status: 'completed' } : step
      ),
    }));
  },

  setPlatform: (platform) => {
    set((state) => ({
      project: state.project ? { ...state.project, platform } : null,
    }));
  },

  setFormat: (format) => {
    set((state) => ({
      project: state.project ? { ...state.project, format } : null,
    }));
  },

  saveProjectUpdates: async () => {
    const { project } = get();
    if (!project) return;
    try {
      await updateProject(project.id, {
        category: project.category || undefined,
        platform: project.platform || undefined,
        format: project.format || undefined,
      });
    } catch (err) {
      console.error('Failed to save project updates:', err);
    }
  },

  reset: () =>
    set({
      project: null,
      projectType: null,
      currentStepIndex: 0,
      steps: [],
      dbSteps: [],
      previewData: {},
      imageGenerationProgress: null,
      attemptUpdate: null,
      isLoading: false,
    }),
}));

export default useWizardStore;
