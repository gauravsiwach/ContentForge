import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import GenerationLoader from '../wizard/GenerationLoader';
import { listAttempts } from '../../api/steps';
import type { GenerationAttempt } from '../../types';

interface Props {
  title: string;
  description: string;
  stepId?: string;  // DB step id — injected from ProjectPage when available
}

export default function PlaceholderStep({ title, description, stepId }: Props) {
  const [attempts, setAttempts] = useState<GenerationAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  // Load existing attempts for this step
  useEffect(() => {
    if (!stepId) return;
    setLoading(true);
    listAttempts(stepId)
      .then((data) => {
        setAttempts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [stepId]);

  const latestAttempt = attempts[attempts.length - 1];

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>

      {loading ? (
        <GenerationLoader label="Loading..." rows={3} />
      ) : latestAttempt ? (
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Attempt {latestAttempt.attempt_number}
              {latestAttempt.enhancement && ` — "${latestAttempt.enhancement}"`}
              {latestAttempt.is_selected && ' ✓'}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {latestAttempt.output_data
                ? JSON.stringify(latestAttempt.output_data, null, 2)
                : 'No content'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="rounded" height={48} animation="wave" />
          <Skeleton variant="rounded" height={120} animation="wave" />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="rounded" height={48} width="50%" animation="wave" />
            <Skeleton variant="rounded" height={48} width="50%" animation="wave" />
          </Box>
          <Skeleton variant="rounded" height={80} animation="wave" />
        </Box>
      )}
    </Box>
  );
}
