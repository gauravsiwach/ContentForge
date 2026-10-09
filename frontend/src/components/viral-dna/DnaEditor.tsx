import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import type { ViralDnaProfile } from '../../api/viralDna';

interface Props {
  profile: ViralDnaProfile;
  onSave: (updates: Record<string, unknown>) => void;
  onCancel: () => void;
  saving?: boolean;
}

export default function DnaEditor({ profile, onSave, onCancel, saving }: Props) {
  const [mood, setMood] = useState(profile.dna_data.mood || '');
  const [style, setStyle] = useState(profile.dna_data.style || '');
  const [cta, setCta] = useState(profile.dna_data.cta || '');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
      <TextField
        label="Mood"
        size="small"
        value={mood}
        onChange={(e) => setMood(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root.Mui-focused fieldset': {
            borderColor: '#7C3AED',
            boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.15)',
          },
        }}
      />
      <TextField
        label="Visual style"
        size="small"
        value={style}
        onChange={(e) => setStyle(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root.Mui-focused fieldset': {
            borderColor: '#7C3AED',
            boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.15)',
          },
        }}
      />
      <TextField
        label="CTA style"
        size="small"
        value={cta}
        onChange={(e) => setCta(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root.Mui-focused fieldset': {
            borderColor: '#7C3AED',
            boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.15)',
          },
        }}
      />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          disabled={saving}
          onClick={() => onSave({ mood, style, cta })}
        >
          Save
        </Button>
        <Button variant="text" size="small" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
