import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import type { ViralDnaProfile } from '../../api/viralDna';

interface Props {
  profile: ViralDnaProfile;
}

interface FindingProps {
  label: string;
  value?: string;
  description?: string;
  emphasized?: boolean;
}

function formatFinding(value?: string): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (normalized.toLowerCase() === 'none') return 'None detected';
  if (normalized.toLowerCase() === 'unclear') return 'Unclear from the image';
  return normalized;
}

function Finding({ label, value, description, emphasized = false }: FindingProps) {
  const content = formatFinding(value);
  if (!content) return null;

  return (
    <Box
      sx={{
        minWidth: 0,
        p: emphasized ? 1.75 : 1.5,
        borderRadius: 2,
        backgroundColor: emphasized ? 'rgba(124,58,237,0.10)' : 'rgba(255,255,255,0.025)',
        border: emphasized ? '1px solid rgba(124,58,237,0.28)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.6, overflowWrap: 'anywhere' }}>
        {content}
      </Typography>
      {description && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}

export default function DnaProfile({ profile }: Props) {
  const {
    colors = [],
    style,
    mood,
    cta,
    hooks = [],
    composition,
    text_overlay: textOverlay,
    face_visible: faceVisible,
    lighting,
    typography,
  } = profile.dna_data;

  const hasDetailedFindings = Boolean(
    lighting || typography || typeof textOverlay === 'boolean' || typeof faceVisible === 'boolean',
  );

  const compositionLabels: Record<string, string> = {
    center: 'Centered layout',
    rule_of_thirds: 'Off-center balance (rule of thirds)',
    symmetry: 'Balanced, symmetrical layout',
    dynamic: 'Dynamic or diagonal layout',
  };
  const ctaLabels: Record<string, string> = {
    save_share: 'Encourages viewers to save or share',
    comment: 'Invites viewers to comment',
    follow: 'Encourages viewers to follow',
    shop: 'Promotes a product or purchase',
    challenge: 'Invites viewers to join a challenge',
    none: 'No clear call to action',
    unclear: 'No clear call to action could be identified',
  };
  const moodLabels: Record<string, string> = {
    energetic: 'Energetic and active',
    calm: 'Calm and relaxed',
    inspiring: 'Inspiring or uplifting',
    humorous: 'Humorous or playful',
    dramatic: 'Dramatic or intense',
    professional: 'Professional and polished',
  };
  const friendlyHooks: Record<string, string> = {
    curiosity: 'Curiosity — makes the viewer want to learn or see more',
    relatability: 'Relatability — reflects an experience viewers may recognize',
    surprise: 'Surprise — uses an unexpected contrast or reveal',
    aspiration: 'Aspiration — presents a goal or outcome viewers may want',
    humor: 'Humor — uses a playful or funny element',
    contrast: 'Contrast — makes differences stand out against each other',
  };

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Reference image findings
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, mb: 1.5 }}>
        Visual patterns identified in the image. Use these as guidance, then adjust them to fit your post.
      </Typography>

      {colors.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Dominant colors</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Approximate colors detected in the reference image.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            {colors.map((hex) => (
              <Box key={hex} sx={{ display: 'flex', alignItems: 'center', gap: 0.65 }} title={hex}>
                <Box
                  aria-label={`Dominant color ${hex}`}
                  sx={{
                    width: 24,
                    height: 24,
                    flex: '0 0 auto',
                    borderRadius: '50%',
                    background: hex,
                    boxShadow: `0 0 10px ${hex}66`,
                    border: '2px solid rgba(255,255,255,0.22)',
                  }}
                />
                <Typography variant="caption" color="text.secondary">{hex}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1 }}>
        {style && (
          <Finding
            label="Visual style"
            value={style.replace(/_/g, ' ')}
            description="The overall look and design approach."
          />
        )}
        {composition && (
          <Finding
            label="Layout"
            value={compositionLabels[composition] || composition.replace(/_/g, ' ')}
            description="How the main elements are arranged in the image."
          />
        )}
        {mood && (
          <Finding
            label="Feeling"
            value={moodLabels[mood] || mood}
            description="The emotion or tone the image communicates."
          />
        )}
        {cta && (
          <Finding
            label="Call to action"
            value={ctaLabels[cta] || cta.replace(/_/g, ' ')}
            description="What the image explicitly asks viewers to do, if anything."
          />
        )}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {typeof textOverlay === 'boolean' && (
          <Chip label={`Text in image: ${textOverlay ? 'Yes' : 'No'}`} size="small" variant="outlined" />
        )}
        {typeof faceVisible === 'boolean' && (
          <Chip label={`Person’s face visible: ${faceVisible ? 'Yes' : 'No'}`} size="small" variant="outlined" />
        )}
      </Box>

      {hooks.length > 0 && (
        <Box sx={{ mt: 1.5, mb: hasDetailedFindings ? 2 : 0 }}>
          <Typography variant="subtitle2">What may catch the viewer’s interest</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
            These are creative techniques visible in the reference, not evidence of performance.
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 0.75 }}>
            {hooks.map((hook, index) => (
              <Typography component="li" variant="body2" color="text.secondary" key={`${index}-${hook}`} sx={{ lineHeight: 1.55 }}>
                {friendlyHooks[hook.toLowerCase()] || hook}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {hasDetailedFindings && (
        <>
          {(hooks.length > 0 || style || composition || mood || cta) && <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
            <Finding label="Lighting and shadows" value={lighting} description="How light and shadow shape the look of the image." />
            <Finding label="Text appearance" value={typography} description="How the words are styled, sized, and placed." />
          </Box>
        </>
      )}
    </Box>
  );
}
