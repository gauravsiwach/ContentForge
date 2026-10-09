import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

interface Props {
  onEnhance: (text: string) => void;
  disabled?: boolean;
}

export default function EnhanceInput({ onEnhance, disabled }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!value.trim()) return;
    onEnhance(value.trim());
    setValue('');
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='e.g. "make it shorter", "add more emoji", "more energetic tone"'
        size="small"
        fullWidth
        disabled={disabled}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        sx={{
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused fieldset': {
              borderColor: '#7C3AED',
              boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.15)',
            },
          },
        }}
      />
      <Button
        variant="outlined"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        startIcon={<AutoFixHighIcon />}
        size="small"
        sx={{
          whiteSpace: 'nowrap',
          borderColor: '#7C3AED',
          color: '#7C3AED',
          '&:hover': {
            borderColor: '#7C3AED',
            background: 'rgba(124, 58, 237, 0.08)',
            boxShadow: '0 0 12px rgba(124, 58, 237, 0.2)',
          },
          '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.1)', color: 'text.disabled' },
        }}
      >
        Enhance & Retry
      </Button>
    </Box>
  );
}
