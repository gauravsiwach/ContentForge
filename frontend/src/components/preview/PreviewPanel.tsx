import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import useWizardStore from '../../store/wizardStore';

const EARLY_STEPS = ['category', 'viral_dna', 'trends'];
const CONTENT_STEP = 'caption';
const IMAGE_STEPS = ['visuals', 'review'];

export default function PreviewPanel() {
  const { steps, currentStepIndex, project, previewData } = useWizardStore();
  const currentStep = steps[currentStepIndex];

  const isEarlyStep = EARLY_STEPS.includes(currentStep?.name);
  const isContentStep = currentStep?.name === CONTENT_STEP;
  const isImageStep = IMAGE_STEPS.includes(currentStep?.name);

  const overlayText = previewData?.overlay_text;
  const feedCaption = previewData?.feed_caption;
  const hashtags = previewData?.hashtags ?? [];
  const imageUrl = previewData?.image_url;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Preview
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
        {project?.type === 'image' ? 'Image Post' : 'Reel'}
      </Typography>

      {/* ── Early steps (1-3): quiet placeholder ─────────────────────── */}
      {isEarlyStep && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            minHeight: 280,
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)',
            px: 3,
          }}
        >
          <ImageOutlinedIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.12)' }} />
          <Typography variant="caption" color="text.disabled" align="center">
            Your content preview will appear here once you reach the Content step
          </Typography>
        </Box>
      )}

      {/* ── Content step (4): show overlay text as headline ──────────── */}
      {isContentStep && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Simulated image card with overlay text */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              paddingTop: '100%', // 1:1 square
              borderRadius: '12px',
              background: overlayText
                ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
                : 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
              }}
            >
              {overlayText ? (
                <Typography
                  align="center"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '1rem', sm: '1.15rem' },
                    lineHeight: 1.3,
                    color: '#fff',
                    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {overlayText}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.disabled" align="center">
                  Approve a content variant to preview it here
                </Typography>
              )}
            </Box>
          </Box>

          {/* Feed caption preview */}
          {feedCaption && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.6, fontSize: '0.78rem' }}
            >
              {feedCaption}
            </Typography>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {hashtags.slice(0, 6).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    fontSize: '0.68rem',
                    height: 22,
                    background: 'rgba(124,58,237,0.12)',
                    border: '1px solid rgba(124,58,237,0.25)',
                    color: '#a78bfa',
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* ── Image / Review step (5-6): show final composited image ───── */}
      {isImageStep && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              width: '100%',
              paddingTop: '100%',
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <Box sx={{ position: 'absolute', inset: 0 }}>
              {imageUrl ? (
                <Box
                  component="img"
                  src={imageUrl}
                  alt="Generated"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="caption" color="text.disabled" align="center" sx={{ px: 2 }}>
                    Generate an image to see the preview
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Overlay text reminder below image */}
          {overlayText && (
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}
            >
              "{overlayText}"
            </Typography>
          )}

          {feedCaption && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', lineHeight: 1.6 }}>
              {feedCaption}
            </Typography>
          )}

          {hashtags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {hashtags.slice(0, 6).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    fontSize: '0.68rem',
                    height: 22,
                    background: 'rgba(124,58,237,0.12)',
                    border: '1px solid rgba(124,58,237,0.25)',
                    color: '#a78bfa',
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
