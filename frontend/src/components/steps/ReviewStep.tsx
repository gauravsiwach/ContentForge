import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Snackbar from '@mui/material/Snackbar';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import useWizardStore from '../../store/wizardStore';
import { listAttempts } from '../../api/steps';
import { completeProject } from '../../api/projects';
import { exportProject } from '../../api/export';
import { API_BASE_URL } from '../../api/client';
import { gradientButton } from '../../theme/glassStyles';
import type { Platform, ProjectFormat } from '../../types';

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
];

const IMAGE_FORMATS: { value: ProjectFormat; label: string }[] = [
  { value: 'post_square', label: 'Square Post (1:1)' },
  { value: 'post_portrait', label: 'Portrait Post (4:5)' },
  { value: 'story', label: 'Story (9:16)' },
  { value: 'thumbnail', label: 'Thumbnail (16:9)' },
];

const REEL_FORMATS: { value: ProjectFormat; label: string }[] = [
  { value: 'reel', label: 'Reel (9:16)' },
  { value: 'short', label: 'Short (9:16)' },
];

export default function ReviewStep() {
  const { project, dbSteps, setPlatform, setFormat, saveProjectUpdates, setProject, completeStep, steps } = useWizardStore();
  const [captionText, setCaptionText] = useState<string | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const captionStepId = dbSteps.find((s) => s.step_name === 'caption')?.id;
  const visualsStepId = dbSteps.find((s) => s.step_name === 'visuals')?.id;

  useEffect(() => {
    if (!captionStepId) return;
    listAttempts(captionStepId).then((attempts) => {
      const attempt = attempts.find((a) => a.is_selected) || attempts[attempts.length - 1];
      const variants = (attempt?.output_data?.variants as { overlay_text: string; feed_caption: string; hashtags: string[] }[] | undefined) || [];
      const idx = (attempt?.output_data?.selected_index as number | undefined) ?? 0;
      const variant = variants[idx] ?? variants[0];
      // Show overlay_text as the headline + feed_caption as the body
      const fullCaption = variant
        ? `${variant.overlay_text}\n\n${variant.feed_caption}`
        : null;
      setCaptionText(fullCaption);
      setHashtags(variant?.hashtags || []);
    });
  }, [captionStepId]);

  useEffect(() => {
    if (!visualsStepId) return;
    listAttempts(visualsStepId).then((attempts) => {
      const attempt = attempts.find((a) => a.is_selected) || attempts[attempts.length - 1];
      const images = (attempt?.output_data?.images as { asset_url?: string; url: string }[] | undefined) || [];
      const image = images[0];
      setImageSrc(image ? (image.asset_url ? `${API_BASE_URL}${image.asset_url}` : image.url) : null);
    });
  }, [visualsStepId]);

  const handleExport = async () => {
    if (!project) return;
    setExporting(true);
    try {
      const result = await exportProject(project.id);
      if (result.image_url) {
        const a = document.createElement('a');
        a.href = `${API_BASE_URL}${result.image_url}`;
        a.download = 'contentforge-export.png';
        a.click();
      }
      setSnackbar('Exported! Image downloaded.');
    } catch {
      setSnackbar('Select a caption and an image before exporting.');
    } finally {
      setExporting(false);
    }
  };

  const handleFinish = async () => {
    if (!project || project.status === 'completed') return;
    setFinishing(true);
    try {
      const completedProject = await completeProject(project.id);
      setProject(completedProject);
      const reviewIndex = steps.findIndex((step) => step.name === 'review');
      if (reviewIndex >= 0) completeStep(reviewIndex);
      setSnackbar('Project accepted and marked as complete.');
    } catch {
      setSnackbar('Could not finish the project. Complete the earlier steps first.');
    } finally {
      setFinishing(false);
    }
  };

  const handleCopyCaption = async () => {
    const full = [captionText, hashtags.join(' ')].filter(Boolean).join('\n\n');
    await navigator.clipboard.writeText(full);
    setSnackbar('Caption copied to clipboard.');
  };

  const formatOptions = project?.type === 'image' ? IMAGE_FORMATS : REEL_FORMATS;

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 0.5 }}>
        Review & Export
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Confirm the target platform and format, then export your final content.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Platform</InputLabel>
          <Select
            label="Platform"
            value={project?.platform || ''}
            onChange={(e) => {
              setPlatform(e.target.value as Platform);
              saveProjectUpdates();
            }}
          >
            {PLATFORMS.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                {p.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Format</InputLabel>
          <Select
            label="Format"
            value={project?.format || ''}
            onChange={(e) => {
              setFormat(e.target.value as ProjectFormat);
              saveProjectUpdates();
            }}
          >
            {formatOptions.map((f) => (
              <MenuItem key={f.value} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {imageSrc && (
        <Box
          component="img"
          src={imageSrc}
          alt="Selected visual"
          sx={{ width: '100%', maxWidth: 360, borderRadius: '12px', mb: 2, display: 'block' }}
        />
      )}

      {captionText && (
        <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
          {captionText}
        </Typography>
      )}

      {hashtags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 3 }}>
          {hashtags.map((h) => (
            <Chip key={h} label={h} size="small" variant="outlined" />
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button
          variant="contained"
          sx={gradientButton}
          startIcon={<CheckCircleIcon />}
          onClick={handleFinish}
          disabled={finishing || project?.status === 'completed'}
        >
          {finishing ? 'Finishing...' : project?.status === 'completed' ? 'Finished' : 'Accept & Finish'}
        </Button>
        {imageSrc && captionText && (
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Download'}
          </Button>
        )}
        <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopyCaption} disabled={!captionText}>
          Copy Caption
        </Button>
      </Box>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Box>
  );
}
