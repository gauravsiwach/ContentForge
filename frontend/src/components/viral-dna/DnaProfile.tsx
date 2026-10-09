import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import type { ViralDnaProfile } from '../../api/viralDna';

interface Props {
  profile: ViralDnaProfile;
}

export default function DnaProfile({ profile }: Props) {
  const { colors = [], style, mood, cta, hooks = [], composition } = profile.dna_data;

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Viral DNA Profile
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, mb: 2 }}>
        {colors.map((hex) => (
          <Box
            key={hex}
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: hex,
              boxShadow: `0 0 12px ${hex}66`,
              border: '2px solid rgba(255,255,255,0.2)',
            }}
            title={hex}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        {style && <Chip label={style.replace(/_/g, ' ')} size="small" />}
        {composition && <Chip label={composition.replace(/_/g, ' ')} size="small" variant="outlined" />}
        {mood && (
          <Chip
            label={mood}
            size="small"
            sx={{ borderColor: '#06B6D4', color: '#06B6D4' }}
            variant="outlined"
          />
        )}
      </Box>

      {cta && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          CTA style: <b style={{ color: '#F1F5F9' }}>{cta.replace(/_/g, ' ')}</b>
        </Typography>
      )}

      {hooks.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
          {hooks.map((h) => (
            <Chip key={h} label={h} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
          ))}
        </Box>
      )}
    </Box>
  );
}
