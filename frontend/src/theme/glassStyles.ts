import type { SxProps, Theme } from '@mui/material/styles';

export const glassCard: SxProps<Theme> = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
};

export const glassCardHover: SxProps<Theme> = {
  ...glassCard,
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.20)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },
};

export const glassCardSelected: SxProps<Theme> = {
  ...glassCard,
  border: '2px solid #7C3AED',
  boxShadow: '0 0 24px rgba(124, 58, 237, 0.3), 0 8px 32px rgba(0, 0, 0, 0.4)',
};

export const glassButton: SxProps<Theme> = {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '8px',
  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
};

export const gradientButton: SxProps<Theme> = {
  background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
  border: 'none',
  color: '#fff',
  fontWeight: 600,
  boxShadow: '0 4px 20px rgba(124, 58, 237, 0.35)',
  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    boxShadow: '0 4px 28px rgba(124, 58, 237, 0.5)',
    background: 'linear-gradient(135deg, #8B5CF6, #22D3EE)',
  },
};

export const gradientText: SxProps<Theme> = {
  background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export const neonGlow = (color: string, intensity = 0.4) => ({
  boxShadow: `0 0 20px rgba(${color}, ${intensity})`,
});

export const glassActionBar: SxProps<Theme> = {
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '0 0 12px 12px',
  px: 3,
  py: 1.5,
};
