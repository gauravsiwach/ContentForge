import Grid from '@mui/material/Grid';
import SceneCard from './SceneCard';
import type { Scene } from '../../api/scenes';

interface Props {
  scenes: Scene[];
  generatingIds: Set<string>;
  onRetry: (sceneId: string, enhancement?: string) => void;
}

export default function SceneGrid({ scenes, generatingIds, onRetry }: Props) {
  return (
    <Grid container spacing={2}>
      {scenes.map((scene) => (
        <Grid key={scene.id} size={{ xs: 12, sm: 6 }}>
          <SceneCard
            scene={scene}
            generating={generatingIds.has(scene.id)}
            onRetry={(enhancement) => onRetry(scene.id, enhancement)}
          />
        </Grid>
      ))}
    </Grid>
  );
}
