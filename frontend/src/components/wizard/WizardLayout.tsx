import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import StepProgress from './StepProgress';
import StepNavigator from './StepNavigator';

interface WizardLayoutProps {
  headerPanel?: ReactNode;
  stepPanel: ReactNode;
  previewPanel: ReactNode;
}

export default function WizardLayout({ headerPanel, stepPanel, previewPanel }: WizardLayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {headerPanel}
      <StepProgress />

      <Box
        sx={{
          display: 'flex',
          gap: 3,
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        {/* Step Panel — 60% */}
        <Paper
          sx={{
            flex: '0 0 60%',
            p: 3,
            borderRadius: '16px',
            minHeight: 400,
          }}
        >
          {stepPanel}
        </Paper>

        {/* Preview Panel — 40% */}
        <Paper
          sx={{
            flex: 1,
            p: 3,
            borderRadius: '16px',
            minHeight: 400,
          }}
        >
          {previewPanel}
        </Paper>
      </Box>

      <StepNavigator />
    </Box>
  );
}
