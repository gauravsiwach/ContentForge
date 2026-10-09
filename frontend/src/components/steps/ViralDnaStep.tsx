import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LinkIcon from '@mui/icons-material/Link';
import EditIcon from '@mui/icons-material/Edit';
import useWizardStore from '../../store/wizardStore';
import { autoDiscoverDna, getDna, manualAnalyzeDna, updateDna } from '../../api/viralDna';
import type { ViralDnaProfile } from '../../api/viralDna';
import DnaProfile from '../viral-dna/DnaProfile';
import DnaEditor from '../viral-dna/DnaEditor';
import GenerationLoader from '../wizard/GenerationLoader';

export default function ViralDnaStep() {
  const { project, steps, completeStep } = useWizardStore();
  const [profile, setProfile] = useState<ViralDnaProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [url, setUrl] = useState('');
  const [editing, setEditing] = useState(false);

  const markStepComplete = () => {
    const index = steps.findIndex((step) => step.name === 'viral_dna');
    if (index >= 0) completeStep(index);
  };

  useEffect(() => {
    if (!project) return;
    getDna(project.id).then(setProfile);
  }, [project]);

  const handleAuto = async () => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      const result = await autoDiscoverDna(project.id, project.category || undefined);
      setProfile(result);
      markStepComplete();
    } catch {
      setError('Auto-discover failed. Try again or paste a URL instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleManual = async () => {
    if (!project || !url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await manualAnalyzeDna(project.id, url.trim());
      setProfile(result);
      markStepComplete();
      setShowUrlInput(false);
      setUrl('');
    } catch {
      setError('Could not analyze that URL. Check it points to an accessible image.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdits = async (updates: Record<string, unknown>) => {
    if (!project) return;
    setLoading(true);
    try {
      const result = await updateDna(project.id, updates);
      setProfile(result);
      markStepComplete();
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 0.5 }}>
        Viral DNA Analysis
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Discover the visual and tonal DNA of viral content in your niche — this shapes every step downstream.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
          onClick={handleAuto}
          disabled={loading}
          sx={{
            borderColor: '#7C3AED',
            color: '#7C3AED',
            '&:hover': { borderColor: '#7C3AED', boxShadow: '0 0 12px rgba(124,58,237,0.25)' },
          }}
        >
          Auto-discover
        </Button>
        <Button
          variant="outlined"
          startIcon={<LinkIcon />}
          onClick={() => setShowUrlInput((v) => !v)}
          disabled={loading}
        >
          Paste URL
        </Button>
      </Box>

      {showUrlInput && (
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="https://example.com/viral-post.jpg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button variant="contained" onClick={handleManual} disabled={loading || !url.trim()}>
            Analyze
          </Button>
        </Box>
      )}

      {error && (
        <Typography variant="body2" sx={{ color: '#EF4444', mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading && !profile && <GenerationLoader label="Analyzing viral content..." rows={4} />}

      {profile && !editing && (
        <Box sx={{ position: 'relative' }}>
          <DnaProfile profile={profile} />
          <IconButton
            size="small"
            onClick={() => setEditing(true)}
            sx={{ position: 'absolute', top: 8, right: 8, color: 'text.secondary' }}
            title="Edit DNA"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {profile && editing && (
        <Box
          sx={{
            p: 2.5,
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <DnaEditor
            profile={profile}
            saving={loading}
            onSave={handleSaveEdits}
            onCancel={() => setEditing(false)}
          />
        </Box>
      )}

      {!profile && !loading && (
        <Typography variant="caption" color="text.disabled">
          This step is optional — you can skip it and continue without a DNA profile.
        </Typography>
      )}
    </Box>
  );
}
