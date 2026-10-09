import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { updateProvider, testProvider } from '../../api/settings';
import type { ProviderSettings, ProviderUpdate } from '../../api/settings';
import { gradientButton } from '../../theme/glassStyles';
import { useToastStore } from '../../store/toastStore';

const TASK_LABELS: Record<string, string> = {
  text: 'Text Generation',
  image: 'Image Generation',
  vision: 'Vision / Analysis',
};

const OPENAI_TEXT_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
const OPENAI_IMAGE_MODELS = ['dall-e-3', 'dall-e-2'];
const OPENAI_VISION_MODELS = ['gpt-4o', 'gpt-4o-mini'];

function getModelOptions(taskType: string) {
  if (taskType === 'image') return OPENAI_IMAGE_MODELS;
  if (taskType === 'vision') return OPENAI_VISION_MODELS;
  return OPENAI_TEXT_MODELS;
}

interface Props {
  provider: ProviderSettings;
  onSaved: (updated: ProviderSettings) => void;
}

export default function ProviderForm({ provider, onSaved }: Props) {
  const localProvider = provider.task_type === 'image' ? 'comfyui' : 'ollama';
  const localProviderLabel = provider.task_type === 'image' ? 'ComfyUI (local)' : 'Ollama (local)';
  const [isLocal, setIsLocal] = useState(provider.mode === 'local' || provider.provider === 'ollama');
  const [apiKey, setApiKey] = useState(provider.api_key || '');
  const [model, setModel] = useState(provider.model || '');
  const [baseUrl, setBaseUrl] = useState(provider.base_url || '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const addToast = useToastStore((state) => state.addToast);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    const update: ProviderUpdate = {
      mode: isLocal ? 'local' : 'cloud',
      provider: isLocal ? localProvider : 'openai',
      model: isLocal && provider.task_type === 'image' ? null : model || undefined,
      base_url: isLocal
        ? provider.task_type === 'image'
          ? (baseUrl || 'http://127.0.0.1:8188').replace(/\/+$/, '')
          : `${(baseUrl || 'http://localhost:11434').replace(/\/+$/, '').replace(/\/v1$/, '')}/v1`
        : null,
    };
    if (!isLocal && apiKey && !apiKey.includes('•')) {
      update.api_key = apiKey;
    }
    try {
      const updated = await updateProvider(provider.task_type, update);
      onSaved(updated);
      addToast(`${TASK_LABELS[provider.task_type]} settings saved successfully`, 'success');
    } catch (err) {
      console.error('Save failed:', err);
      addToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const update: ProviderUpdate = {
        mode: isLocal ? 'local' : 'cloud',
        provider: isLocal ? localProvider : 'openai',
        model: isLocal && provider.task_type === 'image' ? null : model || undefined,
        base_url: isLocal
          ? provider.task_type === 'image'
            ? (baseUrl || 'http://127.0.0.1:8188').replace(/\/+$/, '')
            : `${(baseUrl || 'http://localhost:11434').replace(/\/+$/, '').replace(/\/v1$/, '')}/v1`
          : null,
      };
      if (!isLocal && apiKey && !apiKey.includes('•')) update.api_key = apiKey;
      const updated = await updateProvider(provider.task_type, update);
      onSaved(updated);
      const result = await testProvider(provider.task_type);
      setTestResult(result);
      if (result.success) {
        addToast('Connection verified successfully!', 'success');
      } else {
        addToast(result.message, 'error');
      }
    } catch {
      setTestResult({ success: false, message: 'Request failed — check network or server.' });
      addToast('Connection failed: Request error', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Typography variant="h4">{TASK_LABELS[provider.task_type]}</Typography>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel id={`${provider.task_type}-provider-label`} >Provider</InputLabel>
            <Select
              labelId={`${provider.task_type}-provider-label`}
              value={isLocal ? localProvider : 'openai'}
              label="Provider"
              onChange={(e) => {
                const local = e.target.value === localProvider;
                setIsLocal(local);
                setBaseUrl(local ? (baseUrl || (provider.task_type === 'image' ? 'http://127.0.0.1:8188' : 'http://localhost:11434')) : baseUrl);
                setTestResult(null);
              }}
            >
              <MenuItem value="openai">OpenAI (cloud)</MenuItem>
              <MenuItem value={localProvider}>{localProviderLabel}</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {isLocal ? (
            <>
              <TextField
                label={provider.task_type === 'image' ? 'ComfyUI Base URL' : 'Ollama Base URL'}
                value={baseUrl || (provider.task_type === 'image' ? 'http://127.0.0.1:8188' : 'http://localhost:11434')}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={provider.task_type === 'image' ? 'http://127.0.0.1:8188' : 'http://localhost:11434'}
                helperText={provider.task_type === 'image'
                  ? 'ComfyUI server running the saved Z-Image Turbo API workflow.'
                  : 'Use the Ollama server URL. The OpenAI-compatible /v1 path is added automatically.'}
                size="small"
                fullWidth
              />
              {provider.task_type !== 'image' && <TextField
                label="Model Name"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={provider.task_type === 'vision' ? 'qwen3-vl:8b, llama3.2-vision, etc.' : provider.task_type === 'image' ? 'flux, sdxl, etc.' : 'llama3.2, qwen3:8b, etc.'}
                size="small"
                fullWidth
              />}
            </>
          ) : (
            <>
              <TextField
                label="API Key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                size="small"
                fullWidth
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Model</InputLabel>
                <Select
                  value={model}
                  label="Model"
                  onChange={(e) => setModel(e.target.value)}
                >
                  {getModelOptions(provider.task_type).map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 0.5 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              size="small"
              sx={gradientButton}
            >
              {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save'}
            </Button>

            <Button
              variant="outlined"
              onClick={handleTest}
              disabled={testing || saving}
              size="small"
              sx={{
                borderColor: 'rgba(255,255,255,0.15)',
                color: 'text.secondary',
                '&:hover': { borderColor: '#7C3AED', color: '#7C3AED' },
              }}
            >
              {testing ? <CircularProgress size={16} /> : 'Test Connection'}
            </Button>

            {testResult && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {testResult.success ? (
                  <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#10B981' }} />
                ) : (
                  <ErrorOutlineIcon sx={{ fontSize: 18, color: '#EF4444' }} />
                )}
                <Typography
                  variant="caption"
                  sx={{ color: testResult.success ? '#10B981' : '#EF4444' }}
                >
                  {testResult.message}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
