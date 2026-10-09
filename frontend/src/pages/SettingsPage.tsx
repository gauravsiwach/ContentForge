import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Card from '@mui/material/Card';
import { listProviders } from '../api/settings';
import type { ProviderSettings } from '../api/settings';
import ProviderForm from '../components/settings/ProviderForm';

export default function SettingsPage() {
  const [providers, setProviders] = useState<ProviderSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProviders()
      .then((data) => {
        setProviders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load providers:', err);
        setLoading(false);
      });
  }, []);

  const handleSaved = (updated: ProviderSettings) => {
    setProviders((prev) =>
      prev.map((p) => (p.task_type === updated.task_type ? updated : p))
    );
  };

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 1 }}>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Choose OpenAI or Ollama for text and vision, and OpenAI or local ComfyUI for image generation.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} sx={{ p: 3 }}>
                <Skeleton variant="text" width={180} height={28} sx={{ mb: 2 }} />
                <Skeleton variant="rounded" height={44} sx={{ mb: 1.5 }} />
                <Skeleton variant="rounded" height={44} sx={{ mb: 1.5 }} />
                <Skeleton variant="rounded" height={36} width={160} />
              </Card>
            ))
          : providers.map((p) => (
              <ProviderForm key={p.task_type} provider={p} onSaved={handleSaved} />
            ))}
      </Box>
    </Box>
  );
}
