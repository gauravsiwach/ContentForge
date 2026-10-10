import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import useWizardStore from '../../store/wizardStore';
import { listAttempts, updateStepData } from '../../api/steps';
import { API_BASE_URL } from '../../api/client';
import GenerationLoader from '../wizard/GenerationLoader';
import type { GenerationAttempt } from '../../types';

interface ImageVariant {
  url: string;
  asset_url?: string;
}

interface Props {
  stepId?: string;
}

const STYLE_PRESETS = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'bold', label: 'Bold' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'flat', label: 'Flat illustration' },
];

export default function ImageStep({ stepId }: Props) {
  const { setPreviewData, imageGenerationProgress } = useWizardStore();

  const [attempts, setAttempts] = useState<GenerationAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [stylePreset, setStylePreset] = useState('minimal');
  const activeGenerationProgress = imageGenerationProgress?.stepId === stepId
    ? imageGenerationProgress
    : null;
  const completedAttemptId = activeGenerationProgress?.attemptId;

  useEffect(() => {
    if (!stepId) return;
    let cancelled = false;
    setLoading(true);
    listAttempts(stepId)
      .then((data) => {
        if (cancelled) return;
        setAttempts(data);
        const attempt = data.find((a) => a.is_selected) || data[data.length - 1];
        const imgs = (attempt?.output_data?.images as ImageVariant[] | undefined) || [];
        if (imgs[0]) {
          const src = imgs[0].asset_url ? `${API_BASE_URL}${imgs[0].asset_url}` : imgs[0].url;
          setPreviewData({ image_url: src });
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [stepId, setPreviewData, completedAttemptId]);

  const activeAttempt = attempts.find((a) => a.is_selected) || attempts[attempts.length - 1];
  const images = (activeAttempt?.output_data?.images as ImageVariant[] | undefined) || [];

  const pickImage = async (index: number) => {
    if (!stepId) return;
    setSelectedIndex(index);
    const src = images[index]?.asset_url
      ? `${API_BASE_URL}${images[index].asset_url}`
      : images[index]?.url;
    if (src) setPreviewData({ image_url: src });
    await updateStepData(stepId, { selected_index: index });
  };

  const handleStyleChange = async (value: string) => {
    setStylePreset(value);
    if (stepId) await updateStepData(stepId, { style_preset: value });
  };

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 0.5 }}>
        Image Generation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Generate AI visuals that match your viral DNA and caption.
      </Typography>

      <FormControl size="small" sx={{ mb: 3, minWidth: 200 }}>
        <InputLabel>Style preset</InputLabel>
        <Select
          label="Style preset"
          value={stylePreset}
          onChange={(e) => handleStyleChange(e.target.value)}
        >
          {STYLE_PRESETS.map((s) => (
            <MenuItem key={s.value} value={s.value}>
              {s.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {activeGenerationProgress &&
        ['queued', 'running'].includes(activeGenerationProgress.status) && (
          <Box role="status" aria-live="polite" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.75 }}>
              {activeGenerationProgress.message}
              {activeGenerationProgress.progress !== null && ` ${activeGenerationProgress.progress}%`}
            </Typography>
            <LinearProgress
              variant={activeGenerationProgress.progress === null ? 'indeterminate' : 'determinate'}
              value={activeGenerationProgress.progress ?? undefined}
              aria-label="Image generation progress"
            />
          </Box>
        )}

      {activeGenerationProgress?.status === 'failed' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {activeGenerationProgress.error || activeGenerationProgress.message}
          </Alert>
        )}

      {activeGenerationProgress?.status === 'completed' && images.length > 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {images.length} image options generated and saved. Choose one to continue.
        </Alert>
      )}

      {loading ? (
        <GenerationLoader label="Loading images..." rows={3} />
      ) : images.length > 0 ? (
        <Grid container spacing={2}>
          {images.map((img, i) => {
            const isSelected = i === selectedIndex;
            const src = img.asset_url ? `${API_BASE_URL}${img.asset_url}` : img.url;
            return (
              <Grid key={i} size={{ xs: 6 }}>
                <Card
                  sx={{
                    ...(isSelected && {
                      border: '2px solid #7C3AED',
                      boxShadow: '0 0 24px rgba(124, 58, 237, 0.3)',
                    }),
                  }}
                >
                  <CardActionArea onClick={() => pickImage(i)}>
                    <Box
                      component="img"
                      src={src}
                      alt={`Generated option ${i + 1}`}
                      sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
                    />
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Typography variant="caption" color="text.disabled">
          Choose a style preset, then click "Generate" below to create image options.
        </Typography>
      )}
    </Box>
  );
}
