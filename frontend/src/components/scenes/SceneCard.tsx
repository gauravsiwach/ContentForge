import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import Skeleton from '@mui/material/Skeleton';
import { API_BASE_URL } from '../../api/client';
import type { Scene } from '../../api/scenes';

interface Props {
  scene: Scene;
  generating: boolean;
  onRetry: (enhancement?: string) => void;
}

export default function SceneCard({ scene, generating, onRetry }: Props) {
  const [showEnhance, setShowEnhance] = useState(false);
  const [enhancement, setEnhancement] = useState('');

  const src = scene.image_url ? `${API_BASE_URL}${scene.image_url}` : null;

  const submitEnhance = () => {
    onRetry(enhancement.trim() || undefined);
    setEnhancement('');
    setShowEnhance(false);
  };

  return (
    <Card>
      <CardContent sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Scene {scene.scene_number} · {scene.duration_sec}s
        </Typography>

        {generating ? (
          <Skeleton variant="rounded" height={180} animation="wave" />
        ) : src ? (
          <Box
            component="img"
            src={src}
            alt={`Scene ${scene.scene_number}`}
            sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '8px', display: 'block' }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: '8px',
              border: '1px dashed rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" color="text.disabled">
              No image yet
            </Typography>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 1 }}>
          {scene.visual_desc}
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Retry">
            <span>
              <IconButton size="small" onClick={() => onRetry()} disabled={generating}>
                {generating ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Enhance & Retry">
            <span>
              <IconButton size="small" onClick={() => setShowEnhance((v) => !v)} disabled={generating}>
                <AutoFixHighIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Collapse in={showEnhance}>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="e.g. more dramatic lighting"
              value={enhancement}
              onChange={(e) => setEnhancement(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitEnhance()}
            />
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
