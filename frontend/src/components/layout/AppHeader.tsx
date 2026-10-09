import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useNavigate, useLocation } from 'react-router-dom';
import { gradientText } from '../../theme/glassStyles';

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <AppBar position="fixed" elevation={0}>
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        <Typography
          variant="h3"
          component="div"
          onClick={() => navigate('/')}
          sx={{
            ...gradientText,
            cursor: 'pointer',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          ContentForge
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isHome && (
            <Button
              variant="text"
              color="inherit"
              onClick={() => navigate('/')}
              sx={{ color: 'text.secondary' }}
            >
              Projects
            </Button>
          )}
          <Button
            variant="text"
            color="inherit"
            startIcon={<SettingsOutlinedIcon />}
            onClick={() => navigate('/settings')}
            sx={{ color: 'text.secondary' }}
          >
            Settings
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
