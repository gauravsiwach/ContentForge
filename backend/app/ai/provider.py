"""Provider factory — creates AI clients for OpenAI and Ollama."""

from app.models.settings import ProviderSettings
from app.ai.comfyui_client import test_comfyui_connection

DEFAULT_PROVIDERS = {
    "text": {
        "mode": "cloud",
        "provider": "openai",
        "model": "gpt-4o",
        "base_url": None,
    },
    "image": {
        "mode": "cloud",
        "provider": "openai",
        "model": "dall-e-3",
        "base_url": None,
    },
    "vision": {
        "mode": "cloud",
        "provider": "openai",
        "model": "gpt-4o",
        "base_url": None,
    },
}


def get_openai_client(settings: ProviderSettings):
    """Create an OpenAI-compatible client from provider settings."""
    try:
        from openai import AsyncOpenAI
        base_url = settings.base_url or "https://api.openai.com/v1"
        return AsyncOpenAI(api_key=settings.api_key or "", base_url=base_url)
    except ImportError:
        raise RuntimeError("openai package not installed. Run: pip install openai")


def get_ollama_client(settings: ProviderSettings):
    """Create an Ollama client (OpenAI-compatible API)."""
    try:
        from openai import AsyncOpenAI
        base_url = settings.base_url or "http://localhost:11434/v1"
        return AsyncOpenAI(api_key="ollama", base_url=base_url)
    except ImportError:
        raise RuntimeError("openai package not installed. Run: pip install openai")


def get_client(settings: ProviderSettings):
    """Return the appropriate client based on provider mode and name."""
    if settings.mode == "local" or settings.provider == "ollama":
        return get_ollama_client(settings)
    return get_openai_client(settings)


async def test_connection(settings: ProviderSettings) -> tuple[bool, str]:
    """Test provider connection. Returns (success, message)."""
    try:
        if settings.task_type == "image" and (settings.mode == "local" or settings.provider == "comfyui"):
            return await test_comfyui_connection(settings.base_url)

        client = get_client(settings)
        if settings.mode == "local" or settings.provider == "ollama":
            # For Ollama, just try listing models
            models = await client.models.list()
            model_ids = [m.id for m in models.data]
            return True, f"Connected to Ollama. Available models: {', '.join(model_ids[:5])}"
        else:
            if not settings.api_key:
                return False, "API key is not configured"
            # For OpenAI, try a minimal models list call (no tokens used)
            models = await client.models.list()
            return True, f"Connected to {settings.provider.title()} successfully"
    except Exception as e:
        error = str(e)
        if "Connection refused" in error:
            return False, f"Ollama not reachable at {settings.base_url or 'localhost:11434'}"
        if "401" in error or "Unauthorized" in error or "Invalid API key" in error:
            return False, "Invalid API key"
        if "429" in error:
            return False, "Rate limited — API key is valid but quota exceeded"
        return False, f"Connection failed: {error[:120]}"
