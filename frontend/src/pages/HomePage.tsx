import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { useNavigate } from 'react-router-dom';
import useWizardStore from '../store/wizardStore';
import { listProjects, deleteProject } from '../api/projects';
import { gradientText } from '../theme/glassStyles';

interface ProjectListItem {
  id: string;
  type: 'image' | 'reel';
  category: string | null;
  platform: string | null;
  format: string | null;
  current_step: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { initWizardFromApi } = useWizardStore();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleNewProject = async (type: 'image' | 'reel') => {
    setIsCreating(true);
    const projectId = await initWizardFromApi(type);
    setIsCreating(false);
    if (projectId) {
      navigate(`/projects/${projectId}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'draft': return 'primary';
      case 'in_progress': return 'warning';
      default: return 'default';
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Box>
      <Box sx={{ mb: 5, mt: 2 }}>
        <Typography variant="h1" sx={{ mb: 1 }}>
          Welcome to{' '}
          <Box component="span" sx={gradientText}>
            ContentForge
          </Box>
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create viral social media content with AI-powered workflows
        </Typography>
      </Box>

      {/* New Project Cards */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card
            sx={{
              cursor: 'pointer',
              '&:hover': {
                borderColor: '#7C3AED',
                boxShadow: '0 0 24px rgba(124, 58, 237, 0.25)',
              },
            }}
          >
            <CardActionArea onClick={() => handleNewProject('image')} disabled={isCreating} sx={{ p: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                {isCreating ? (
                  <CircularProgress size={48} sx={{ mb: 2 }} />
                ) : (
                  <ImageOutlinedIcon
                    sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
                  />
                )}
                <Typography variant="h3" sx={{ mb: 1 }}>
                  New Image Post
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create a viral image with AI-generated captions and visuals
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1.5 }}
                >
                  6 steps: Category, DNA, Trends, Caption, Image, Review
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Card
            sx={{
              cursor: 'pointer',
              '&:hover': {
                borderColor: '#06B6D4',
                boxShadow: '0 0 24px rgba(6, 182, 212, 0.25)',
              },
            }}
          >
            <CardActionArea onClick={() => handleNewProject('reel')} disabled={isCreating} sx={{ p: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                {isCreating ? (
                  <CircularProgress size={48} sx={{ mb: 2 }} />
                ) : (
                  <MovieOutlinedIcon
                    sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }}
                  />
                )}
                <Typography variant="h3" sx={{ mb: 1 }}>
                  New Reel / Short
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create a viral reel with script, scenes, audio, and video assembly
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1.5 }}
                >
                  8 steps: Category, DNA, Trends, Script, Scenes, Audio, Assembly, Review
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Projects */}
      <Box>
        <Typography variant="h2" sx={{ mb: 3 }}>
          Recent Projects
        </Typography>

        {projects.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No projects yet. Create your first one above!
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {projects.map((p) => (
              <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.25)',
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => navigate(`/projects/${p.id}`)}
                    sx={{ p: 2.5 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {p.type === 'image' ? (
                          <ImageOutlinedIcon sx={{ color: 'primary.main' }} />
                        ) : (
                          <MovieOutlinedIcon sx={{ color: 'secondary.main' }} />
                        )}
                        <Typography variant="h4">
                          {p.category || 'Untitled'} — {p.type === 'image' ? 'Image' : 'Reel'}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p.id);
                        }}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': { color: 'error.main' },
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={p.status}
                        size="small"
                        color={statusColor(p.status) as 'success' | 'primary' | 'warning' | 'default'}
                        variant="outlined"
                        sx={{ textTransform: 'capitalize' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Step: {p.current_step}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                        {timeAgo(p.created_at)}
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
