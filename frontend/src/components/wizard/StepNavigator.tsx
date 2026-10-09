import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import useWizardStore from '../../store/wizardStore';
import { glassActionBar, gradientButton } from '../../theme/glassStyles';
import EnhanceInput from './EnhanceInput';
import AttemptBrowser from './AttemptBrowser';
import { generateStep, retryStep, selectAttempt } from '../../api/steps';
import type { GenerationAttempt } from '../../types';

export default function StepNavigator() {
  const {
    currentStepIndex, steps, goBack, goNext, completeStep,
    setImageGenerationProgress, notifyAttemptUpdated,
  } = useWizardStore();

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const currentStep = steps[currentStepIndex];
  const canSkip = currentStep?.optional;

  // The actual DB step id comes from the project's steps — we look it up by name
  // The wizardStore steps don't hold the DB id, so we track via a stepId from
  // the project response. For now we derive it via ProjectPage context via store.
  // We expose a minimal generate/retry UX that works once a step id is available.
  const [stepId, setStepId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showEnhance, setShowEnhance] = useState(false);
  const [attempts, setAttempts] = useState<GenerationAttempt[]>([]);
  const [attemptIndex, setAttemptIndex] = useState(0);

  // Expose setter so ProjectPage can inject the current step's DB id
  // (stored on window for simplicity during Phase 2 — will be refactored in Phase 3)
  if (typeof window !== 'undefined') {
    (window as Record<string, unknown>).__setStepId = setStepId;
  }

  const handleGenerate = async () => {
    if (!stepId) return;
    const isImageGeneration = currentStep?.name === 'visuals';
    if (isImageGeneration) {
      setImageGenerationProgress({
        stepId, status: 'queued', progress: null, message: 'Preparing image generation…',
      });
    }
    setGenerating(true);
    try {
      const attempt = attempts.length === 0
        ? await generateStep(stepId, (update) => {
            if (isImageGeneration) {
              setImageGenerationProgress({
                stepId,
                status: update.status,
                progress: update.progress,
                message: update.message,
                error: update.error,
                attemptId: update.attempt?.id,
              });
            }
          })
        : await retryStep(stepId, undefined, (update) => {
            if (isImageGeneration) {
              setImageGenerationProgress({
                stepId,
                status: update.status,
                progress: update.progress,
                message: update.message,
                error: update.error,
                attemptId: update.attempt?.id,
              });
            }
          });
      const updated = [...attempts, attempt];
      setAttempts(updated);
      setAttemptIndex(updated.length - 1);
      completeStep(currentStepIndex);
      notifyAttemptUpdated(stepId);
    } catch (err) {
      console.error('Generate failed:', err);
      if (isImageGeneration) {
        setImageGenerationProgress({
          stepId,
          status: 'failed',
          progress: null,
          message: 'Image generation failed',
          error: err instanceof Error ? err.message : 'Unknown generation error',
        });
      }
    } finally {
      setGenerating(false);
      setShowEnhance(false);
    }
  };

  const handleEnhance = async (text: string) => {
    if (!stepId) return;
    const isImageGeneration = currentStep?.name === 'visuals';
    if (isImageGeneration) {
      setImageGenerationProgress({
        stepId, status: 'queued', progress: null, message: 'Preparing image generation…',
      });
    }
    setGenerating(true);
    try {
      const attempt = await retryStep(stepId, text, (update) => {
        if (isImageGeneration) {
          setImageGenerationProgress({
            stepId,
            status: update.status,
            progress: update.progress,
            message: update.message,
            error: update.error,
            attemptId: update.attempt?.id,
          });
        }
      });
      const updated = [...attempts, attempt];
      setAttempts(updated);
      setAttemptIndex(updated.length - 1);
      completeStep(currentStepIndex);
      notifyAttemptUpdated(stepId);
    } catch (err) {
      console.error('Enhance retry failed:', err);
      if (isImageGeneration) {
        setImageGenerationProgress({
          stepId,
          status: 'failed',
          progress: null,
          message: 'Image generation failed',
          error: err instanceof Error ? err.message : 'Unknown generation error',
        });
      }
    } finally {
      setGenerating(false);
      setShowEnhance(false);
    }
  };

  const handleSelect = async (attempt: GenerationAttempt) => {
    if (!stepId) return;
    try {
      const updated = await selectAttempt(stepId, attempt.id);
      setAttempts((prev) => prev.map((a) => ({ ...a, is_selected: a.id === updated.id })));
      completeStep(currentStepIndex);
    } catch (err) {
      console.error('Select failed:', err);
    }
  };

  const isCategoryStep = currentStep?.name === 'category';
  const isDnaStep = currentStep?.name === 'viral_dna';
  const isScriptStep = currentStep?.name === 'script';
  const isSceneImagesStep = currentStep?.name === 'scene_images';
  const hidesGenerateBar = isCategoryStep || isDnaStep || isScriptStep || isSceneImagesStep;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Enhance input — shown when toggled */}
      <Collapse in={showEnhance}>
        <EnhanceInput onEnhance={handleEnhance} disabled={generating} />
      </Collapse>

      {/* Attempt browser */}
      {attempts.length > 0 && !hidesGenerateBar && (
        <AttemptBrowser
          attempts={attempts}
          currentIndex={attemptIndex}
          onPrev={() => setAttemptIndex((i) => Math.max(0, i - 1))}
          onNext={() => setAttemptIndex((i) => Math.min(attempts.length - 1, i + 1))}
          onSelect={handleSelect}
        />
      )}

      {/* Main action bar */}
      <Box
        sx={{
          ...glassActionBar,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '12px',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={goBack}
            disabled={isFirstStep}
            size="small"
          >
            Back
          </Button>

          {canSkip && (
            <Button
              variant="text"
              endIcon={<SkipNextIcon />}
              onClick={() => goNext(true)}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              Skip
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Generate / Retry — shown for steps with generic AI generation */}
          {!hidesGenerateBar && !isLastStep && stepId && (
            <>
              <Button
                variant="outlined"
                startIcon={generating ? <CircularProgress size={14} /> : <RefreshIcon />}
                onClick={handleGenerate}
                disabled={generating}
                size="small"
                sx={{
                  borderColor: 'rgba(255,255,255,0.15)',
                  color: 'text.secondary',
                  '&:hover': { borderColor: '#06B6D4', color: '#06B6D4' },
                }}
              >
                {attempts.length === 0 ? 'Generate' : 'Retry'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<AutoFixHighIcon />}
                onClick={() => setShowEnhance((v) => !v)}
                disabled={generating || attempts.length === 0}
                size="small"
                sx={{
                  borderColor: showEnhance ? '#7C3AED' : 'rgba(255,255,255,0.15)',
                  color: showEnhance ? '#7C3AED' : 'text.secondary',
                  '&:hover': { borderColor: '#7C3AED', color: '#7C3AED' },
                }}
              >
                Enhance
              </Button>
            </>
          )}

          <Button
            variant="contained"
            endIcon={isLastStep ? undefined : <ArrowForwardIcon />}
            onClick={() => goNext()}
            disabled={isLastStep}
            size="small"
            sx={gradientButton}
          >
            {isLastStep ? 'Export' : 'Accept & Continue'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
