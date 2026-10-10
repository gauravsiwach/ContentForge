import { create } from 'zustand';
import type { Project, ProjectType, StepStatus, Platform, ProjectFormat, ProjectStep } from '../types';
import { getStepsForType } from '../types';
import { createProject, getProject, updateProject, navigateStep, type ProjectWithSteps } from '../api/projects';
import { completePost, createPost, getPost, listPosts, navigatePost, type Post, type PostSummary } from '../api/posts';
import { API_BASE_URL } from '../api/client';

interface StepState {
  name: string;
  label: string;
  order: number;
  status: StepStatus;
  optional?: boolean;
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
  dbSteps: ProjectStep[];
  posts: PostSummary[];
  activePost: Post | null;
  previewData: PreviewData;
  imageGenerationProgress: ImageGenerationProgress | null;
  attemptUpdate: AttemptUpdate | null;
  isLoading: boolean;

  initWizardFromApi: (type: ProjectType) => Promise<string | null>;
  loadProjectFromApi: (id: string) => Promise<boolean>;
  setCurrentStep: (index: number, previousStatus?: 'completed' | 'skipped') => void;
  goNext: (skipCurrent?: boolean) => Promise<void>;
  goBack: () => Promise<void>;
  navigateToStep: (index: number) => Promise<void>;
  setActivePost: (postId: string) => Promise<void>;
  syncActivePost: (post: Post) => void;
  createNewPost: () => Promise<void>;
  completeActivePost: () => Promise<void>;
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

const SHARED_IMAGE_STEPS = new Set(['category', 'viral_dna']);

function projectFromResponse(response: ProjectWithSteps): Project {
  return {
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
  };
}

function composeDbSteps(
  projectSteps: ProjectStep[],
  post: Post | null,
  projectType: ProjectType,
): ProjectStep[] {
  if (projectType !== 'image' || !post) return projectSteps;
  const sharedSteps = projectSteps.filter(
    (step) => SHARED_IMAGE_STEPS.has(step.step_name) && !step.post_id,
  );
  return [...sharedSteps, ...post.steps].sort((a, b) => a.step_order - b.step_order);
}

function buildStepsFromApi(apiSteps: ProjectStep[], projectType: ProjectType): StepState[] {
  const stepDefs = getStepsForType(projectType);
  return stepDefs.map((definition) => {
    const apiStep = apiSteps.find((step) => step.step_name === definition.name);
    return {
      name: definition.name,
      label: definition.label,
      order: definition.order,
      status: (apiStep?.status || 'pending') as StepStatus,
      optional: 'optional' in definition ? definition.optional : undefined,
    };
  });
}

function getInitialIndex(steps: StepState[], post: Post | null, project: Project): number {
  if (project.type === 'image') {
    const unfinishedShared = steps.findIndex(
      (step) => SHARED_IMAGE_STEPS.has(step.name) && !['completed', 'skipped'].includes(step.status),
    );
    if (unfinishedShared >= 0) return unfinishedShared;
    const postStep = steps.findIndex((step) => step.name === post?.current_step);
    if (postStep >= 0) return postStep;
  }
  const projectStep = steps.findIndex((step) => step.name === project.current_step);
  return projectStep >= 0 ? projectStep : 0;
}

function postSummary(post: Post): PostSummary {
  const { id, project_id, post_number, current_step, status, created_at, updated_at } = post;
  return { id, project_id, post_number, current_step, status, created_at, updated_at };
}

function previewForPost(post: Post): PreviewData {
  const captionStep = post.steps.find((step) => step.step_name === 'caption');
  const captionAttempt = captionStep?.attempts?.find((attempt) => attempt.is_selected)
    ?? captionStep?.attempts?.[captionStep.attempts.length - 1];
  const variants = captionAttempt?.output_data?.variants;
  const selectedVariant = Number(captionStep?.input_data?.selected_variant ?? 0);
  const caption = Array.isArray(variants)
    ? variants[selectedVariant] as Record<string, unknown> | undefined
    : undefined;

  const imageStep = post.steps.find((step) => step.step_name === 'visuals');
  const imageAttempt = imageStep?.attempts?.find((attempt) => attempt.is_selected)
    ?? imageStep?.attempts?.[imageStep.attempts.length - 1];
  const images = imageAttempt?.output_data?.images;
  const selectedImage = Array.isArray(images)
    ? images[Number(imageStep?.input_data?.selected_index ?? 0)] as Record<string, unknown> | undefined
    : undefined;
  const assetUrl = typeof selectedImage?.asset_url === 'string' ? selectedImage.asset_url : null;
  const imageUrl = assetUrl
    ? `${API_BASE_URL}${assetUrl}`
    : typeof selectedImage?.url === 'string' ? selectedImage.url : undefined;

  return {
    overlay_text: typeof captionStep?.input_data?.edited_overlay_text === 'string'
      ? captionStep.input_data.edited_overlay_text
      : typeof caption?.overlay_text === 'string' ? caption.overlay_text : undefined,
    feed_caption: typeof captionStep?.input_data?.edited_feed_caption === 'string'
      ? captionStep.input_data.edited_feed_caption
      : typeof caption?.feed_caption === 'string' ? caption.feed_caption : undefined,
    hashtags: Array.isArray(caption?.hashtags)
      ? caption.hashtags.filter((tag): tag is string => typeof tag === 'string')
      : undefined,
    image_url: imageUrl,
  };
}

const useWizardStore = create<WizardState>((set, get) => {
  const applyImagePost = (post: Post, summaries: PostSummary[], projectSteps?: ProjectStep[]) => {
    const { project } = get();
    if (!project) return;
    const updatedSummaries = summaries.map((summary) =>
      summary.id === post.id ? postSummary(post) : summary,
    );
    const dbSteps = composeDbSteps(projectSteps ?? get().dbSteps, post, 'image');
    const steps = buildStepsFromApi(dbSteps, 'image');
    set({
      activePost: post,
      posts: updatedSummaries,
      dbSteps,
      steps,
      currentStepIndex: getInitialIndex(steps, post, project),
      previewData: previewForPost(post),
      imageGenerationProgress: null,
      attemptUpdate: null,
    });
  };

  return {
    project: null,
    projectType: null,
    currentStepIndex: 0,
    steps: [],
    dbSteps: [],
    posts: [],
    activePost: null,
    previewData: {},
    imageGenerationProgress: null,
    attemptUpdate: null,
    isLoading: false,

    initWizardFromApi: async (type) => {
      set({ isLoading: true });
      try {
        const response = await createProject(type);
        const project = projectFromResponse(response);
        set({ project, projectType: type });

        if (type === 'image') {
          const firstPost = await createPost(project.id);
          const steps = composeDbSteps(response.steps, firstPost, type);
          const wizardSteps = buildStepsFromApi(steps, type);
          set({
            project,
            projectType: type,
            currentStepIndex: getInitialIndex(wizardSteps, firstPost, project),
            steps: wizardSteps,
            dbSteps: steps,
            posts: [postSummary(firstPost)],
            activePost: firstPost,
            previewData: {},
            isLoading: false,
          });
        } else {
          const steps = buildStepsFromApi(response.steps, type);
          set({
            project,
            projectType: type,
            currentStepIndex: 0,
            steps,
            dbSteps: response.steps,
            posts: [],
            activePost: null,
            isLoading: false,
          });
        }
        return response.id;
      } catch (err) {
        console.error('Failed to create project or its first post:', err);
        set({ isLoading: false });
        return null;
      }
    },

    loadProjectFromApi: async (id) => {
      set({ isLoading: true });
      try {
        const response = await getProject(id);
        const project = projectFromResponse(response);
        if (project.type === 'image') {
          let summaries = await listPosts(id);
          let selectedPost: Post;
          if (summaries.length === 0) {
            selectedPost = await createPost(id);
            summaries = [postSummary(selectedPost)];
          } else {
            selectedPost = await getPost(summaries[summaries.length - 1].id);
          }
          const dbSteps = composeDbSteps(response.steps, selectedPost, 'image');
          const steps = buildStepsFromApi(dbSteps, 'image');
          set({
            project,
            projectType: 'image',
            currentStepIndex: getInitialIndex(steps, selectedPost, project),
            steps,
            dbSteps,
            posts: summaries,
            activePost: selectedPost,
            previewData: {},
            imageGenerationProgress: null,
            isLoading: false,
          });
        } else {
          const steps = buildStepsFromApi(response.steps, project.type);
          const currentIndex = steps.findIndex((step) => step.name === response.current_step);
          set({
            project,
            projectType: project.type,
            currentStepIndex: currentIndex >= 0 ? currentIndex : 0,
            steps,
            dbSteps: response.steps,
            posts: [],
            activePost: null,
            isLoading: false,
          });
        }
        return true;
      } catch (err) {
        console.error('Failed to load project:', err);
        set({ isLoading: false });
        return false;
      }
    },

    setActivePost: async (postId) => {
      const { project, posts } = get();
      if (!project || project.type !== 'image' || postId === get().activePost?.id) return;
      set({ isLoading: true });
      try {
        const post = await getPost(postId);
        applyImagePost(post, posts);
      } catch (err) {
        console.error('Failed to switch post:', err);
        throw err;
      } finally {
        set({ isLoading: false });
      }
    },

    syncActivePost: (post) => {
      const { project, posts, activePost } = get();
      if (!project || !activePost || activePost.id !== post.id) return;
      applyImagePost(post, posts);
    },

    createNewPost: async () => {
      const { project, posts } = get();
      if (!project || project.type !== 'image') return;
      set({ isLoading: true });
      try {
        const post = await createPost(project.id);
        const summaries = [...posts, postSummary(post)];
        applyImagePost(post, summaries);
        const updatedProject = await getProject(project.id);
        set({ project: projectFromResponse(updatedProject) });
      } finally {
        set({ isLoading: false });
      }
    },

    completeActivePost: async () => {
      const { activePost, project, posts } = get();
      if (!activePost || !project || project.type !== 'image') return;
      const result = await completePost(activePost.id);
      applyImagePost(result.post, posts);
      set({
        project: { ...get().project!, status: result.project_status },
      });
    },

    setCurrentStep: (index, previousStatus = 'completed') => {
      const { steps, currentStepIndex, project } = get();
      if (index < 0 || index >= steps.length) return;

      const movingBack = index < currentStepIndex;
      const updatedSteps = steps.map((step, stepIndex) => {
        if (movingBack && stepIndex > index && step.status === 'completed') {
          return { ...step, status: 'needs_refresh' as StepStatus };
        }
        if (stepIndex === currentStepIndex && index === currentStepIndex + 1) {
          return { ...step, status: previousStatus };
        }
        if (stepIndex === index) return { ...step, status: 'in_progress' as StepStatus };
        return step;
      });
      set({
        currentStepIndex: index,
        steps: updatedSteps,
        project: project && project.type !== 'image'
          ? { ...project, current_step: steps[index].name }
          : project,
      });
    },

    navigateToStep: async (index) => {
      const { project, steps, activePost } = get();
      if (!project || index < 0 || index >= steps.length) return;
      const targetName = steps[index].name;
      if (project.type === 'image') {
        if (SHARED_IMAGE_STEPS.has(targetName)) {
          get().setCurrentStep(index);
          return;
        }
        if (!activePost) return;
        try {
          if (SHARED_IMAGE_STEPS.has(steps[get().currentStepIndex]?.name) && targetName === 'trends') {
            const updatedProject = await navigateStep(project.id, targetName);
            set({ project: projectFromResponse(updatedProject) });
          }
          const post = await navigatePost(activePost.id, targetName);
          applyImagePost(post, get().posts);
        } catch (err) {
          console.error('Post navigation failed:', err);
        }
        return;
      }

      try {
        const response = await navigateStep(project.id, targetName);
        const updatedSteps = buildStepsFromApi(response.steps, project.type);
        const newIndex = updatedSteps.findIndex((step) => step.name === response.current_step);
        set({
          currentStepIndex: newIndex >= 0 ? newIndex : index,
          steps: updatedSteps,
          dbSteps: response.steps,
          project: projectFromResponse(response),
        });
      } catch (err) {
        console.error('Navigate API failed:', err);
      }
    },

    goNext: async (skipCurrent = false) => {
      const { currentStepIndex, steps, project, activePost } = get();
      if (!project || currentStepIndex >= steps.length - 1) return;
      const nextIndex = currentStepIndex + 1;
      const nextStep = steps[nextIndex];

      if (project.type === 'image') {
        if (SHARED_IMAGE_STEPS.has(nextStep.name)) {
          try {
            const response = await navigateStep(project.id, nextStep.name, skipCurrent);
            const shared = response.steps.filter(
              (step) => SHARED_IMAGE_STEPS.has(step.step_name) && !step.post_id,
            );
            const dbSteps = composeDbSteps(shared, activePost, 'image');
            const updatedSteps = buildStepsFromApi(dbSteps, 'image');
            set({
              project: projectFromResponse(response),
              dbSteps,
              steps: updatedSteps,
              currentStepIndex: nextIndex,
            });
          } catch (err) {
            console.error('Shared-step navigation failed:', err);
          }
          return;
        }
        if (!activePost) return;
        try {
          if (nextStep.name === 'trends') {
            const response = await navigateStep(project.id, 'trends', skipCurrent);
            set({ project: projectFromResponse(response) });
          }
          const post = await navigatePost(activePost.id, nextStep.name, skipCurrent);
          applyImagePost(post, get().posts);
        } catch (err) {
          console.error('Post navigation failed:', err);
        }
        return;
      }

      get().setCurrentStep(nextIndex, skipCurrent ? 'skipped' : 'completed');
      try {
        const response = await navigateStep(project.id, nextStep.name, skipCurrent);
        const updatedSteps = buildStepsFromApi(response.steps, project.type);
        const newIndex = updatedSteps.findIndex((step) => step.name === response.current_step);
        set({
          currentStepIndex: newIndex >= 0 ? newIndex : nextIndex,
          steps: updatedSteps,
          dbSteps: response.steps,
          project: projectFromResponse(response),
        });
      } catch (err) {
        console.error('Navigate API failed on goNext:', err);
      }
    },

    goBack: async () => {
      const { currentStepIndex } = get();
      if (currentStepIndex > 0) await get().navigateToStep(currentStepIndex - 1);
    },

    completeStep: (index) => set((state) => ({
      steps: state.steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, status: 'completed' } : step,
      ),
    })),

    markNeedsRefresh: (fromIndex) => set((state) => ({
      steps: state.steps.map((step, index) =>
        index > fromIndex && step.status === 'completed'
          ? { ...step, status: 'needs_refresh' }
          : step,
      ),
    })),

    setPreviewData: (data) => set((state) => ({ previewData: { ...state.previewData, ...data } })),
    setImageGenerationProgress: (progress) => set({ imageGenerationProgress: progress }),
    notifyAttemptUpdated: (stepId) => set((state) => {
      const isPostStep = state.dbSteps.some((step) => step.id === stepId && step.post_id);
      const activePost = isPostStep && state.activePost
        ? { ...state.activePost, status: 'in_progress' }
        : state.activePost;
      return {
        attemptUpdate: { stepId, revision: (state.attemptUpdate?.revision ?? 0) + 1 },
        activePost,
        posts: activePost
          ? state.posts.map((post) => post.id === activePost.id ? postSummary(activePost) : post)
          : state.posts,
      };
    }),
    setProject: (project) => set({ project }),

    setCategory: (category) => set((state) => ({
      project: state.project ? { ...state.project, category } : null,
      steps: state.steps.map((step) =>
        step.name === 'category' ? { ...step, status: 'completed' } : step,
      ),
    })),

    setPlatform: (platform) => set((state) => ({
      project: state.project ? { ...state.project, platform } : null,
    })),
    setFormat: (format) => set((state) => ({
      project: state.project ? { ...state.project, format } : null,
    })),

    saveProjectUpdates: async () => {
      const { project } = get();
      if (!project) return;
      try {
        const response = await updateProject(project.id, {
          category: project.category || undefined,
          platform: project.platform || undefined,
          format: project.format || undefined,
        });
        set({ project: projectFromResponse(response) });
      } catch (err) {
        console.error('Failed to save project updates:', err);
      }
    },

    reset: () => set({
      project: null,
      projectType: null,
      currentStepIndex: 0,
      steps: [],
      dbSteps: [],
      posts: [],
      activePost: null,
      previewData: {},
      imageGenerationProgress: null,
      attemptUpdate: null,
      isLoading: false,
    }),
  };
});

export default useWizardStore;
