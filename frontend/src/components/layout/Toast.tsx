import { Box, Typography, Slide } from '@mui/material';
import { glassCard } from '../../theme/glassStyles';
import { useToastStore } from '../../store/toastStore';

const typeColors = {
  success: '#10B981',
  error: '#EF4444',
  info: '#3B82F6',
};

export const Toast = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        alignItems: 'flex-end',
      }}
    >
      {toasts.map((toast) => (
        <Slide key={toast.id} direction="right" in={true}>
          <Box
            sx={{
              ...glassCard,
              px: 2,
              py: 1.5,
              minWidth: '280px',
              maxWidth: '400px',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderLeft: `4px solid ${typeColors[toast.type]}`,
              animation: 'fadeIn 0.3s ease-out',
              '@keyframes fadeIn': {
                from: { opacity: 0, transform: 'translateX(20px)' },
                to: { opacity: 1, transform: 'translateX(0)' },
              },
            }}
            onClick={() => removeToast(toast.id)}
          >
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
              {toast.message}
            </Typography>
          </Box>
        </Slide>
      ))}
    </Box>
  );
};
