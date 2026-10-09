import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CodeIcon from '@mui/icons-material/Code';
import BrushIcon from '@mui/icons-material/Brush';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import SchoolIcon from '@mui/icons-material/School';
import BusinessIcon from '@mui/icons-material/Business';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import PsychologyIcon from '@mui/icons-material/Psychology';
import useWizardStore from '../../store/wizardStore';
import { fetchCategories } from '../../api/projects';
import type { Category } from '../../types';

const ICON_MAP: Record<string, React.ElementType> = {
  fitness_center: FitnessCenterIcon,
  restaurant: RestaurantIcon,
  code: CodeIcon,
  brush: BrushIcon,
  travel_explore: TravelExploreIcon,
  school: SchoolIcon,
  business: BusinessIcon,
  self_improvement: SelfImprovementIcon,
  psychology: PsychologyIcon,
};

export default function CategoryStep() {
  const { project, setCategory, saveProjectUpdates } = useWizardStore();
  const selectedCategory = project?.category;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    fetchCategories()
      .then((data) => {
        setCategories(data);
        setLoadingCategories(false);
      })
      .catch((err) => {
        console.error('Failed to fetch categories:', err);
        setLoadingCategories(false);
      });
  }, []);

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 0.5 }}>
        Choose a Category
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Select the content niche for your {project?.type === 'image' ? 'image post' : 'reel'}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {loadingCategories
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid key={i} size={{ xs: 6, sm: 4 }}>
                <Card sx={{ p: 2 }}>
                  <CardContent sx={{ textAlign: 'center', p: 1 }}>
                    <Skeleton variant="circular" width={36} height={36} sx={{ mx: 'auto', mb: 1 }} />
                    <Skeleton variant="text" width={80} sx={{ mx: 'auto' }} />
                  </CardContent>
                </Card>
              </Grid>
            ))
          : categories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              const Icon = ICON_MAP[cat.icon || ''] || CodeIcon;
              return (
                <Grid key={cat.id} size={{ xs: 6, sm: 4 }}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      ...(isSelected && {
                        border: '2px solid #7C3AED',
                        boxShadow: '0 0 24px rgba(124, 58, 237, 0.3)',
                      }),
                    }}
                  >
                    <CardActionArea
                      onClick={() => {
                        setCategory(cat.name);
                        saveProjectUpdates();
                      }}
                      sx={{ p: 2 }}
                    >
                      <CardContent sx={{ textAlign: 'center', p: 1 }}>
                        <Icon
                          sx={{
                            fontSize: 36,
                            color: isSelected ? 'primary.main' : 'text.secondary',
                            mb: 1,
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? 'text.primary' : 'text.secondary',
                          }}
                        >
                          {cat.name}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
      </Grid>

    </Box>
  );
}
