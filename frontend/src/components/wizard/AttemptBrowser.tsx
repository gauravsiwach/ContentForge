import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import type { GenerationAttempt } from '../../types';

interface Props {
  attempts: GenerationAttempt[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (attempt: GenerationAttempt) => void;
}

export default function AttemptBrowser({ attempts, currentIndex, onPrev, onNext, onSelect }: Props) {
  if (attempts.length === 0) return null;

  const current = attempts[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === attempts.length - 1;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        px: 1.5,
        py: 0.75,
      }}
    >
      <IconButton
        size="small"
        onClick={onPrev}
        disabled={isFirst}
        sx={{
          color: isFirst ? 'text.disabled' : 'text.secondary',
          '&:hover': { color: 'primary.main' },
        }}
      >
        <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
      </IconButton>

      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'center' }}>
        {currentIndex + 1} / {attempts.length}
      </Typography>

      <IconButton
        size="small"
        onClick={onNext}
        disabled={isLast}
        sx={{
          color: isLast ? 'text.disabled' : 'text.secondary',
          '&:hover': { color: 'primary.main' },
        }}
      >
        <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
      </IconButton>

      {current && !current.is_selected && (
        <Button
          size="small"
          variant="outlined"
          onClick={() => onSelect(current)}
          sx={{
            ml: 0.5,
            fontSize: '0.7rem',
            py: 0.25,
            borderColor: '#10B981',
            color: '#10B981',
            '&:hover': { borderColor: '#10B981', background: 'rgba(16,185,129,0.08)' },
          }}
        >
          Use This
        </Button>
      )}

      {current?.is_selected && (
        <Typography variant="caption" sx={{ ml: 0.5, color: '#10B981' }}>
          ✓ Selected
        </Typography>
      )}

      {current?.enhancement && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ ml: 0.5, fontStyle: 'italic', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          "{current.enhancement}"
        </Typography>
      )}
    </Box>
  );
}
