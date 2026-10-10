import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import WizardLayout from '../components/wizard/WizardLayout';
import CategoryStep from '../components/steps/CategoryStep';
import ViralDnaStep from '../components/steps/ViralDnaStep';
import TrendsStep from '../components/steps/TrendsStep';
import CaptionStep from '../components/steps/CaptionStep';
import ImageStep from '../components/steps/ImageStep';
import ReviewStep from '../components/steps/ReviewStep';
import ScriptStep from '../components/steps/ScriptStep';
import SceneImagesStep from '../components/steps/SceneImagesStep';
import PlaceholderStep from '../components/steps/PlaceholderStep';
import PreviewPanel from '../components/preview/PreviewPanel';
import PostSwitcher from '../components/posts/PostSwitcher';
import useWizardStore from '../store/wizardStore';

const STEP_CONFIGS: Record<string, { title: string; description: string }> = {
  caption: {
    title: 'Content',
    description: 'Generate the text that goes on your image + the feed caption. Approve one before generating the image.',
  },
  audio: {
    title: 'Audio & Music',
    description: 'Add voiceover and background music to your reel',
  },
  assembly: {
    title: 'Video Assembly',
    description: 'Assemble your reel with transitions and effects',
  },
};

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { project, steps, dbSteps, currentStepIndex, activePost, loadProjectFromApi } = useWizardStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id && project?.id !== id) {
      setLoading(true);
      loadProjectFromApi(id).then((success) => {
        setLoading(false);
        if (!success) navigate('/');
      });
    }
  }, [project?.id, id, navigate, loadProjectFromApi]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!project || steps.length === 0) {
    return null;
  }

  const currentStep = steps[currentStepIndex];
  const currentDbStep = dbSteps.find((s) => s.step_name === currentStep?.name);

  const renderStep = () => {
    switch (currentStep.name) {
      case 'category':
        return <CategoryStep />;
      case 'viral_dna':
        return <ViralDnaStep />;
      case 'trends':
        return (
          <TrendsStep
            key={`${currentDbStep?.id ?? ''}-${activePost?.id ?? ''}`}
            stepId={currentDbStep?.id}
            projectId={project.id}
            postId={activePost?.id}
            selectedTrendId={activePost?.selected_trend_id ?? null}
            selectedTopic={typeof currentDbStep?.input_data?.selected_topic === 'string'
              ? currentDbStep.input_data.selected_topic
              : null}
          />
        );
      case 'caption':
        return <CaptionStep key={currentDbStep?.id} stepId={currentDbStep?.id} />;
      case 'visuals':
        return <ImageStep key={currentDbStep?.id} stepId={currentDbStep?.id} />;
      case 'script':
        return <ScriptStep stepId={currentDbStep?.id} />;
      case 'scene_images':
        return <SceneImagesStep />;
      case 'review':
        return <ReviewStep />;
      default: {
        const config = STEP_CONFIGS[currentStep.name];
        if (config) {
          return (
            <PlaceholderStep
              title={config.title}
              description={config.description}
              stepId={currentDbStep?.id}
            />
          );
        }
        return (
          <Box>
            <Typography color="text.secondary">Unknown step: {currentStep.name}</Typography>
          </Box>
        );
      }
    }
  };

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>
        {project.category
          ? `${project.category.charAt(0).toUpperCase() + project.category.slice(1)} — ${project.type === 'image' ? 'Image Post' : 'Reel'}`
          : `New ${project.type === 'image' ? 'Image Post' : 'Reel'}`}
      </Typography>

      <WizardLayout
        headerPanel={project.type === 'image' ? <PostSwitcher /> : undefined}
        stepPanel={renderStep()}
        previewPanel={<PreviewPanel />}
      />
    </Box>
  );
}
