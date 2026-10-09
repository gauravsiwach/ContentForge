import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import useWizardStore from '../../store/wizardStore';
import { generateStep, retryStep } from '../../api/steps';
import { listScenes, updateScenes } from '../../api/scenes';
import type { SceneEditItem } from '../../api/scenes';
import GenerationLoader from '../wizard/GenerationLoader';

interface Props {
  stepId?: string;
}

export default function ScriptStep({ stepId }: Props) {
  const { project } = useWizardStore();
  const [scenes, setScenes] = useState<SceneEditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadScenes = () => {
    if (!project) return;
    setLoading(true);
    listScenes(project.id)
      .then((data) =>
        setScenes(
          data.map((s) => ({
            scene_number: s.scene_number,
            narration: s.narration,
            visual_desc: s.visual_desc,
            duration_sec: s.duration_sec,
          })),
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(loadScenes, [project]);

  const handleGenerate = async (isRetry: boolean) => {
    if (!stepId) return;
    setGenerating(true);
    try {
      if (isRetry) await retryStep(stepId);
      else await generateStep(stepId);
      loadScenes();
      setDirty(false);
    } finally {
      setGenerating(false);
    }
  };

  const updateField = (index: number, field: keyof SceneEditItem, value: string | number) => {
    setScenes((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
    setDirty(true);
  };

  const addScene = () => {
    const nextNumber = (scenes[scenes.length - 1]?.scene_number || 0) + 1;
    setScenes((prev) => [...prev, { scene_number: nextNumber, narration: '', visual_desc: '', duration_sec: 7 }]);
    setDirty(true);
  };

  const removeScene = (index: number) => {
    setScenes((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const saveScenes = async () => {
    if (!project) return;
    await updateScenes(project.id, scenes);
    setDirty(false);
  };

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 0.5 }}>
        Script Generation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        AI-generated scene-by-scene script for your reel — edit freely before moving on.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={generating ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
          onClick={() => handleGenerate(scenes.length > 0)}
          disabled={generating}
          sx={{ borderColor: '#7C3AED', color: '#7C3AED' }}
        >
          {scenes.length > 0 ? 'Regenerate' : 'Generate Script'}
        </Button>
      </Box>

      {loading ? (
        <GenerationLoader label="Loading script..." rows={4} />
      ) : scenes.length > 0 ? (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
            {scenes.map((scene, i) => (
              <Card key={i}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="overline" color="text.secondary">
                      Scene {scene.scene_number}
                    </Typography>
                    <IconButton size="small" onClick={() => removeScene(i)} sx={{ color: 'text.secondary', '&:hover': { color: '#EF4444' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <TextField
                    label="Narration"
                    fullWidth
                    multiline
                    size="small"
                    value={scene.narration}
                    onChange={(e) => updateField(i, 'narration', e.target.value)}
                    sx={{ mb: 1.5 }}
                  />
                  <TextField
                    label="Visual description"
                    fullWidth
                    multiline
                    size="small"
                    value={scene.visual_desc}
                    onChange={(e) => updateField(i, 'visual_desc', e.target.value)}
                    sx={{ mb: 1.5 }}
                  />
                  <TextField
                    label="Duration (sec)"
                    type="number"
                    size="small"
                    value={scene.duration_sec}
                    onChange={(e) => updateField(i, 'duration_sec', Number(e.target.value))}
                    sx={{ width: 140 }}
                  />
                </CardContent>
              </Card>
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addScene}>
              Add Scene
            </Button>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={saveScenes} disabled={!dirty}>
              Save Changes
            </Button>
          </Box>
        </>
      ) : (
        <Typography variant="caption" color="text.disabled">
          Click "Generate Script" to create a 4-scene script for this reel.
        </Typography>
      )}
    </Box>
  );
}
