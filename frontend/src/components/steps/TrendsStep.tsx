import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import useWizardStore from '../../store/wizardStore';
import useStepIdBridge from '../../hooks/useStepIdBridge';
import { listAttempts, updateStepData } from '../../api/steps';
import GenerationLoader from '../wizard/GenerationLoader';
import type { GenerationAttempt } from '../../types';

interface Topic {
  topic: string;
  score: number;
  description?: string;
}

interface Props {
  stepId?: string;
  selectedTopic?: string | null;
}

export default function TrendsStep({ stepId, selectedTopic }: Props) {
  useStepIdBridge(stepId);
  const attemptUpdate = useWizardStore((state) => state.attemptUpdate);
  const currentStepIndex = useWizardStore((state) => state.currentStepIndex);
  const completeStep = useWizardStore((state) => state.completeStep);

  const [attempts, setAttempts] = useState<GenerationAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(selectedTopic || null);
  const [customTopic, setCustomTopic] = useState('');

  useEffect(() => {
    if (!stepId) return;
    let cancelled = false;
    setLoading(true);
    listAttempts(stepId)
      .then((result) => {
        if (!cancelled) setAttempts(result);
      })
      .catch((err) => {
        console.error('Failed to load trend attempts:', err);
        if (!cancelled) setAttempts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stepId, attemptUpdate?.stepId, attemptUpdate?.revision]);

  const latest = attempts[attempts.length - 1];
  const topics = (latest?.output_data?.topics as Topic[] | undefined) || [];

  const pickTopic = async (topic: string) => {
    if (!stepId) return;
    setSelected(topic);
    await updateStepData(stepId, { selected_topic: topic });
    completeStep(currentStepIndex);
  };

  const submitCustom = async () => {
    if (!customTopic.trim()) return;
    await pickTopic(customTopic.trim());
    setCustomTopic('');
  };

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 0.5 }}>
        Trending Topics
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pick a trending topic to align your content with current buzz, or use your own.
      </Typography>

      {loading ? (
        <GenerationLoader label="Loading..." rows={2} />
      ) : topics.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {topics.map((t) => {
            const isSelected = selected === t.topic;
            return (
              <Chip
                key={t.topic}
                label={`${t.topic} · ${t.score}`}
                onClick={() => pickTopic(t.topic)}
                variant={isSelected ? 'filled' : 'outlined'}
                sx={
                  isSelected
                    ? { borderColor: '#06B6D4', background: 'rgba(6,182,212,0.15)', color: '#06B6D4' }
                    : { '&:hover': { borderColor: '#06B6D4' } }
                }
              />
            );
          })}
        </Box>
      ) : (
        <Typography variant="caption" color="text.disabled" sx={{ mb: 3, display: 'block' }}>
          Click "Generate" below to fetch trending topics for your category.
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Or type your own topic"
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitCustom()}
        />
        <Button variant="outlined" onClick={submitCustom} disabled={!customTopic.trim()}>
          Use
        </Button>
      </Box>

      {selected && (
        <Typography variant="caption" sx={{ mt: 2, display: 'block', color: '#06B6D4' }}>
          Selected: {selected}
        </Typography>
      )}
    </Box>
  );
}
