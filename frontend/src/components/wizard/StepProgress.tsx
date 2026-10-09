import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepConnector, { stepConnectorClasses } from '@mui/material/StepConnector';
import type { StepIconProps } from '@mui/material/StepIcon';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import useWizardStore from '../../store/wizardStore';

const GradientConnector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 18,
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 1,
    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  [`&.${stepConnectorClasses.active} .${stepConnectorClasses.line}`]: {
    background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
  },
  [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line}`]: {
    background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
  },
}));

function GlassStepIcon(props: StepIconProps) {
  const { active, completed } = props;
  const { steps } = useWizardStore();
  const stepIndex = Number(props.icon) - 1;
  const step = steps[stepIndex];
  const needsRefresh = step?.status === 'needs_refresh';

  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        ...(completed && !needsRefresh && {
          background: 'rgba(16, 185, 129, 0.15)',
          border: '2px solid #10B981',
          boxShadow: '0 0 16px rgba(16, 185, 129, 0.3)',
        }),
        ...(active && {
          background: 'rgba(124, 58, 237, 0.15)',
          border: '2px solid #7C3AED',
          boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)',
        }),
        ...(!active && !completed && !needsRefresh && {
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }),
        ...(needsRefresh && {
          background: 'rgba(245, 158, 11, 0.15)',
          border: '2px solid #F59E0B',
          boxShadow: '0 0 16px rgba(245, 158, 11, 0.3)',
        }),
      }}
    >
      {needsRefresh ? (
        <WarningAmberIcon sx={{ fontSize: 18, color: '#F59E0B' }} />
      ) : completed ? (
        <CheckIcon sx={{ fontSize: 18, color: '#10B981' }} />
      ) : (
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: active ? '#7C3AED' : 'rgba(255, 255, 255, 0.3)',
          }}
        />
      )}
    </Box>
  );
}

export default function StepProgress() {
  const { steps, currentStepIndex, navigateToStep } = useWizardStore();

  return (
    <Stepper
      activeStep={currentStepIndex}
      alternativeLabel
      nonLinear
      connector={<GradientConnector />}
      sx={{ py: 2 }}
    >
      {steps.map((step, index) => (
        <Step
          key={step.name}
          completed={step.status === 'completed'}
          sx={{ cursor: 'pointer' }}
          onClick={() => navigateToStep(index)}
        >
          <StepLabel
            StepIconComponent={GlassStepIcon}
            sx={{
              '& .MuiStepLabel-label': {
                mt: 1,
                fontSize: '0.75rem',
                fontWeight: index === currentStepIndex ? 600 : 400,
                color: index === currentStepIndex ? 'text.primary' : 'text.secondary',
              },
            }}
          >
            {step.label}
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}
