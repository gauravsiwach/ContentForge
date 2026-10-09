import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import AppHeader from './AppHeader';
import { Toast } from './Toast';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppHeader />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: '80px',
          px: { xs: 2, sm: 3, md: 4 },
          pb: 4,
          maxWidth: '1400px',
          width: '100%',
          mx: 'auto',
        }}
      >
        {children}
      </Box>
      <Toast />
    </Box>
  );
}
