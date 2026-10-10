import { useEffect, useState } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ClearIcon from '@mui/icons-material/Clear';
import useWizardStore from '../../store/wizardStore';
import {
  generateProjectTrends,
  getPost,
  getProjectTrends,
  selectPostTrend,
  type ProjectTrend,
} from '../../api/posts';
import { updateStepData } from '../../api/steps';
import { useToastStore } from '../../store/toastStore';
import GenerationLoader from '../wizard/GenerationLoader';
import styles from './TrendsStep.module.css';

interface Props {
  stepId?: string;
  projectId?: string;
  postId?: string;
  selectedTrendId?: string | null;
  selectedTopic?: string | null;
}

function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ detail?: string }>(error)) {
    return error.response?.data?.detail || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function normalizeTopic(topic: string): string {
  return topic.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

export default function TrendsStep({
  stepId,
  projectId,
  postId,
  selectedTrendId,
  selectedTopic,
}: Props) {
  const currentStepIndex = useWizardStore((state) => state.currentStepIndex);
  const completeStep = useWizardStore((state) => state.completeStep);
  const syncActivePost = useWizardStore((state) => state.syncActivePost);
  const addToast = useToastStore((state) => state.addToast);

  const [trends, setTrends] = useState<ProjectTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedId = selectedTrendId ?? null;
  const selectedText = selectedTopic ?? null;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    getProjectTrends(projectId)
      .then((items) => {
        if (!cancelled) setTrends(items);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(errorMessage(error, 'Could not load this project’s trend pool.'));
        setTrends([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const refreshPool = async () => {
    if (!projectId) return;
    const items = await getProjectTrends(projectId);
    setTrends(items);
    setLoadError(null);
  };

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    setLoadError(null);
    try {
      const updated = await generateProjectTrends(projectId);
      const oldIds = new Set(trends.map((trend) => trend.id));
      const addedCount = updated.filter((trend) => !oldIds.has(trend.id)).length;
      setTrends(updated);
      addToast(
        addedCount > 0 ? `Added ${addedCount} new trend${addedCount === 1 ? '' : 's'} to this project.` : 'No new unique trends were found; your existing pool is unchanged.',
        addedCount > 0 ? 'success' : 'info',
      );
    } catch (error) {
      const message = errorMessage(error, 'Trend generation failed. Check the text provider and try again.');
      setLoadError(message);
      addToast(message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelect = async (trend: ProjectTrend) => {
    if (!postId || saving) return;
    setSaving(true);
    try {
      const updatedPost = await selectPostTrend(postId, trend.id);
      syncActivePost(updatedPost);
      completeStep(currentStepIndex);
      addToast(`Selected “${trend.topic}” for this post.`, 'success');
      try {
        await refreshPool();
      } catch {
        addToast('Selection was saved, but usage labels could not be refreshed.', 'info');
      }
    } catch (error) {
      addToast(errorMessage(error, 'Could not save this trend selection.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearSelection = async () => {
    if (!postId || saving) return;
    setSaving(true);
    try {
      const updatedPost = await selectPostTrend(postId, null);
      syncActivePost(updatedPost);
      addToast('Trend selection cleared. The topic is available to other posts.', 'success');
      try {
        await refreshPool();
      } catch {
        addToast('Selection was cleared, but the pool could not be refreshed.', 'info');
      }
    } catch (error) {
      addToast(errorMessage(error, 'Could not clear this trend selection.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUseCustomTopic = async () => {
    const topic = customTopic.trim();
    if (!stepId || !postId || !topic || saving) return;
    setSaving(true);
    try {
      await updateStepData(stepId, { selected_topic: topic });
      const updatedPost = await getPost(postId);
      syncActivePost(updatedPost);
      setCustomTopic('');
      completeStep(currentStepIndex);
      addToast('Custom topic added to the project pool and selected for this post.', 'success');
      try {
        await refreshPool();
      } catch {
        addToast('Topic was saved, but the pool could not be refreshed.', 'info');
      }
    } catch (error) {
      addToast(errorMessage(error, 'Could not save this topic.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedPoolTrend = trends.find((trend) => trend.id === selectedId)
    ?? trends.find((trend) => normalizeTopic(trend.topic) === normalizeTopic(selectedText ?? ''));

  return (
    <Box className={styles.root}>
      <Box>
        <Typography variant="h3" sx={{ mb: 0.5 }}>
          Project Trend Pool
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Generate ideas once for this project, then assign an available topic to each post.
        </Typography>
      </Box>

      {loading ? (
        <GenerationLoader label="Loading project trends…" rows={2} />
      ) : loadError ? (
        <Box className={styles.emptyState} role="alert">
          <Typography variant="body2">{loadError}</Typography>
          <Button size="small" onClick={() => { void refreshPool().catch((error: unknown) => setLoadError(errorMessage(error, 'Could not load trends.'))); }}>
            Try again
          </Button>
        </Box>
      ) : trends.length === 0 ? (
        <Box className={styles.emptyState}>
          <Typography variant="body2" color="text.secondary">
            This project has no trend ideas yet. Generate a pool to get started.
          </Typography>
        </Box>
      ) : (
        <Box className={styles.trendList} component="ul">
          {trends.map((trend) => {
            const isSelected = trend.id === selectedId
              || (!selectedId && normalizeTopic(trend.topic) === normalizeTopic(selectedText ?? ''));
            const usedByOthers = trend.used_by_posts.filter((post) => post.post_id !== postId);
            const isUnavailable = usedByOthers.length > 0;
            const usedBy = trend.used_by_posts.map((post) => `Post ${post.post_number}`).join(', ');
            const generatedDate = formatDate(trend.last_generated_at);
            return (
              <li key={trend.id}>
                <button
                  type="button"
                  className={`${styles.trendCard} ${isSelected ? styles.selected : ''} ${isUnavailable ? styles.unavailable : ''}`}
                  onClick={() => { void handleSelect(trend); }}
                  disabled={saving || isUnavailable || !postId}
                  aria-pressed={isSelected}
                >
                  <span className={styles.cardHeading}>
                    <span className={styles.topic}>{trend.topic}</span>
                    {trend.score !== null && <span className={styles.score}>{trend.score}</span>}
                  </span>
                  {trend.description && <span className={styles.description}>{trend.description}</span>}
                  <span className={styles.cardFooter}>
                    <span className={isUnavailable ? styles.usedLabel : styles.availableLabel}>
                      {isUnavailable
                        ? `Used in ${usedBy}`
                        : trend.used_by_posts.length > 0
                          ? `Used in ${usedBy}${isSelected ? ' · Selected here' : ''}`
                          : 'Available'}
                    </span>
                    <span className={styles.sourceLabel}>
                      {trend.source === 'custom' ? 'Custom' : generatedDate ? `Updated ${generatedDate}` : 'Previously generated'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </Box>
      )}

      <Box className={styles.actions}>
        <Button
          variant="outlined"
          startIcon={generating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
          onClick={() => { void handleGenerate(); }}
          disabled={!projectId || generating || loading}
        >
          {generating ? 'Generating…' : trends.length > 0 ? 'Generate more' : 'Generate trends'}
        </Button>
        {selectedPoolTrend && (
          <Button
            color="inherit"
            startIcon={<ClearIcon />}
            onClick={() => { void handleClearSelection(); }}
            disabled={saving}
          >
            Clear selection
          </Button>
        )}
      </Box>

      <Box className={styles.customTopic}>
        <TextField
          size="small"
          fullWidth
          label="Add your own topic"
          placeholder="e.g. Small daily wins"
          value={customTopic}
          onChange={(event) => setCustomTopic(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleUseCustomTopic();
            }
          }}
          disabled={saving}
        />
        <Button
          variant="contained"
          onClick={() => { void handleUseCustomTopic(); }}
          disabled={!customTopic.trim() || saving || !postId}
        >
          Use topic
        </Button>
      </Box>

      {selectedText && (
        <Typography variant="caption" color="text.secondary">
          Selected for this post: <strong>{selectedText}</strong>
        </Typography>
      )}
    </Box>
  );
}
