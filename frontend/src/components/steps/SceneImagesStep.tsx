import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import useWizardStore from '../../store/wizardStore';
import { generateAllSceneImages, listScenes, retrySceneImage } from '../../api/scenes';
import type { Scene } from '../../api/scenes';
import SceneGrid from '../scenes/SceneGrid';
import GenerationLoader from '../wizard/GenerationLoader';
import { gradientButton } from '../../theme/glassStyles';

export default function SceneImagesStep() {
  const { project } = useWizardStore();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  const loadScenes = () => {
    if (!project) return;
    setLoading(true);
    listScenes(project.id)
      .then(setScenes)
      .finally(() => setLoading(false));
  };

  useEffect(loadScenes, [project]);

  const handleGenerateAll = async () => {
    if (!project) return;
    setGeneratingAll(true);
    try {
      const updated = await generateAllSceneImages(project.id);
      setScenes(updated);
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleRetry = async (sceneId: string, enhancement?: string) => {
    if (!project) return;
    setGeneratingIds((prev) => new Set(prev).add(sceneId));
    try {
      const updated = await retrySceneImage(project.id, sceneId, enhancement);
      setScenes((prev) => prev.map((s) => (s.id === sceneId ? updated : s)));
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });
    }
  };

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 0.5 }}>
        Scene Images
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Generate an image for each scene in your script.
      </Typography>

      {scenes.length === 0 && !loading ? (
        <Typography variant="caption" color="text.disabled">
          Go back to the Script step and generate a script first.
        </Typography>
      ) : (
        <Button
          variant="contained"
          sx={{ ...gradientButton, mb: 3 }}
          startIcon={generatingAll ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
          onClick={handleGenerateAll}
          disabled={generatingAll || scenes.length === 0}
        >
          {generatingAll ? 'Generating...' : 'Generate All'}
        </Button>
      )}

      {loading ? (
        <GenerationLoader label="Loading scenes..." rows={3} />
      ) : (
        <SceneGrid scenes={scenes} generatingIds={generatingIds} onRetry={handleRetry} />
      )}
    </Box>
  );
}
