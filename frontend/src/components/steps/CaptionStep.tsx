import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import useWizardStore from '../../store/wizardStore';
import { listAttempts, updateStepData } from '../../api/steps';
import GenerationLoader from '../wizard/GenerationLoader';
import type { GenerationAttempt } from '../../types';

interface ContentVariant {
  overlay_text: string;
  feed_caption: string;
  hashtags: string[];
}

interface Props {
  stepId?: string;
}

export default function CaptionStep({ stepId }: Props) {
  const { setPreviewData } = useWizardStore();

  const [attempts, setAttempts] = useState<GenerationAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [editedOverlay, setEditedOverlay] = useState('');
  const [editedCaption, setEditedCaption] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!stepId) return;
    setLoading(true);
    listAttempts(stepId)
      .then((data) => {
        setAttempts(data);
        const attempt = data.find((a) => a.is_selected) || data[data.length - 1];
        const variants = (attempt?.output_data?.variants as ContentVariant[] | undefined) || [];
        const idx = (attempt?.output_data?.selected_index as number | undefined) ?? 0;
        setSelectedVariant(idx);
        setEditedOverlay(variants[idx]?.overlay_text || '');
        setEditedCaption(variants[idx]?.feed_caption || '');
        if (variants[idx]) {
          setPreviewData({
            overlay_text: variants[idx].overlay_text,
            feed_caption: variants[idx].feed_caption,
            hashtags: variants[idx].hashtags,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [stepId, setPreviewData]);

  const activeAttempt = attempts.find((a) => a.is_selected) || attempts[attempts.length - 1];
  const variants = (activeAttempt?.output_data?.variants as ContentVariant[] | undefined) || [];

  const pickVariant = async (index: number) => {
    if (!stepId) return;
    setSelectedVariant(index);
    setEditedOverlay(variants[index]?.overlay_text || '');
    setEditedCaption(variants[index]?.feed_caption || '');
    setDirty(false);
    setPreviewData({
      overlay_text: variants[index]?.overlay_text,
      feed_caption: variants[index]?.feed_caption,
      hashtags: variants[index]?.hashtags,
    });
    await updateStepData(stepId, { selected_variant: index });
  };

  const saveEdit = async () => {
    if (!stepId) return;
    setPreviewData({ overlay_text: editedOverlay, feed_caption: editedCaption });
    await updateStepData(stepId, {
      selected_variant: selectedVariant,
      edited_overlay_text: editedOverlay,
      edited_feed_caption: editedCaption,
    });
    setDirty(false);
  };

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 0.5 }}>
        Content
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pick a content variant and fine-tune the text. The overlay text goes on the image — the caption goes in the feed.
      </Typography>

      {loading ? (
        <GenerationLoader label="Loading content variants..." rows={4} />
      ) : variants.length > 0 ? (
        <>
          {/* Variant cards */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            {variants.map((v, i) => {
              const isSelected = i === selectedVariant;
              return (
                <Card
                  key={i}
                  sx={{
                    cursor: 'pointer',
                    ...(isSelected && {
                      border: '2px solid #7C3AED',
                      boxShadow: '0 0 24px rgba(124, 58, 237, 0.3)',
                    }),
                  }}
                >
                  <CardActionArea onClick={() => pickVariant(i)}>
                    <CardContent sx={{ p: 2 }}>
                      {/* Overlay text — the headline on the image */}
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 700, mb: 0.75, lineHeight: 1.3 }}
                      >
                        {v.overlay_text}
                      </Typography>
                      {/* Feed caption */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1, fontSize: '0.78rem', lineHeight: 1.5 }}
                      >
                        {v.feed_caption}
                      </Typography>
                      {/* Hashtags */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(v.hashtags || []).slice(0, 5).map((h) => (
                          <Chip
                            key={h}
                            label={h}
                            size="small"
                            sx={{
                              fontSize: '0.68rem',
                              height: 20,
                              background: 'rgba(124,58,237,0.1)',
                              border: '1px solid rgba(124,58,237,0.2)',
                              color: '#a78bfa',
                            }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>

          {/* Inline edit */}
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Fine-tune selected variant
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 1 }}>
            <TextField
              label="Overlay text (goes on image)"
              size="small"
              fullWidth
              value={editedOverlay}
              onChange={(e) => { setEditedOverlay(e.target.value); setDirty(true); }}
              slotProps={{ htmlInput: { maxLength: 80 } }}
              helperText={`${editedOverlay.length}/80 chars`}
            />
            <TextField
              label="Feed caption"
              multiline
              minRows={2}
              fullWidth
              size="small"
              value={editedCaption}
              onChange={(e) => { setEditedCaption(e.target.value); setDirty(true); }}
            />
          </Box>
          <Button
            variant="outlined"
            onClick={saveEdit}
            disabled={!dirty}
            size="small"
            sx={{ borderColor: '#7C3AED', color: '#7C3AED' }}
          >
            Save edits
          </Button>
        </>
      ) : (
        <Typography variant="caption" color="text.disabled">
          Click "Generate" below to create 3 content variants for this project.
        </Typography>
      )}
    </Box>
  );
}
