import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

interface Props {
  label?: string;
  rows?: number;
}

export default function GenerationLoader({ label = 'Generating...', rows = 3 }: Props) {
  return (
    <Box
      sx={{
        borderRadius: '12px',
        border: '1px solid rgba(124, 58, 237, 0.3)',
        background: 'rgba(124, 58, 237, 0.04)',
        p: 2.5,
        animation: 'neonPulse 2s ease-in-out infinite',
        '@keyframes neonPulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(124, 58, 237, 0.15)' },
          '50%': { boxShadow: '0 0 24px rgba(124, 58, 237, 0.35)' },
        },
      }}
    >
      <Typography variant="caption" color="primary.main" sx={{ mb: 1.5, display: 'block' }}>
        {label}
      </Typography>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          animation="wave"
          height={22}
          sx={{
            mb: 0.5,
            borderRadius: '6px',
            backgroundColor: 'rgba(124, 58, 237, 0.08)',
            '&::after': {
              background:
                'linear-gradient(90deg, transparent, rgba(124,58,237,0.15), transparent)',
            },
            width: i === rows - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </Box>
  );
}
